# 사주풀이 플랫폼 백엔드

Express 기반 Node.js 백엔드 서버

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 환경 변수 설정

`backend/.env.example` 파일을 복사하여 `backend/.env` 파일을 생성하고 필요한 값들을 입력하세요.

```bash
cd backend
cp .env.example .env
```

### 3. 데이터베이스 설정

MySQL 데이터베이스를 생성하고 스키마를 실행하세요.

```bash
mysql -u root -p < backend/database/schema.sql
```

또는 MySQL 클라이언트에서 직접 실행:

```sql
source backend/database/schema.sql
```

### 4. 서버 실행

개발 모드:
```bash
cd backend
npm run dev
```

프로덕션 모드:
```bash
cd backend
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 📁 프로젝트 구조

```
backend/
├── src/
│   ├── index.js              # 서버 진입점
│   ├── config/
│   │   └── database.js       # DB 연결 설정
│   ├── routes/               # API 라우트
│   │   ├── payment.js
│   │   ├── saju.js
│   │   ├── user.js
│   │   └── pdf.js
│   ├── controllers/          # 컨트롤러
│   │   ├── paymentController.js
│   │   ├── sajuController.js
│   │   ├── userController.js
│   │   └── pdfController.js
│   └── services/              # 외부 서비스 연동
│       ├── portoneService.js
│       ├── kakaoService.js
│       ├── sajuService.js
│       └── pdfService.js
├── database/
│   └── schema.sql            # DB 스키마
├── package.json
└── README.md
```

## 🔌 API 엔드포인트

### 사용자 API
- `POST /api/user/create` - 사용자 생성
- `POST /api/user/verify` - 사용자 인증
- `GET /api/user/:token` - 토큰으로 사용자 조회

### 결제 API
- `POST /api/payment/create` - 결제 요청 생성
- `POST /api/payment/verify` - 결제 검증
- `POST /api/payment/cancel` - 결제 취소/환불

### 사주 API
- `POST /api/saju/calculate` - 사주 계산
- `GET /api/saju/result/:token` - 사주 결과 조회

### PDF API
- `POST /api/pdf/generate` - PDF 생성
- `GET /api/pdf/download/:token` - PDF 다운로드

## 📝 환경 변수

필요한 환경 변수는 `backend/.env.example` 파일을 참고하세요.

## 🛠️ 개발 가이드

자세한 개발 가이드는 `docs/개발가이드.md`를 참고하세요.
상세한 설정 가이드는 `docs/백엔드-SETUP.md`를 참고하세요.

