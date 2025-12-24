/**
 * 사주 관련 API 라우트
 * 사주 계산 및 결과 조회
 */
import express from 'express';
import { calculateSaju, calculateFreeResult, getSajuResult, checkAiStatus } from '../controllers/sajuController.js';

const router = express.Router();

// 사주 계산 (상세 - AI 포함)
router.post('/calculate', calculateSaju);

// 무료 사용자 사주 결과 계산 (AI 제외 - 선노출용)
router.post('/result-freeuser', calculateFreeResult);

// 사주 결과 조회
router.get('/result/:token', getSajuResult);

// AI 상태 확인 (경량)
router.get('/status/:token', checkAiStatus);

export default router;

