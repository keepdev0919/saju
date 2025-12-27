/**
 * 결제 관련 API 라우트
 * 포트원 결제 연동 및 결제 처리
 */
import express from 'express';
import { createPayment, verifyPayment, cancelPayment, createPremiumPayment } from '../controllers/paymentController.js';
import { handlePortoneWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// 결제 요청 생성 (1차 - 기본 결제)
router.post('/create', createPayment);

// 프리미엄 결제 요청 생성 (2차 - 프리미엄 업그레이드)
router.post('/premium', createPremiumPayment);

// 결제 검증 (기본 + 프리미엄 공통)
router.post('/verify', verifyPayment);

// 결제 취소/환불
router.post('/cancel', cancelPayment);

// 포트원 Webhook (결제 상태 변경 알림)
router.post('/webhook', handlePortoneWebhook);

export default router;

