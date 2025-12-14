/**
 * 결제 컨트롤러
 * 포트원 결제 연동 및 결제 처리
 */
import db from '../config/database.js';
import { createPayment as createPortonePayment, verifyPayment as verifyPortonePayment } from '../services/portoneService.js';
import { sendResultLink } from '../services/kakaoService.js';

/**
 * 결제 요청 생성
 * 포트원에 결제 요청을 생성하고 merchant_uid를 반환
 */
export async function createPayment(req, res) {
  try {
    const { userId, amount, productType = 'basic' } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ 
        error: '사용자 ID와 결제 금액이 필요합니다.' 
      });
    }

    // merchant_uid 생성 (고유 주문번호)
    const merchantUid = `saju_${Date.now()}_${userId}`;

    // 결제 정보 DB에 저장 (pending 상태)
    const [result] = await db.execute(
      `INSERT INTO payments (user_id, merchant_uid, amount, product_type, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, merchantUid, amount, productType]
    );

    // 포트원 결제 요청 생성
    const paymentData = await createPortonePayment({
      merchant_uid: merchantUid,
      amount,
      name: productType === 'pdf' ? '사주 PDF 다운로드' : '2026 프리미엄 운세 리포트'
    });

    res.json({
      success: true,
      paymentId: result.insertId,
      merchantUid,
      impUid: paymentData.imp_uid,
      paymentData,
      message: '결제 요청이 생성되었습니다.'
    });
  } catch (error) {
    console.error('결제 생성 오류:', error);
    res.status(500).json({ 
      error: '결제 요청 생성에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * 결제 검증
 * 포트원에서 결제 완료 후 실제 결제가 완료되었는지 검증
 */
export async function verifyPayment(req, res) {
  try {
    const { imp_uid, merchant_uid } = req.body;

    if (!imp_uid || !merchant_uid) {
      return res.status(400).json({ 
        error: '결제 정보가 필요합니다.' 
      });
    }

    // 포트원에서 결제 정보 조회 및 검증 (merchant_uid 전달)
    const paymentInfo = await verifyPortonePayment(imp_uid, merchant_uid);

    // DB에서 결제 정보 조회
    const [payments] = await db.execute(
      `SELECT * FROM payments WHERE merchant_uid = ?`,
      [merchant_uid]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다.' });
    }

    const payment = payments[0];

    // 결제 상태 검증
    if (paymentInfo.status !== 'paid') {
      return res.status(400).json({ 
        error: '결제가 완료되지 않았습니다.' 
      });
    }

    // 결제 금액 검증
    if (paymentInfo.amount !== payment.amount) {
      console.error('결제 금액 불일치:', {
        expected: payment.amount,
        actual: paymentInfo.amount,
        merchant_uid: merchant_uid
      });
      return res.status(400).json({ 
        error: '결제 금액이 일치하지 않습니다.' 
      });
    }

    // 결제 상태 업데이트
    await db.execute(
      `UPDATE payments 
       SET imp_uid = ?, status = 'paid', paid_at = NOW()
       WHERE merchant_uid = ?`,
      [imp_uid, merchant_uid]
    );

    // 사용자 정보 조회 (알림톡 발송용)
    const [users] = await db.execute(
      `SELECT name, phone, access_token FROM users WHERE id = ?`,
      [payment.user_id]
    );

    if (users.length > 0) {
      const user = users[0];
      const resultUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/result/${user.access_token}`;

      // 알림톡 발송 기록 저장 (pending 상태)
      const [notificationResult] = await db.execute(
        `INSERT INTO notifications (user_id, type, phone, status)
         VALUES (?, 'result_link', ?, 'pending')`,
        [payment.user_id, user.phone]
      );

      // 카카오 알림톡 발송 (비동기로 처리, 실패해도 결제는 완료)
      sendResultLink({
        phone: user.phone,
        userName: user.name,
        resultUrl
      })
        .then(result => {
          // 발송 성공 시 상태 업데이트
          if (result.success && !result.isDummy) {
            db.execute(
              `UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE id = ?`,
              [notificationResult.insertId]
            ).catch(err => console.error('알림톡 발송 기록 업데이트 실패:', err));
          } else if (result.isDummy) {
            // 더미 모드인 경우 pending 상태 유지
            console.log('알림톡 더미 발송 (실제 발송 안 함)');
          }
        })
        .catch(err => {
          console.error('알림톡 발송 실패:', err);
          // 발송 실패 시 상태 업데이트
          db.execute(
            `UPDATE notifications SET status = 'failed' WHERE id = ?`,
            [notificationResult.insertId]
          ).catch(updateErr => console.error('알림톡 발송 기록 업데이트 실패:', updateErr));
        });
    }

    res.json({
      success: true,
      payment: {
        id: payment.id,
        userId: payment.user_id,
        amount: payment.amount,
        status: 'paid'
      },
      accessToken: users.length > 0 ? users[0].access_token : null,
      message: '결제가 완료되었습니다.'
    });
  } catch (error) {
    console.error('결제 검증 오류:', error);
    res.status(500).json({ 
      error: '결제 검증에 실패했습니다.',
      message: error.message 
    });
  }
}

/**
 * 결제 취소/환불
 */
export async function cancelPayment(req, res) {
  try {
    const { paymentId, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: '결제 ID가 필요합니다.' });
    }

    // 결제 정보 조회
    const [payments] = await db.execute(
      `SELECT * FROM payments WHERE id = ? AND status = 'paid'`,
      [paymentId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: '환불 가능한 결제를 찾을 수 없습니다.' });
    }

    const payment = payments[0];

    // 포트원 환불 처리 (추후 구현)
    // await cancelPortonePayment(payment.imp_uid, reason);

    // 결제 상태 업데이트
    await db.execute(
      `UPDATE payments SET status = 'refunded' WHERE id = ?`,
      [paymentId]
    );

    res.json({
      success: true,
      message: '환불이 완료되었습니다.'
    });
  } catch (error) {
    console.error('환불 처리 오류:', error);
    res.status(500).json({ 
      error: '환불 처리에 실패했습니다.',
      message: error.message 
    });
  }
}

