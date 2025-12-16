# PDF 미리보기 기능 구현 가이드

> 초보 개발자를 위한 PDF 미리보기 전체 과정 설명

## 📋 목차

1. [전체 흐름 개요](#전체-흐름-개요)
2. [프론트엔드 구현](#프론트엔드-구현)
3. [백엔드 구현](#백엔드-구현)
4. [주요 개념 설명](#주요-개념-설명)
5. [트러블슈팅](#트러블슈팅)

---

## 전체 흐름 개요

```
사용자 클릭
    ↓
프론트엔드: PDF 미리보기 버튼 클릭
    ↓
프론트엔드: API 호출 (userId, resultId, preview: true)
    ↓
백엔드: DB에서 사주 결과 조회
    ↓
백엔드: HTML 템플릿 생성 (워터마크 포함)
    ↓
백엔드: Puppeteer로 HTML → PDF 변환
    ↓
백엔드: PDF Buffer를 바이너리로 전송
    ↓
프론트엔드: ArrayBuffer → Blob 변환
    ↓
프론트엔드: Blob URL 생성
    ↓
프론트엔드: react-pdf로 모달에 표시
    ↓
사용자: PDF 미리보기 확인 (워터마크 포함)
```

---

## 프론트엔드 구현

### 1. 필요한 라이브러리 설치

```bash
npm install react-pdf pdfjs-dist
```

**왜 두 개가 필요한가?**
- `react-pdf`: React에서 PDF를 쉽게 표시할 수 있는 컴포넌트 제공
- `pdfjs-dist`: PDF 파싱 엔진 (Mozilla에서 만든 PDF.js)

---

### 2. PDF.js Worker 설정

**파일**: `src/pages/ResultPage.jsx`

```javascript
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정 - CDN 사용
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// PDF.js 옵션 설정
const pdfjsOptions = {
  cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};
```

**설명**:
- **Worker**: PDF 파싱을 별도 스레드에서 실행 (메인 스레드 블로킹 방지)
- **cMap**: 한글 등 다양한 문자 인코딩 지원
- **standardFont**: 기본 폰트 데이터

---

### 3. API 호출 함수 (ArrayBuffer 방식)

**파일**: `src/utils/api.js`

```javascript
export const generatePDF = async (pdfData) => {
  // 1. API 호출 - responseType을 arraybuffer로 설정
  const response = await apiClient.post('/pdf/generate', pdfData, {
    responseType: pdfData.preview ? 'arraybuffer' : 'json'
  });

  if (pdfData.preview) {
    // 2. ArrayBuffer → Blob 변환
    const blob = new Blob([response.data], { type: 'application/pdf' });

    // 3. PDF 헤더 검증 (선택사항)
    const headerBytes = new Uint8Array(response.data.slice(0, 5));
    const header = String.fromCharCode(...headerBytes);
    if (!header.startsWith('%PDF-')) {
      throw new Error('유효하지 않은 PDF 데이터입니다.');
    }

    console.log('✅ PDF Blob 생성:', {
      size: blob.size,
      type: blob.type,
      header: header
    });

    return blob;
  }
  return response.data;
};
```

**용어 설명**:
- **ArrayBuffer**: 원시 바이너리 데이터 (byte 배열)
- **Blob**: Binary Large Object, 파일 같은 불변 데이터
- **Uint8Array**: ArrayBuffer를 8비트 부호 없는 정수 배열로 해석

**왜 ArrayBuffer → Blob 변환?**
- axios는 바이너리를 ArrayBuffer로 받음
- react-pdf와 브라우저는 Blob URL을 사용
- Blob은 파일처럼 다룰 수 있어 더 편리함

---

### 4. PDF 미리보기 핸들러

**파일**: `src/pages/ResultPage.jsx`

```javascript
const handlePdfPreview = async () => {
  // 1. 필수 데이터 확인
  if (!userInfo || !userInfo.id || !sajuResult || !sajuResult.id) {
    setPdfError('필수 정보가 없습니다.');
    return;
  }

  setPdfLoading(true);
  setPdfError(null);

  try {
    // 2. API 호출 (preview: true = 워터마크 포함)
    const pdfBlob = await generatePDF({
      userId: userInfo.id,
      resultId: sajuResult.id,
      preview: true
    });

    // 3. Blob이 제대로 받아졌는지 확인
    if (!pdfBlob || !(pdfBlob instanceof Blob)) {
      throw new Error('PDF 데이터를 받을 수 없습니다.');
    }

    // 4. Blob URL 생성 (메모리에 임시 URL 생성)
    const url = URL.createObjectURL(pdfBlob);
    console.log('📄 Blob URL 생성:', url);

    // 5. 상태 업데이트
    setPdfPreviewUrl(url);
    setPageNumber(1);
    setScale(1.0);
    setShowPdfPreview(true);
    setPdfLoading(false);

  } catch (err) {
    console.error('❌ PDF 미리보기 오류:', err);
    setPdfError(err.message || 'PDF 미리보기를 불러올 수 없습니다.');
    setPdfLoading(false);
  }
};
```

**Blob URL이란?**
- `blob:http://localhost:5173/e6e25564-fa6f-49f4-...` 형태
- 메모리에 있는 Blob을 브라우저가 접근할 수 있는 URL로 만듦
- 새로고침하면 사라짐 (임시 URL)

---

### 5. PDF 뷰어 UI (react-pdf)

```javascript
<Document
  file={pdfPreviewUrl}
  options={pdfjsOptions}
  onLoadSuccess={({ numPages }) => {
    console.log('✅ PDF 로드 성공:', numPages, '페이지');
    setNumPages(numPages);
  }}
  onLoadError={(error) => {
    console.error('❌ PDF 로드 실패:', error);
    setPdfError(`PDF를 불러올 수 없습니다: ${error.message}`);
  }}
  loading={<div>PDF 로딩 중...</div>}
  className="flex justify-center"
>
  <Page
    pageNumber={pageNumber}
    scale={scale}
    renderTextLayer={true}
    renderAnnotationLayer={true}
    className="shadow-lg"
  />
</Document>
```

**주요 props**:
- `file`: PDF URL 또는 Blob
- `options`: PDF.js 옵션
- `onLoadSuccess`: PDF 로드 완료 시 호출
- `onLoadError`: 로드 실패 시 호출
- `Page`: 실제 PDF 페이지 렌더링

---

### 6. 메모리 정리 (중요!)

```javascript
const handleClosePdfPreview = () => {
  // Blob URL 메모리 해제 (필수!)
  if (pdfPreviewUrl) {
    URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
  }
  setShowPdfPreview(false);
  setPageNumber(1);
  setScale(1.0);
  setNumPages(null);
};
```

**왜 메모리 해제가 필요한가?**
- `createObjectURL`로 생성한 URL은 메모리를 차지함
- `revokeObjectURL`로 명시적으로 해제하지 않으면 메모리 누수 발생
- 모달을 닫을 때 반드시 호출해야 함

---

## 백엔드 구현

### 1. Puppeteer 설치

```bash
cd backend
npm install puppeteer
```

**Puppeteer란?**
- Google Chrome을 Node.js에서 제어할 수 있는 라이브러리
- Headless 브라우저 (화면 없이 백그라운드 실행)
- HTML을 PDF로 변환, 스크린샷, 웹 스크래핑 등에 사용

---

### 2. PDF 생성 서비스

**파일**: `backend/src/services/pdfService.js`

```javascript
import puppeteer from 'puppeteer';

export async function generatePDF(htmlContent, options = {}) {
  let browser;

  try {
    // 1. Puppeteer 브라우저 실행
    browser = await puppeteer.launch({
      headless: true,  // 화면 없이 실행
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // 보안 설정
    });

    // 2. 새 페이지 생성
    const page = await browser.newPage();

    // 3. HTML 내용 설정
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded'  // DOM 로드 완료까지 대기
    });

    // 4. PDF 생성 옵션
    const pdfOptions = {
      format: 'A4',  // 용지 크기
      printBackground: true,  // 배경색 인쇄
      preferCSSPageSize: true,  // CSS 페이지 크기 우선
      displayHeaderFooter: false,  // 헤더/푸터 비활성화
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    };

    // 5. PDF 생성 (Uint8Array 반환)
    const pdfData = await page.pdf(pdfOptions);

    // 6. Uint8Array → Buffer 변환 (중요!)
    const pdfBuffer = Buffer.from(pdfData);

    return pdfBuffer;
  } catch (error) {
    console.error('PDF 생성 실패:', error);
    throw new Error('PDF 생성에 실패했습니다.');
  } finally {
    // 7. 브라우저 닫기 (메모리 해제)
    if (browser) {
      await browser.close();
    }
  }
}
```

**Buffer.from(pdfData)가 필요한 이유**:
- Puppeteer는 `Uint8Array` 반환
- Node.js의 `Buffer`는 추가 메서드 제공 (toString, slice 등)
- Buffer로 변환해야 HTTP 응답, 파일 저장 등이 편리함

---

### 3. HTML 템플릿 생성 (워터마크 포함)

```javascript
export function generateSajuHTML(resultData, withWatermark = false) {
  const { user, result } = resultData;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${user.name}님의 사주 결과</title>
  <style>
    body { font-family: 'Malgun Gothic', sans-serif; }

    /* 워터마크 스타일 (조건부) */
    ${withWatermark ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      color: rgba(0, 0, 0, 0.1);
      font-weight: bold;
      pointer-events: none;
    }
    .watermark-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      padding: 40px;
      text-align: center;
      color: white;
    }
    ` : ''}
  </style>
</head>
<body>
  ${withWatermark ? '<div class="watermark">미리보기</div>' : ''}

  <div class="container">
    <h1>${user.name}님의 운명</h1>
    <div class="score-section">
      <div>2026년 종합운세</div>
      <div class="score">${result.scores.overall}</div>
    </div>
    <!-- 나머지 내용 -->
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
```

**조건부 렌더링**:
- `withWatermark = true`: 미리보기용 (워터마크 포함)
- `withWatermark = false`: 결제 후 다운로드용 (워터마크 없음)

---

### 4. PDF 생성 API 컨트롤러

**파일**: `backend/src/controllers/pdfController.js`

```javascript
export async function generatePdf(req, res) {
  try {
    const { userId, resultId, preview = false } = req.body;

    // 1. DB에서 사용자 정보 조회
    const [users] = await db.execute(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );
    const user = users[0];

    // 2. DB에서 사주 결과 조회
    const [results] = await db.execute(
      `SELECT * FROM saju_results WHERE id = ? AND user_id = ?`,
      [resultId, userId]
    );
    const result = results[0];

    // 3. 결과 데이터 파싱
    const resultData = {
      overallFortune: result.overall_fortune,
      wealthFortune: result.wealth_fortune,
      // ... 기타 데이터
      scores: {
        overall: result.overall_score,
        wealth: result.wealth_score,
        // ...
      },
      oheng: JSON.parse(result.oheng_data)
    };

    // 4. HTML 생성 (preview에 따라 워터마크 포함 여부 결정)
    const htmlContent = generateSajuHTML({
      user: {
        name: user.name,
        birthDate: user.birth_date,
        gender: user.gender
      },
      result: resultData
    }, preview);

    // 5. PDF 생성
    const pdfBuffer = await generatePDF(htmlContent);

    // 6. PDF 유효성 확인
    const pdfHeader = pdfBuffer.slice(0, 5).toString('utf-8');
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('생성된 PDF가 유효하지 않습니다.');
    }

    // 7. 미리보기인 경우 바로 반환
    if (preview) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer, 'binary');
    }

    // 8. 결제 후 다운로드인 경우 파일 저장
    const filename = `saju_${userId}_${resultId}_${Date.now()}.pdf`;
    const filePath = await savePDF(pdfBuffer, filename);

    res.json({
      success: true,
      pdfUrl: `/api/pdf/download/${user.access_token}`,
      filename
    });
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    res.status(500).json({
      error: 'PDF 생성에 실패했습니다.',
      message: error.message
    });
  }
}
```

**res.end(pdfBuffer, 'binary') 설명**:
- `res.send()`: Buffer를 UTF-8로 인코딩 시도 → PDF 손상
- `res.end(buffer, 'binary')`: Buffer를 바이너리로 그대로 전송 → 정상
- **중요**: PDF 같은 바이너리 데이터는 반드시 `res.end()` 사용!

---

## 주요 개념 설명

### 1. 바이너리 데이터 흐름

```
Puppeteer → Uint8Array (PDF 원본)
     ↓
Buffer.from() → Node.js Buffer
     ↓
res.end(buffer, 'binary') → HTTP 응답
     ↓
axios (responseType: 'arraybuffer') → ArrayBuffer
     ↓
new Blob([arraybuffer]) → Blob
     ↓
URL.createObjectURL(blob) → Blob URL
     ↓
react-pdf (file prop) → PDF 렌더링
```

### 2. 데이터 타입 비교

| 타입 | 설명 | 용도 | 변환 가능 |
|------|------|------|----------|
| **Uint8Array** | 타입 배열 (8비트 정수) | 원시 바이너리 데이터 | → Buffer |
| **Buffer** | Node.js의 바이너리 버퍼 | 파일, 네트워크 I/O | → Uint8Array |
| **ArrayBuffer** | 고정 길이 바이너리 버퍼 | 브라우저 바이너리 | → Blob |
| **Blob** | 불변 바이너리 데이터 | 파일 다운로드, 업로드 | → File, URL |

### 3. Content-Type 헤더의 중요성

```javascript
// 올바른 방법
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
res.end(pdfBuffer, 'binary');
```

- `Content-Type: application/pdf`: 브라우저에게 PDF 파일임을 알림
- `Content-Disposition: inline`: 브라우저에서 바로 열기 (vs. `attachment`: 다운로드)
- `res.end(buffer, 'binary')`: 바이너리 그대로 전송

---

## 트러블슈팅

### 문제 1: "Invalid PDF structure" 에러

**증상**: react-pdf에서 PDF 파싱 실패

**원인**:
- Puppeteer가 Uint8Array 반환하는데 Buffer로 변환하지 않음
- `res.send()` 사용해서 PDF가 손상됨

**해결**:
```javascript
// ❌ 잘못된 코드
const pdfBuffer = await page.pdf(pdfOptions);
return pdfBuffer;  // Uint8Array 그대로 반환

// ✅ 올바른 코드
const pdfData = await page.pdf(pdfOptions);
const pdfBuffer = Buffer.from(pdfData);  // Buffer로 변환
return pdfBuffer;
```

---

### 문제 2: PDF가 다운로드는 되는데 열리지 않음

**증상**: PDF 파일이 0KB이거나 손상됨

**원인**: `res.send()` 사용

**해결**:
```javascript
// ❌ 잘못된 코드
res.send(pdfBuffer);

// ✅ 올바른 코드
res.end(pdfBuffer, 'binary');
```

---

### 문제 3: Puppeteer 실행 에러 (Linux)

**증상**: `Failed to launch the browser process!`

**원인**: Chrome 의존성 없음

**해결**:
```bash
# Ubuntu/Debian
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

---

### 문제 4: 메모리 누수

**증상**: 브라우저가 점점 느려짐

**원인**: Blob URL 해제 안 함

**해결**:
```javascript
// 모달 닫을 때 반드시 호출
URL.revokeObjectURL(pdfPreviewUrl);
```

---

## 참고 자료

- [PDF.js 공식 문서](https://mozilla.github.io/pdf.js/)
- [react-pdf GitHub](https://github.com/wojtekmaj/react-pdf)
- [Puppeteer 공식 문서](https://pptr.dev/)
- [MDN: Blob](https://developer.mozilla.org/ko/docs/Web/API/Blob)
- [MDN: ArrayBuffer](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

---

## 체크리스트

### 프론트엔드
- [ ] react-pdf, pdfjs-dist 설치
- [ ] PDF.js Worker 설정
- [ ] API 호출 시 responseType: 'arraybuffer'
- [ ] ArrayBuffer → Blob 변환
- [ ] Blob URL 생성
- [ ] 모달 닫을 때 URL.revokeObjectURL() 호출

### 백엔드
- [ ] Puppeteer 설치
- [ ] HTML 템플릿 생성 (워터마크 조건부)
- [ ] Puppeteer로 PDF 생성
- [ ] Uint8Array → Buffer 변환
- [ ] res.end(buffer, 'binary') 사용
- [ ] Content-Type 헤더 설정
- [ ] finally 블록에서 browser.close()

---

**작성일**: 2025-12-14
**작성자**: Claude Sonnet 4.5
**프로젝트**: 사주풀이 플랫폼
