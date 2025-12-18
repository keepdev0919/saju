# 백엔드 설정 가이드

## 📋 완성된 기능

### ✅ Phase 2: 백엔드 연동
- [x] Express 서버 구축
- [x] MySQL DB 설계 및 연결 설정
- [x] 사주 API 연동 (더미 데이터 포함)
- [x] 포트원 결제 연동 구조

### ✅ Phase 3: 알림 및 PDF
- [x] 카카오 알림톡 API 연동 구조
- [x] PDF 생성 기능 (Puppeteer 사용)

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
cd backend
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

```bash
cp .env.example .env
```

필수 설정:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL 데이터베이스 정보
- `PORTONE_IMP_KEY`, `PORTONE_IMP_SECRET`: 포트원 결제 API 키 (테스트 모드 가능)
- `KAKAO_ALIMTALK_API_KEY`, `KAKAO_ALIMTALK_SENDER_KEY`: 카카오 알림톡 API 키
- `SAJU_API_KEY`, `SAJU_API_URL`: 사주 API 정보 (선택사항, 없으면 더미 데이터 사용)

### 3. 데이터베이스 설정

MySQL에 데이터베이스를 생성하고 스키마를 실행하세요.

```bash
mysql -u root -p < backend/database/schema.sql
```

또는 MySQL 클라이언트에서:

```sql
source backend/database/schema.sql
```

### 4. 서버 실행

개발 모드 (nodemon 사용):
```bash
cd backend
npm run dev
```

프로덕션 모드:
```bash
cd backend
npm start
```

서버는 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

### 사용자 API
- `POST /api/user/create` - 사용자 생성
- `POST /api/user/verify` - 사용자 인증 (생년월일 + 휴대폰)
- `GET /api/user/:token` - 토큰으로 사용자 조회

### 결제 API
- `POST /api/payment/create` - 결제 요청 생성
- `POST /api/payment/verify` - 결제 검증 (결제 완료 후 호출)
- `POST /api/payment/cancel` - 결제 취소/환불

### 사주 API
- `POST /api/saju/calculate` - 사주 계산
- `GET /api/saju/result/:token` - 사주 결과 조회

### PDF API
- `POST /api/pdf/generate` - PDF 생성
- `GET /api/pdf/download/:token` - PDF 다운로드

## 🔧 다음 단계

### 1. 프론트엔드 연동
프론트엔드에서 백엔드 API를 호출하도록 수정 필요

### 2. 실제 API 키 설정
- 포트원 테스트 모드 설정
- 카카오 알림톡 템플릿 등록
- 사주 API 연동 (선택사항)

### 3. 추가 기능
- PDF 추가 결제 프로세스
- 관리자 페이지

## 📝 참고사항

- 개발 모드에서는 API 키가 없어도 더미 데이터로 동작합니다
- 실제 배포 시에는 모든 API 키를 설정해야 합니다
- 데이터베이스 연결이 실패하면 서버가 시작되지 않습니다

