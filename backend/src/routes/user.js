/**
 * 사용자 관련 API 라우트
 * 사용자 정보 저장 및 인증
 */
import express from 'express';
import { createUser, verifyUser, getUserByToken } from '../controllers/userController.js';

const router = express.Router();

// 사용자 생성 (결제 전 정보 저장)
router.post('/create', createUser);

// 사용자 인증 (생년월일 + 휴대폰 번호로 확인)
router.post('/verify', verifyUser);

// 토큰으로 사용자 정보 조회
router.get('/:token', getUserByToken);

export default router;

