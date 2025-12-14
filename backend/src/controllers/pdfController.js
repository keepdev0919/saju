/**
 * PDF 컨트롤러
 * PDF 생성 및 다운로드 기능
 */
import db from '../config/database.js';
import { generatePDF, generateSajuHTML, savePDF } from '../services/pdfService.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * PDF 생성
 * 사주 결과를 PDF로 변환
 */
export async function generatePdf(req, res) {
  try {
    const { userId, resultId, preview = false } = req.body;

    if (!userId || !resultId) {
      return res.status(400).json({ 
        error: '사용자 ID와 결과 ID가 필요합니다.' 
      });
    }

    // 사용자 정보 조회
    const [users] = await db.execute(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 사주 결과 조회
    const [results] = await db.execute(
      `SELECT * FROM saju_results WHERE id = ? AND user_id = ?`,
      [resultId, userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: '사주 결과를 찾을 수 없습니다.' });
    }

    const result = results[0];

    /**
     * JSON 데이터 파싱 헬퍼 함수
     * 문자열이면 파싱하고, 객체면 그대로 반환, null이면 기본값 반환
     */
    const parseJsonData = (data, defaultValue = {}) => {
      if (!data) return defaultValue;
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.warn('JSON 파싱 실패:', e.message);
          return defaultValue;
        }
      }
      // 이미 객체인 경우 그대로 반환
      return data;
    };

    // 결과 데이터 파싱
    const resultData = {
      overallFortune: result.overall_fortune,
      wealthFortune: result.wealth_fortune,
      loveFortune: result.love_fortune,
      careerFortune: result.career_fortune,
      healthFortune: result.health_fortune,
      scores: {
        overall: result.overall_score,
        wealth: result.wealth_score,
        love: result.love_score,
        career: result.career_score,
        health: result.health_score
      },
      oheng: parseJsonData(result.oheng_data, {})
    };

    // HTML 생성 (미리보기인 경우 워터마크 포함)
    const htmlContent = generateSajuHTML({
      user: {
        name: user.name,
        birthDate: user.birth_date,
        gender: user.gender
      },
      result: resultData
    }, preview);

    // PDF 생성
    const pdfBuffer = await generatePDF(htmlContent);

    // PDF 유효성 확인 - 더 자세한 로그 추가
    console.log('📄 PDF 버퍼 정보:', {
      bufferLength: pdfBuffer.length,
      bufferType: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer),
      first20Bytes: pdfBuffer.slice(0, 20).toString('utf-8'),
      first20Hex: pdfBuffer.slice(0, 20).toString('hex')
    });

    const pdfHeader = pdfBuffer.slice(0, 5).toString('utf-8');
    if (!pdfHeader.startsWith('%PDF-')) {
      console.error('❌ PDF 헤더 검증 실패:', {
        expected: '%PDF-',
        actual: pdfHeader,
        actualHex: pdfBuffer.slice(0, 5).toString('hex')
      });
      throw new Error('생성된 PDF가 유효하지 않습니다.');
    }
    console.log('✅ PDF 생성 성공:', {
      size: pdfBuffer.length,
      header: pdfHeader,
      preview: preview
    });

    // 미리보기인 경우 파일 저장하지 않고 바로 반환
    if (preview) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer, 'binary');
    }

    // 파일 저장 (결제 완료 후 다운로드용)
    const filename = `saju_${userId}_${resultId}_${Date.now()}.pdf`;
    const filePath = await savePDF(pdfBuffer, filename);

    res.json({
      success: true,
      pdfUrl: `/api/pdf/download/${user.access_token}`,
      filename,
      message: 'PDF가 생성되었습니다.'
    });
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({ 
      error: 'PDF 생성에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * PDF 다운로드
 * 토큰으로 PDF 파일 다운로드
 */
export async function downloadPdf(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 사용자 조회
    const [users] = await db.execute(
      `SELECT id FROM users WHERE access_token = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const userId = users[0].id;

    // 가장 최근 PDF 파일 찾기 (실제로는 DB에 PDF 정보를 저장하는 것이 좋음)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdf');
    const files = await fs.readdir(uploadsDir);
    const userPdfFiles = files.filter(file => file.startsWith(`saju_${userId}_`));

    if (userPdfFiles.length === 0) {
      return res.status(404).json({ error: 'PDF 파일을 찾을 수 없습니다.' });
    }

    // 가장 최근 파일
    const latestFile = userPdfFiles.sort().reverse()[0];
    const filePath = path.join(uploadsDir, latestFile);

    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'PDF 파일을 찾을 수 없습니다.' });
    }

    // PDF 파일 전송
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${latestFile}"`);
    
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (error) {
    console.error('PDF 다운로드 오류:', error);
    res.status(500).json({ 
      error: 'PDF 다운로드에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * PDF 결제 여부 확인
 * 사용자가 PDF를 이미 결제했는지 확인
 */
export async function checkPdfPayment(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 사용자 조회
    const [users] = await db.execute(
      `SELECT id FROM users WHERE access_token = ?`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const userId = users[0].id;

    // PDF 결제 여부 확인
    const [payments] = await db.execute(
      `SELECT id, status, paid_at FROM payments 
       WHERE user_id = ? AND product_type = 'pdf' AND status = 'paid'
       ORDER BY paid_at DESC LIMIT 1`,
      [userId]
    );

    res.json({
      success: true,
      hasPaid: payments.length > 0,
      payment: payments.length > 0 ? {
        id: payments[0].id,
        paidAt: payments[0].paid_at
      } : null
    });
  } catch (error) {
    console.error('PDF 결제 확인 오류:', error);
    res.status(500).json({ 
      error: 'PDF 결제 확인에 실패했습니다.',
      message: error.message 
    });
  }
}

