/**
 * PDF 생성 서비스
 * HTML을 PDF로 변환하는 기능
 * 
 * 주요 최적화:
 * - 브라우저 인스턴스 재사용 (메모리 절약)
 * - 폰트 로딩 대기 (렌더링 품질 향상)
 * - 페이지 브레이크 처리 (PDF 품질 향상)
 * - 동시 요청 제한 (서버 리소스 보호)
 */
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PQueue from 'p-queue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 브라우저 인스턴스 싱글톤 (재사용으로 리소스 절약)
let browserInstance = null;

/**
 * 브라우저 인스턴스 가져오기 (싱글톤 패턴)
 * 브라우저를 재사용하여 메모리와 CPU 리소스를 절약
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // 메모리 사용 최적화 (Docker 환경에서 중요)
        '--disable-gpu', // GPU 비활성화 (서버 환경)
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    });
    
    console.log('✅ 브라우저 인스턴스 생성 완료 (재사용 모드)');
    
    // 프로세스 종료 시 브라우저 정리
    process.on('SIGTERM', async () => {
      if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
      }
    });
  }
  return browserInstance;
}

// PDF 생성 큐 (동시 요청 제한: 최대 3개)
// 서버 리소스를 보호하기 위해 동시에 처리할 PDF 생성 작업 수를 제한
const pdfQueue = new PQueue({ 
  concurrency: 3,
  timeout: 60000 // 60초 타임아웃
});

/**
 * HTML을 PDF로 변환
 * @param {string} htmlContent - HTML 내용
 * @param {Object} options - PDF 옵션
 * @returns {Buffer} PDF 파일 버퍼
 */
export async function generatePDF(htmlContent, options = {}) {
  // 큐를 통해 동시 요청 수 제한
  return pdfQueue.add(async () => {
    let page;
    
    try {
      console.log('🔧 PDF 생성 시작 (큐 대기 완료)');
      
      // 브라우저 인스턴스 가져오기 (재사용)
      const browser = await getBrowser();
      
      // 새 페이지 생성
      page = await browser.newPage();
      console.log('✅ 새 페이지 생성 완료');
      
      // 실패한 네트워크 요청 무시 (404 에러 방지)
      // favicon이나 외부 리소스 요청 실패를 조용히 무시
      page.on('requestfailed', (request) => {
        const url = request.url();
        // favicon, 외부 이미지, 폰트 등의 실패는 무시 (콘솔 에러 방지)
        if (url.includes('favicon') || 
            request.resourceType() === 'image' || 
            request.resourceType() === 'font') {
          return;
        }
      });
      
      // HTML 내용 설정
      console.log('📝 HTML 내용 설정 중... (길이:', htmlContent.length, ')');
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded' // DOM 로드 완료까지 대기
      });
      
      // 폰트 로딩 완료까지 대기 (렌더링 품질 향상)
      // 웹폰트를 사용하는 경우 필수적으로 필요한 단계
      await page.evaluateHandle(() => document.fonts.ready);
      
      // 추가 안정성을 위한 짧은 대기 (렌더링 완료 보장)
      await page.waitForTimeout(300);
      
      console.log('✅ HTML 렌더링 완료 (폰트 로딩 완료)');
      
      // PDF 생성 옵션
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,  // CSS 페이지 크기 우선
        displayHeaderFooter: false,  // 헤더/푸터 비활성화
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        ...options
      };
      
      // PDF 생성
      console.log('🖨️ PDF 생성 중...');
      const pdfData = await page.pdf(pdfOptions);
      console.log('✅ PDF 생성 완료 (크기:', pdfData.length, 'bytes)');
      
      // Uint8Array를 Buffer로 변환 (Node.js Buffer 메서드 사용 가능하도록)
      const pdfBuffer = Buffer.from(pdfData);
      console.log('✅ Buffer 변환 완료 (isBuffer:', Buffer.isBuffer(pdfBuffer), ')');
      
      return pdfBuffer;
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      throw new Error('PDF 생성에 실패했습니다: ' + error.message);
    } finally {
      // 페이지는 닫지만 브라우저는 유지 (재사용)
      if (page) {
        await page.close();
        console.log('✅ 페이지 정리 완료');
      }
    }
  });
}

/**
 * 사주 결과 HTML 템플릿 생성
 * PDF 인쇄 최적화 스타일 포함 (페이지 브레이크 처리)
 * @param {Object} resultData - 사주 결과 데이터
 * @param {boolean} withWatermark - 워터마크 포함 여부 (미리보기용)
 * @returns {string} HTML 문자열
 */
export function generateSajuHTML(resultData, withWatermark = false) {
  const { user, result } = resultData;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${user.name}님의 사주 결과</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
      padding: 40px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e74c3c;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #e74c3c;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .user-info {
      text-align: center;
      margin-bottom: 30px;
      color: #666;
    }
    .score-section {
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .score-section .score {
      font-size: 72px;
      font-weight: bold;
      margin: 10px 0;
    }
    .fortune-card {
      background: #f8f9fa;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      border-left: 4px solid #e74c3c;
    }
    .fortune-card h3 {
      color: #e74c3c;
      margin-bottom: 10px;
      font-size: 20px;
    }
    .fortune-card .score {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .fortune-card p {
      line-height: 1.8;
      color: #555;
    }
    .oheng-section {
      margin-top: 30px;
      padding: 20px;
      background: #fff9e6;
      border-radius: 8px;
    }
    .oheng-section h3 {
      margin-bottom: 15px;
      color: #d4a017;
    }
    .oheng-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .oheng-bar {
      height: 20px;
      background: #d4a017;
      border-radius: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #999;
      font-size: 12px;
    }
    
    /* PDF 인쇄 최적화 스타일 */
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .container {
        box-shadow: none;
        padding: 0;
      }
      
      /* 페이지 브레이크 방지: 중요한 요소가 페이지 경계에서 잘리지 않도록 */
      .header {
        page-break-after: avoid;
        break-after: avoid; /* 최신 표준 */
      }
      
      .score-section,
      .fortune-card,
      .oheng-section {
        page-break-inside: avoid;
        break-inside: avoid; /* 최신 표준 */
      }
      
      .fortune-card {
        margin-bottom: 15px;
      }
    }
    
    ${withWatermark ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      color: rgba(0, 0, 0, 0.1);
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
      white-space: nowrap;
    }
    .watermark-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      padding: 40px;
      text-align: center;
      z-index: 1001;
      color: white;
    }
    .watermark-overlay h2 {
      margin-bottom: 20px;
      font-size: 24px;
    }
    .watermark-overlay p {
      margin-bottom: 20px;
      opacity: 0.9;
    }
    ` : ''}
  </style>
</head>
<body>
  ${withWatermark ? '<div class="watermark">미리보기</div>' : ''}
  <div class="container">
    <div class="header">
      <h1>${user.name}님의 운명</h1>
      <div class="user-info">
        ${user.birthDate}생 · ${user.gender === 'male' ? '남성' : '여성'}
      </div>
    </div>

    <div class="score-section">
      <div>2026년 종합운세</div>
      <div class="score">${result.scores.overall}</div>
      <div>/ 100</div>
    </div>

    <div class="fortune-card">
      <h3>💰 재물운</h3>
      <div class="score">${result.scores.wealth}점</div>
      <p>${result.wealthFortune}</p>
    </div>

    <div class="fortune-card">
      <h3>❤️ 애정운</h3>
      <div class="score">${result.scores.love}점</div>
      <p>${result.loveFortune}</p>
    </div>

    <div class="fortune-card">
      <h3>💼 직장운</h3>
      <div class="score">${result.scores.career}점</div>
      <p>${result.careerFortune}</p>
    </div>

    <div class="fortune-card">
      <h3>🏥 건강운</h3>
      <div class="score">${result.scores.health}점</div>
      <p>${result.healthFortune}</p>
    </div>

    <div class="oheng-section">
      <h3>오행 분석</h3>
      ${Object.entries(result.oheng).map(([key, value]) => `
        <div class="oheng-item">
          <span>${key}</span>
          <div style="flex: 1; margin: 0 10px;">
            <div class="oheng-bar" style="width: ${value}%"></div>
          </div>
          <span>${value}%</span>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      <p>본 결과는 참고용이며, 실제 운명은 개인의 노력에 따라 달라질 수 있습니다.</p>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>
  ${withWatermark ? `
  <div class="watermark-overlay">
    <h2>전체 PDF를 다운로드하시겠어요?</h2>
    <p>결제 후 워터마크 없는 전체 PDF를 다운로드할 수 있습니다.</p>
  </div>
  ` : ''}
</body>
</html>
  `.trim();
}

/**
 * PDF 파일 저장
 * @param {Buffer} pdfBuffer - PDF 버퍼
 * @param {string} filename - 파일명
 * @returns {string} 저장된 파일 경로
 */
export async function savePDF(pdfBuffer, filename) {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/pdf');
    
    // 업로드 디렉토리가 없으면 생성
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, pdfBuffer);

    return filePath;
  } catch (error) {
    console.error('PDF 저장 실패:', error);
    throw new Error('PDF 저장에 실패했습니다.');
  }
}

