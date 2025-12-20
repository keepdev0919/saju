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
  timeout: 60000, // 60초 타임아웃 (JSON 형식 상세 응답 대응)
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
 * 결제 후 실행되므로 OpenAI API 응답이 올 때까지 무조건 기다려야 함
 * 타임아웃을 매우 길게 설정 (5분) 또는 제거
 * @param {Object} sajuData - 사주 계산 데이터
 * @returns {Promise} 사주 계산 결과
 */
export const calculateSaju = async (sajuData) => {
  // 사주 계산만 별도 axios 인스턴스 사용 (타임아웃 5분)
  const response = await axios.post(`${API_BASE_URL}/saju/calculate`, sajuData, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 300000, // 5분 (300초) - OpenAI API 응답이 올 때까지 기다림
  });
  return response.data;
};

/**
 * 무료 사용자 사주 결과 계산 (AI 제외 - 선노출용)
 * 라이브러리 연산만 수행하므로 응답이 빠름
 * @param {Object} sajuData - 사주 계산 데이터
 * @returns {Promise} 기초 사주 계산 결과
 */
export const getFreeResult = async (sajuData) => {
  const response = await apiClient.post('/saju/result-freeuser', sajuData);
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
 * @param {boolean} pdfData.preview - 미리보기 여부 (워터마크 포함)
 * @returns {Promise} PDF 생성 결과 또는 PDF Blob (미리보기인 경우)
 */
export const generatePDF = async (pdfData) => {
  const response = await apiClient.post('/pdf/generate', pdfData, {
    responseType: pdfData.preview ? 'arraybuffer' : 'json'
  });

  // 미리보기인 경우 ArrayBuffer → Blob 변환
  if (pdfData.preview) {
    // ArrayBuffer → Blob 수동 변환
    const blob = new Blob([response.data], { type: 'application/pdf' });

    // PDF 헤더 검증
    const headerBytes = new Uint8Array(response.data.slice(0, 5));
    const header = String.fromCharCode(...headerBytes);
    if (!header.startsWith('%PDF-')) {
      throw new Error('유효하지 않은 PDF 데이터입니다.');
    }

    console.log('✅ PDF Blob 생성:', {
      size: blob.size,
      type: blob.type,
      header: header
    });

    return blob;
  }
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

/**
 * PDF 결제 여부 확인
 * @param {string} token - 접근 토큰
 * @returns {Promise} PDF 결제 여부
 */
export const checkPdfPayment = async (token) => {
  const response = await apiClient.get(`/pdf/check/${token}`);
  return response.data;
};

export default apiClient;

