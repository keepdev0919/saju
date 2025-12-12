/**
 * 포트원 결제 서비스
 * 포트원(아임포트) API 연동
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PORTONE_API_URL = 'https://api.portone.io';
const IMP_KEY = process.env.PORTONE_IMP_KEY;
const IMP_SECRET = process.env.PORTONE_IMP_SECRET;

/**
 * 포트원 액세스 토큰 발급
 */
async function getAccessToken() {
  try {
    const response = await axios.post(
      `${PORTONE_API_URL}/users/getToken`,
      {
        imp_key: IMP_KEY,
        imp_secret: IMP_SECRET
      }
    );
    return response.data.response.access_token;
  } catch (error) {
    console.error('포트원 토큰 발급 실패:', error);
    throw new Error('포트원 인증에 실패했습니다.');
  }
}

/**
 * 결제 요청 생성
 * @param {Object} paymentData - 결제 정보
 * @returns {Object} 결제 요청 결과
 */
export async function createPayment(paymentData) {
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
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return {
      imp_uid: response.data.response.imp_uid,
      merchant_uid: paymentData.merchant_uid,
      amount: paymentData.amount
    };
  } catch (error) {
    console.error('결제 요청 생성 실패:', error);
    throw new Error('결제 요청 생성에 실패했습니다.');
  }
}

/**
 * 결제 검증
 * @param {string} impUid - 포트원 결제 고유번호
 * @returns {Object} 결제 정보
 */
export async function verifyPayment(impUid) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PORTONE_API_URL}/payments/${impUid}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
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
    console.error('결제 검증 실패:', error);
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
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return response.data.response;
  } catch (error) {
    console.error('환불 처리 실패:', error);
    throw new Error('환불 처리에 실패했습니다.');
  }
}

