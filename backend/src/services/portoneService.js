/**
 * 포트원 결제 서비스
 * 포트원(아임포트) V1 API 연동
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 포트원 V1 API 엔드포인트
const PORTONE_API_URL = 'https://api.iamport.kr';

// V1 API 인증 정보
const IMP_KEY = process.env.PORTONE_IMP_KEY; // V1 고객사 식별코드
const IMP_SECRET = process.env.PORTONE_IMP_SECRET; // V1 API Secret

// 개발 모드: 환경 변수가 없으면 더미 모드로 동작
const IS_DUMMY_MODE = (!IMP_KEY || !IMP_SECRET) || process.env.NODE_ENV === 'development';

/**
 * 포트원 V1 API 액세스 토큰 발급
 */
async function getAccessToken() {
  // 더미 모드: 실제 API 호출 없이 더미 토큰 반환
  if (IS_DUMMY_MODE) {
    console.log('⚠️  포트원 더미 모드: 실제 API 호출 없이 더미 토큰 반환');
    return 'dummy_access_token_' + Date.now();
  }

  try {
    const response = await axios.post(
      `${PORTONE_API_URL}/users/getToken`,
      {
        imp_key: IMP_KEY,
        imp_secret: IMP_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.response.access_token;
  } catch (error) {
    console.error('포트원 토큰 발급 실패:', error.response?.data || error.message);
    throw new Error('포트원 인증에 실패했습니다.');
  }
}

/**
 * 결제 요청 생성
 * @param {Object} paymentData - 결제 정보
 * @returns {Object} 결제 요청 결과
 */
export async function createPayment(paymentData) {
  // 더미 모드: 실제 API 호출 없이 더미 데이터 반환
  if (IS_DUMMY_MODE) {
    console.log('⚠️  포트원 더미 모드: 결제 요청 생성 (더미 데이터)');
    return {
      imp_uid: `imp_dummy_${Date.now()}`,
      merchant_uid: paymentData.merchant_uid,
      amount: paymentData.amount
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${PORTONE_API_URL}/payments/prepare`,
      {
        merchant_uid: paymentData.merchant_uid,
        amount: paymentData.amount,
        name: paymentData.name || '사주 풀이 서비스'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      imp_uid: response.data.response.imp_uid,
      merchant_uid: paymentData.merchant_uid,
      amount: paymentData.amount
    };
  } catch (error) {
    console.error('결제 요청 생성 실패:', error.response?.data || error.message);
    throw new Error('결제 요청 생성에 실패했습니다.');
  }
}

/**
 * 결제 검증
 * @param {string} impUid - 포트원 결제 고유번호
 * @returns {Object} 결제 정보
 */
export async function verifyPayment(impUid, merchantUid = null) {
  // 더미 모드: 실제 API 호출 없이 더미 데이터 반환
  if (IS_DUMMY_MODE) {
    console.log('⚠️  포트원 더미 모드: 결제 검증 (더미 데이터)');
    // merchantUid가 있으면 DB에서 실제 금액 조회
    let amount = 100; // 기본값
    if (merchantUid) {
      try {
        // DB에서 실제 결제 금액 조회 (동적 import로 순환 참조 방지)
        const db = (await import('../config/database.js')).default;
        const [payments] = await db.execute(
          `SELECT amount FROM payments WHERE merchant_uid = ?`,
          [merchantUid]
        );
        if (payments.length > 0) {
          amount = payments[0].amount;
        }
      } catch (err) {
        console.warn('더미 모드: DB 조회 실패, 기본값 사용:', err.message);
      }
    }
    return {
      imp_uid: impUid,
      merchant_uid: merchantUid || `merchant_${Date.now()}`,
      amount: amount,
      status: 'paid',
      paid_at: Math.floor(Date.now() / 1000)
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PORTONE_API_URL}/payments/${impUid}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const payment = response.data.response;

    return {
      imp_uid: payment.imp_uid,
      merchant_uid: payment.merchant_uid,
      amount: payment.amount,
      status: payment.status,
      paid_at: payment.paid_at
    };
  } catch (error) {
    console.error('결제 검증 실패:', error.response?.data || error.message);
    throw new Error('결제 검증에 실패했습니다.');
  }
}

/**
 * 결제 취소/환불
 * @param {string} impUid - 포트원 결제 고유번호
 * @param {string} reason - 환불 사유
 * @returns {Object} 환불 결과
 */
export async function cancelPayment(impUid, reason) {
  // 더미 모드: 실제 API 호출 없이 더미 데이터 반환
  if (IS_DUMMY_MODE) {
    console.log('⚠️  포트원 더미 모드: 환불 처리 (더미 데이터)');
    return {
      imp_uid: impUid,
      cancel_amount: 9900,
      reason: reason || '고객 요청',
      cancelled_at: Math.floor(Date.now() / 1000)
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${PORTONE_API_URL}/payments/cancel`,
      {
        imp_uid: impUid,
        reason: reason || '고객 요청'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.response;
  } catch (error) {
    console.error('환불 처리 실패:', error.response?.data || error.message);
    throw new Error('환불 처리에 실패했습니다.');
  }
}
