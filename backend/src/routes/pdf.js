/**
 * PDF 관련 API 라우트
 * PDF 생성 및 다운로드
 */
import express from 'express';
import { generatePdf, downloadPdf, checkPdfPayment } from '../controllers/pdfController.js';

const router = express.Router();

// PDF 생성
router.post('/generate', generatePdf);

// PDF 다운로드
router.get('/download/:token', downloadPdf);

// PDF 결제 여부 확인
router.get('/check/:token', checkPdfPayment);

export default router;

