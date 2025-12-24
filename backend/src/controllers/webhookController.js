/**
 * Webhook 컨트롤러
 * 포트원에서 결제 상태 변경 시 서버로 전송하는 Webhook 처리
 */
import db from '../config/database.js';
import { verifyPayment as verifyPortonePayment } from '../services/portoneService.js';
import { sendResultLink } from '../services/kakaoService.js';

/**
 * 포트원 Webhook 핸들러
 * 포트원에서 결제 완료/취소/환불 시 자동으로 호출됨
 *
 * @param {string} req.body.imp_uid - 포트원 결제 고유번호
 * @param {string} req.body.merchant_uid - 가맹점 주문번호
 * @param {string} req.body.status - 결제 상태 (paid, cancelled, failed)
 */
export async function handlePortoneWebhook(req, res) {
  try {
    const { imp_uid, merchant_uid, status } = req.body;

    console.log('📡 Webhook 수신:', { imp_uid, merchant_uid, status });

    if (!imp_uid || !merchant_uid) {
      console.error('❌ Webhook: 필수 파라미터 누락');
      return res.status(400).json({ error: '필수 파라미터가 없습니다.' });
    }

    // 1. 포트원 API로 실제 결제 정보 재확인 (위조 방지)
    const paymentInfo = await verifyPortonePayment(imp_uid, merchant_uid);

    // 2. DB에서 결제 정보 조회
    const [payments] = await db.execute(
      `SELECT * FROM payments WHERE merchant_uid = ?`,
      [merchant_uid]
    );

    if (payments.length === 0) {
      console.error('❌ Webhook: 결제 정보를 찾을 수 없음:', merchant_uid);
      return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다.' });
    }

    const payment = payments[0];

    // 3. 결제 상태에 따라 처리
    switch (paymentInfo.status) {
      case 'paid':
        await handlePaymentSuccess(payment, paymentInfo);
        break;
      case 'cancelled':
        await handlePaymentCancelled(payment, paymentInfo);
        break;
      case 'failed':
        await handlePaymentFailed(payment, paymentInfo);
        break;
      default:
        console.warn('⚠️ Webhook: 알 수 없는 결제 상태:', paymentInfo.status);
    }

    // 4. 포트원에 응답 (200 OK 필수 - 그렇지 않으면 재시도함)
    res.status(200).json({ success: true, message: 'Webhook 처리 완료' });
  } catch (error) {
    console.error('❌ Webhook 처리 오류:', error);
    // 에러가 발생해도 200 OK를 반환하여 포트원의 재시도를 방지
    res.status(200).json({ success: false, message: error.message });
  }
}

/**
 * 결제 성공 처리
 */
async function handlePaymentSuccess(payment, paymentInfo) {
  try {
    console.log('✅ Webhook: 결제 성공 처리 시작');

    // 1. 결제 금액 검증 (위조 방지)
    if (paymentInfo.amount !== payment.amount) {
      console.error('❌ Webhook: 결제 금액 불일치', {
        expected: payment.amount,
        actual: paymentInfo.amount,
        merchant_uid: payment.merchant_uid
      });
      throw new Error('결제 금액이 일치하지 않습니다.');
    }

    // 2. 이미 처리된 결제인지 확인 (중복 처리 방지)
    if (payment.status === 'paid') {
      console.log('⚠️ Webhook: 이미 처리된 결제입니다:', payment.merchant_uid);
      return;
    }

    // 3. 결제 상태 업데이트
    await db.execute(
      `UPDATE payments
       SET imp_uid = ?, status = 'paid', paid_at = NOW()
       WHERE merchant_uid = ?`,
      [paymentInfo.imp_uid, payment.merchant_uid]
    );

    console.log('✅ Webhook: 결제 상태 업데이트 완료');

    // 4. 사용자 정보 조회 (알림톡 발송용)
    const [users] = await db.execute(
      `SELECT name, phone, access_token FROM users WHERE id = ? AND deleted_at IS NULL`,
      [payment.user_id]
    );

    if (users.length > 0) {
      const user = users[0];
      const resultUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/result/${user.access_token}`;

      // 5. 알림톡 발송 기록 저장 (pending 상태)
      const [notificationResult] = await db.execute(
        `INSERT INTO notifications (user_id, type, phone, status)
         VALUES (?, 'result_link', ?, 'pending')`,
        [payment.user_id, user.phone]
      );

      // 6. 카카오 알림톡 발송 (비동기)
      sendResultLink({
        phone: user.phone,
        userName: user.name,
        resultUrl
      })
        .then(result => {
          if (result.success && !result.isDummy) {
            db.execute(
              `UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE id = ?`,
              [notificationResult.insertId]
            ).catch(err => console.error('알림톡 발송 기록 업데이트 실패:', err));
          } else if (result.isDummy) {
            console.log('알림톡 더미 발송 (실제 발송 안 함)');
          }
        })
        .catch(err => {
          console.error('알림톡 발송 실패:', err);
          db.execute(
            `UPDATE notifications SET status = 'failed' WHERE id = ?`,
            [notificationResult.insertId]
          ).catch(updateErr => console.error('알림톡 발송 기록 업데이트 실패:', updateErr));
        });
    }

    console.log('✅ Webhook: 결제 성공 처리 완료');
  } catch (error) {
    console.error('❌ Webhook: 결제 성공 처리 오류:', error);
    throw error;
  }
}

/**
 * 결제 취소/환불 처리
 */
async function handlePaymentCancelled(payment, paymentInfo) {
  try {
    console.log('🔄 Webhook: 결제 취소 처리 시작');

    // 결제 상태 업데이트
    await db.execute(
      `UPDATE payments
       SET status = 'refunded', refunded_at = NOW()
       WHERE merchant_uid = ?`,
      [payment.merchant_uid]
    );

    console.log('✅ Webhook: 결제 취소 처리 완료');
  } catch (error) {
    console.error('❌ Webhook: 결제 취소 처리 오류:', error);
    throw error;
  }
}

/**
 * 결제 실패 처리
 */
async function handlePaymentFailed(payment, paymentInfo) {
  try {
    console.log('❌ Webhook: 결제 실패 처리 시작');

    // 결제 상태 업데이트
    await db.execute(
      `UPDATE payments
       SET status = 'failed'
       WHERE merchant_uid = ?`,
      [payment.merchant_uid]
    );

    console.log('✅ Webhook: 결제 실패 처리 완료');
  } catch (error) {
    console.error('❌ Webhook: 결제 실패 처리 오류:', error);
    throw error;
  }
}
