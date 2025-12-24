/**
 * 관리자 결제 관리 컨트롤러
 * 결제 내역 조회, 상세 조회, 환불 처리
 */
import db from '../config/database.js';
import { cancelPayment as cancelPortonePayment } from '../services/portoneService.js';
import axios from 'axios'; // Portone API 호출용
import { logAdminAction, ACTIONS } from '../utils/auditLogger.js';

/**
 * 결제 내역 조회 (페이징, 검색, 필터)
 * GET /api/admin/payments
 *
 * @query {number} page - 페이지 번호 (기본: 1)
 * @query {number} limit - 페이지당 항목 수 (기본: 20)
 * @query {string} search - 검색어 (이름, 전화번호, merchant_uid)
 * @query {string} status - 결제 상태 필터 (pending, paid, cancelled, refunded)
 * @query {string} startDate - 시작 날짜 (YYYY-MM-DD)
 * @query {string} endDate - 종료 날짜 (YYYY-MM-DD)
 *
 * @requires adminAuth 미들웨어
 */
export async function getPayments(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // 동적 쿼리 생성
    let whereConditions = [];
    let queryParams = [];

    // 검색어 처리 (이름, 전화번호, merchant_uid)
    if (search) {
      whereConditions.push(
        `(u.name LIKE ? OR u.phone LIKE ? OR p.merchant_uid LIKE ?)`
      );
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 상태 필터
    if (status) {
      whereConditions.push(`p.status = ? `);
      queryParams.push(status);
    }

    // 날짜 범위 필터
    if (startDate) {
      whereConditions.push(`DATE(p.created_at) >= ? `);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`DATE(p.created_at) <= ? `);
      queryParams.push(endDate);
    }

    // WHERE 절 생성
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')} `
      : '';

    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
    `;

    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult[0].total;

    // 결제 목록 조회
    const listQuery = `
      SELECT
        p.id,
        p.merchant_uid,
        p.imp_uid,
        p.amount,
        p.product_type,
        p.status,
        p.paid_at,
        p.created_at,
        p.refund_reason,
        p.refunded_by,
        p.refunded_at,
        u.id as user_id,
        u.name as user_name,
        u.phone as user_phone,
        u.birth_date,
        admin.name as refunded_by_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN admins admin ON p.refunded_by = admin.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [payments] = await db.query(
      listQuery,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ 결제 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '결제 내역 조회 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 결제 상세 조회
 * GET /api/admin/payments/:id
 *
 * @param {number} req.params.id - 결제 ID
 *
 * @requires adminAuth 미들웨어
 */
export async function getPaymentDetail(req, res) {
  try {
    const { id } = req.params;

    const [payments] = await db.query(
      `
      SELECT
        p.*,
        u.id as user_id,
        u.name as user_name,
        u.phone as user_phone,
        u.birth_date,
        u.birth_time,
        u.gender,
        u.calendar_type,
        admin.name as refunded_by_name,
        admin.username as refunded_by_username
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN admins admin ON p.refunded_by = admin.id
      WHERE p.id = ?
      `,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: '결제 정보를 찾을 수 없습니다.'
      });
    }

    // 사주 결과 조회 (있는 경우)
    const [sajuResults] = await db.query(
      `SELECT * FROM saju_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [payments[0].user_id]
    );

    // 알림톡 발송 내역 조회
    const [notifications] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
      [payments[0].user_id]
    );

    res.json({
      success: true,
      payment: payments[0],
      sajuResult: sajuResults.length > 0 ? sajuResults[0] : null,
      notifications
    });
  } catch (error) {
    console.error('❌ 결제 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '결제 상세 조회 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 환불 처리
 * POST /api/admin/payments/:id/refund
 *
 * @param {number} req.params.id - 결제 ID
 * @param {string} req.body.reason - 환불 사유
 *
 * @requires adminAuth 미들웨어
 */
export async function refundPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '환불 사유를 입력해주세요.'
      });
    }

    // 결제 정보 조회
    const [payments] = await db.query(
      `SELECT * FROM payments WHERE id = ? `,
      [id]
    );

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: '결제 정보를 찾을 수 없습니다.'
      });
    }

    const payment = payments[0];

    // 이미 환불된 경우 체크
    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: '이미 환불 처리된 결제입니다.',
        refundedAt: payment.refunded_at,
        refundReason: payment.refund_reason
      });
    }

    // 환불 가능한 상태 체크 (paid 상태만)
    if (payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: `환불 가능한 상태가 아닙니다. (현재 상태: ${payment.status})`
      });
    }

    // 포트원 환불 처리
    let portoneRefundResult = null;
    try {
      portoneRefundResult = await cancelPortonePayment(payment.imp_uid, reason);
      console.log('✅ 포트원 환불 성공:', portoneRefundResult);
    } catch (portoneError) {
      console.error('⚠️  포트원 환불 실패 (DB는 업데이트):', portoneError);
      // 포트원 환불 실패해도 DB는 업데이트 (수동 환불 처리 가능하도록)
    }

    // 결제 상태 업데이트 (환불 정보 기록)
    await db.query(
      `
      UPDATE payments
      SET 
        status = 'refunded',
        refund_reason = ?,
        refunded_by = ?,
        refunded_at = NOW()
      WHERE id = ?
      `,
      [reason, adminId, id]
    );

    console.log('✅ 환불 처리 완료:', {
      paymentId: id,
      merchantUid: payment.merchant_uid,
      amount: payment.amount,
      reason,
      refundedBy: req.admin.username
    });

    // 감사 로그 기록
    await logAdminAction({
      adminId,
      action: ACTIONS.REFUND,
      target: `payment_id:${id}`,
      details: JSON.stringify({ amount: payment.amount, reason }),
      req
    });

    res.json({
      success: true,
      message: '환불이 완료되었습니다.',
      refund: {
        paymentId: id,
        merchantUid: payment.merchant_uid,
        amount: payment.amount,
        reason,
        refundedBy: req.admin.name,
        refundedAt: new Date().toISOString(),
        portoneResult: portoneRefundResult
      }
    });
  } catch (error) {
    console.error('❌ 환불 처리 오류:', error);
    res.status(500).json({
      success: false,
      error: '환불 처리 중 오류가 발생했습니다.',
      message: error.message
    });
  }
}

/**
 * 결제 통계 조회
 * GET /api/admin/payments/stats
 *
 * @requires adminAuth 미들웨어
 */
export async function getPaymentStats(req, res) {
  try {
    // 전체 통계
    const [totalStats] = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refund,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM payments
    `);

    // 오늘 통계
    const [todayStats] = await db.query(`
      SELECT 
        COUNT(*) as today_count,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as today_revenue,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as today_paid_count
      FROM payments
      WHERE DATE(created_at) = CURDATE()
    `);

    // 이번 달 통계
    const [monthStats] = await db.query(`
      SELECT 
        COUNT(*) as month_count,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as month_revenue,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as month_paid_count
      FROM payments
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
        AND MONTH(created_at) = MONTH(CURDATE())
    `);

    res.json({
      success: true,
      stats: {
        total: totalStats[0],
        today: todayStats[0],
        month: monthStats[0]
      }
    });
  } catch (error) {
    console.error('❌ 결제 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '결제 통계 조회 중 오류가 발생했습니다.'
    });
  }
}

/**
 * 최근 대시보드 활동 내역 조회
 * GET /api/admin/dashboard/activity
 */
export async function getDashboardActivity(req, res) {
  try {
    // 최근 10개 로그 조회 (admin 정보 조인)
    const [logs] = await db.query(`
      SELECT 
        l.id,
        l.action,
        l.target,
        l.details,
        l.created_at,
        a.username,
        a.name
      FROM admin_audit_logs l
      LEFT JOIN admins a ON l.admin_id = a.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      activities: logs
    });
  } catch (error) {
    console.error('❌ 대시보드 활동 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '활동 내역을 불러오는데 실패했습니다.'
    });
  }
}
