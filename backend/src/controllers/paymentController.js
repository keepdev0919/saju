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
 * 보안 개선: accessToken을 사용하여 DB에서 userId를 안전하게 조회 (IDOR 방지)
 * 
 * @param {string} req.body.accessToken - 사용자 접근 토큰
 * @param {number} req.body.amount - 결제 금액
 * @param {string} req.body.productType - 상품 유형 (basic/pdf)
 */
export async function createPayment(req, res) {
  try {
    const { accessToken, amount, productType = 'basic' } = req.body;

    if (!accessToken || !amount) {
      return res.status(400).json({
        error: '접근 토큰과 결제 금액이 필요합니다.'
      });
    }

    // 사용자 정보 조회 (삭제된 사용자 제외)
    const [users] = await db.execute(
      `SELECT id FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [accessToken]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const userId = users[0].id;

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
      name: productType === 'pdf' ? '사주 PDF 다운로드' : '천명록: 천기비록 (天機祕錄)'
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
 * 기본 결제(basic)와 프리미엄 결제(premium) 모두 처리
 */
export async function verifyPayment(req, res) {
  try {
    const { imp_uid, merchant_uid } = req.body;

    if (!imp_uid || !merchant_uid) {
      return res.status(400).json({
        error: '결제 정보가 필요합니다.'
      });
    }

    // payment_type 구분 (merchant_uid로 판단)
    const isPremium = merchant_uid.startsWith('premium_');

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

    // 사용자 정보 조회 (알림톡 발송용, 삭제된 사용자 제외)
    const [users] = await db.execute(
      `SELECT name, phone, access_token FROM users WHERE id = ? AND deleted_at IS NULL`,
      [payment.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const user = users[0];

    // 프리미엄 결제일 경우 is_premium 플래그 업데이트
    if (isPremium) {
      await db.execute(
        `UPDATE saju_results
         SET is_premium = TRUE
         WHERE user_id = ? AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [payment.user_id]
      );

      console.log(`✅ 프리미엄 업그레이드 완료: user_id=${payment.user_id}`);
    } else {
      // 기본 결제일 경우 알림톡 발송
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
        status: 'paid',
        paidAt: new Date()
      },
      accessToken: user.access_token, // 프론트엔드 자동 로그인을 위한 토큰 전달
      isPremium, // [NEW] 결제 타입 정보 전달 (콜백 처리용)
      message: '결제가 성공적으로 검증되었습니다.'
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
 * 프리미엄 결제 요청 생성 (2차 결제)
 * 1차 결제를 완료한 사용자가 한자 이름을 입력하고 프리미엄 업그레이드를 요청
 *
 * @param {string} req.body.accessToken - 사용자 접근 토큰
 * @param {string} req.body.hanjaName - 한자 이름 (2-4자)
 */
export async function createPremiumPayment(req, res) {
  try {
    const { accessToken, hanjaName } = req.body;

    if (!accessToken || !hanjaName) {
      return res.status(400).json({
        error: '접근 토큰과 한자 이름이 필요합니다.'
      });
    }

    // 한자 검증 (2-4자, 한자만)
    const hanjaRegex = /^[\u4E00-\u9FFF]{2,4}$/;
    if (!hanjaRegex.test(hanjaName)) {
      return res.status(400).json({
        error: '한자 2-4자를 입력해주세요.'
      });
    }

    // 사용자 정보 조회 (삭제된 사용자 제외)
    const [users] = await db.execute(
      `SELECT id, name, phone FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [accessToken]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];

    // [FIX] 사주 결과 조회 - 반드시 '최신' 결과로 업데이트해야 함
    // (JOIN을 쓰면 과거 결과가 잡힐 수 있음)
    const [latestResults] = await db.execute(
      `SELECT id, is_premium FROM saju_results 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (latestResults.length === 0) {
      return res.status(404).json({ error: '사주 결과를 찾을 수 없습니다.' });
    }

    const sajuResultId = latestResults[0].id;
    // user.is_premium은 구형 구조일 수 있으니 saju_results의 상태도 확인
    const isAlreadyPremium = latestResults[0].is_premium;

    // 1차 결제 완료 확인
    const [basicPayments] = await db.execute(
      `SELECT * FROM payments
       WHERE user_id = ? AND status = 'paid' AND payment_type = 'basic'
       ORDER BY paid_at DESC LIMIT 1`,
      [user.id]
    );

    if (basicPayments.length === 0) {
      return res.status(400).json({ error: '1차 결제가 필요합니다.' });
    }

    // 이미 프리미엄 결제했는지 확인
    if (isAlreadyPremium) {
      return res.status(400).json({
        error: '이미 프리미엄 업그레이드를 완료했습니다.'
      });
    }

    // 한자 이름 임시 저장 (결제 전)
    await db.execute(
      `UPDATE saju_results
       SET custom_hanja_name = ?
       WHERE id = ?`,
      [hanjaName, sajuResultId]
    );

    // merchant_uid 생성 (프리미엄 구분을 위해 'premium_' 접두사 사용)
    const merchantUid = `premium_${Date.now()}_${user.id}`;

    // 결제 정보 DB에 저장 (pending 상태, payment_type = 'premium')
    const [result] = await db.execute(
      `INSERT INTO payments (user_id, merchant_uid, amount, product_type, status, payment_type)
       VALUES (?, ?, ?, 'premium', 'pending', 'premium')`,
      [user.id, merchantUid, 100] // 테스트: 100원
    );

    // 포트원 결제 요청 생성
    const paymentData = await createPortonePayment({
      merchant_uid: merchantUid,
      amount: 100, // 테스트: 100원
      name: '천명록 프리미엄 업그레이드'
    });

    res.json({
      success: true,
      paymentId: result.insertId,
      merchantUid,
      impUid: paymentData.imp_uid,
      paymentData,
      accessToken,
      message: '프리미엄 결제 요청이 생성되었습니다.'
    });
  } catch (error) {
    console.error('프리미엄 결제 생성 오류:', error);
    res.status(500).json({
      error: '프리미엄 결제 요청 생성에 실패했습니다.',
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

