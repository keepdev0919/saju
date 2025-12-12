/**
 * 사주 관련 API 라우트
 * 사주 계산 및 결과 조회
 */
import express from 'express';
import { calculateSaju, getSajuResult } from '../controllers/sajuController.js';

const router = express.Router();

// 사주 계산
router.post('/calculate', calculateSaju);

// 사주 결과 조회
router.get('/result/:token', getSajuResult);

export default router;

