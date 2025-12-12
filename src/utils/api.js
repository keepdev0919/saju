/**
 * API 유틸리티
 * 백엔드 API 호출을 위한 axios 설정 및 API 함수들
 */
import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10초 타임아웃
});

/**
 * 에러 처리 인터셉터
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 에러:', error);
    if (error.response) {
      // 서버에서 응답이 왔지만 에러 상태 코드
      return Promise.reject({
        message: error.response.data.error || '서버 오류가 발생했습니다.',
        status: error.response.status,
      });
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      return Promise.reject({
        message: '서버에 연결할 수 없습니다.',
        status: 0,
      });
    } else {
      // 요청 설정 중 에러
      return Promise.reject({
        message: error.message || '알 수 없는 오류가 발생했습니다.',
        status: 0,
      });
    }
  }
);

/**
 * 사용자 API
 */

/**
 * 사용자 생성
 * @param {Object} userData - 사용자 정보
 * @returns {Promise} 사용자 생성 결과
 */
export const createUser = async (userData) => {
  const response = await apiClient.post('/user/create', userData);
  return response.data;
};

/**
 * 사용자 인증
 * @param {Object} authData - 인증 정보 (phone, birthDate)
 * @returns {Promise} 인증 결과
 */
export const verifyUser = async (authData) => {
  const response = await apiClient.post('/user/verify', authData);
  return response.data;
};

/**
 * 토큰으로 사용자 조회
 * @param {string} token - 접근 토큰
 * @returns {Promise} 사용자 정보
 */
export const getUserByToken = async (token) => {
  const response = await apiClient.get(`/user/${token}`);
  return response.data;
};

/**
 * 결제 API
 */

/**
 * 결제 요청 생성
 * @param {Object} paymentData - 결제 정보
 * @returns {Promise} 결제 요청 결과
 */
export const createPayment = async (paymentData) => {
  const response = await apiClient.post('/payment/create', paymentData);
  return response.data;
};

/**
 * 결제 검증
 * @param {Object} verifyData - 결제 검증 정보 (imp_uid, merchant_uid)
 * @returns {Promise} 결제 검증 결과
 */
export const verifyPayment = async (verifyData) => {
  const response = await apiClient.post('/payment/verify', verifyData);
  return response.data;
};

/**
 * 결제 취소
 * @param {Object} cancelData - 취소 정보
 * @returns {Promise} 취소 결과
 */
export const cancelPayment = async (cancelData) => {
  const response = await apiClient.post('/payment/cancel', cancelData);
  return response.data;
};

/**
 * 사주 API
 */

/**
 * 사주 계산
 * @param {Object} sajuData - 사주 계산 데이터
 * @returns {Promise} 사주 계산 결과
 */
export const calculateSaju = async (sajuData) => {
  const response = await apiClient.post('/saju/calculate', sajuData);
  return response.data;
};

/**
 * 사주 결과 조회
 * @param {string} token - 접근 토큰
 * @returns {Promise} 사주 결과
 */
export const getSajuResult = async (token) => {
  const response = await apiClient.get(`/saju/result/${token}`);
  return response.data;
};

/**
 * PDF API
 */

/**
 * PDF 생성
 * @param {Object} pdfData - PDF 생성 데이터
 * @returns {Promise} PDF 생성 결과
 */
export const generatePDF = async (pdfData) => {
  const response = await apiClient.post('/pdf/generate', pdfData);
  return response.data;
};

/**
 * PDF 다운로드 URL 가져오기
 * @param {string} token - 접근 토큰
 * @returns {string} PDF 다운로드 URL
 */
export const getPdfDownloadUrl = (token) => {
  return `${API_BASE_URL}/pdf/download/${token}`;
};

export default apiClient;

