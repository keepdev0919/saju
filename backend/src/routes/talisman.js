/**
 * 수호신 카드 관련 API 라우트
 * 고화질 이미지 다운로드
 */
import express from 'express';
import { downloadTalismanImage } from '../controllers/talismanController.js';

const router = express.Router();

// 수호신 카드 이미지 다운로드
router.get('/download/:token', downloadTalismanImage);

export default router;
