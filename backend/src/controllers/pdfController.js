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
    const { userId, resultId } = req.body;

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
      oheng: JSON.parse(result.oheng_data)
    };

    // HTML 생성
    const htmlContent = generateSajuHTML({
      user: {
        name: user.name,
        birthDate: user.birth_date,
        gender: user.gender
      },
      result: resultData
    });

    // PDF 생성
    const pdfBuffer = await generatePDF(htmlContent);

    // 파일 저장
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

