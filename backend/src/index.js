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

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

