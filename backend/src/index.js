/**
 * Express 서버 진입점
 * 사주풀이 플랫폼의 백엔드 API 서버
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.js';
import sajuRoutes from './routes/saju.js';
import userRoutes from './routes/user.js';
import pdfRoutes from './routes/pdf.js';
import adminRoutes from './routes/admin.js';
import talismanRoutes from './routes/talisman.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
// 프런트 접속 IP가 자주 바뀌어도 동작하도록 CORS를 유연하게 허용
const staticOrigins = [
  'http://localhost:5173',
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const localNetworkPattern = /^http:\/\/\d+\.\d+\.\d+\.\d+:5173$/; // 같은 네트워크 대역 IP 허용

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // 모바일 앱/테스트 등 Origin 없는 경우 허용
    if (staticOrigins.includes(origin) || envOrigins.includes(origin) || localNetworkPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS 차단: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 미들웨어 (디버깅용)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body ? Object.keys(req.body) : null
  });
  next();
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '서버가 정상적으로 실행 중입니다.' });
});

// API 라우트 연결
app.use('/api/payment', paymentRoutes);
app.use('/api/saju', sajuRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/talisman', talismanRoutes);

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: '요청한 경로를 찾을 수 없습니다.' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('에러 발생:', err);
  res.status(500).json({
    error: '서버 내부 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 API 엔드포인트: http://localhost:${PORT}/api`);
});

