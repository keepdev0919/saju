/**
 * 관리자 API 라우트
 */
import { Router } from 'express';
import { login, getMe, updateMe, logout } from '../controllers/adminController.js';
import { getPayments, getPaymentDetail, refundPayment, getPaymentStats, getDashboardActivity } from '../controllers/adminPaymentController.js';
import { getUsers, getUserDetail } from '../controllers/adminUserController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// 공개 라우트
router.post('/login', login);

// 인증 필요 라우트
router.get('/me', adminAuth, getMe);
router.put('/me', adminAuth, updateMe);
router.post('/logout', adminAuth, logout);

// 결제 관리 라우트 (인증 필요)
router.get('/payments/stats', adminAuth, getPaymentStats);
router.get('/payments', adminAuth, getPayments);
router.get('/dashboard/activity', adminAuth, getDashboardActivity); // [NEW] 대시보드 활동 내역
router.get('/payments/:id', adminAuth, getPaymentDetail);
router.post('/payments/:id/refund', adminAuth, refundPayment);

// 회원 관리 라우트 (인증 필요)
router.get('/users', adminAuth, getUsers);
router.get('/users/:id', adminAuth, getUserDetail);

export default router;
