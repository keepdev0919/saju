/**
 * 관리자 API 유틸리티
 * 백엔드 관리자 API 호출을 위한 axios 설정 및 API 함수들
 */
import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// axios 인스턴스 생성
const adminApiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// 요청 인터셉터: 로컬 스토리지에서 토큰을 가져와 헤더에 추가
adminApiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터: 에러 처리
adminApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('관리자 API 에러:', error);
        if (error.response) {
            // 401 Unauthorized 에러 시 로그아웃 처리 (추후 Context에서 처리하겠지만 여기서도 에러 반환)
            if (error.response.status === 401) {
                localStorage.removeItem('adminToken');
                // window.location.href = '/admin/login'; // 강제 리다이렉트는 UX에 따라 결정
            }
            return Promise.reject({
                message: error.response.data.error || '서버 오류가 발생했습니다.',
                status: error.response.status,
            });
        } else if (error.request) {
            return Promise.reject({
                message: '서버에 연결할 수 없습니다.',
                status: 0,
            });
        } else {
            return Promise.reject({
                message: error.message || '알 수 없는 오류가 발생했습니다.',
                status: 0,
            });
        }
    }
);

/**
 * 관리자 로그인
 * @param {string} username 
 * @param {string} password 
 */
export const loginAdmin = async (username, password) => {
    const response = await adminApiClient.post('/admin/login', { username, password });
    return response.data;
};

/**
 * 내 정보 조회 (토큰 검증)
 */
export const getMe = async () => {
    const response = await adminApiClient.get('/admin/me');
    return response.data;
};

/**
 * 결제 내역 조회
 * @param {Object} params - { page, limit, search, status, startDate, endDate }
 */
export const getPayments = async (params) => {
    const response = await adminApiClient.get('/admin/payments', { params });
    return response.data;
};

/**
 * 결제 상세 조회
 * @param {number} id 
 */
export const getPaymentDetail = async (id) => {
    const response = await adminApiClient.get(`/admin/payments/${id}`);
    return response.data;
};

/**
 * 환불 처리
 * @param {number} id 
 * @param {string} reason 
 */
export const refundPayment = async (id, reason) => {
    const response = await adminApiClient.post(`/admin/payments/${id}/refund`, { reason });
    return response.data;
};

/**
 * 결제 통계 조회
 */
export const getPaymentStats = async () => {
    const response = await adminApiClient.get('/admin/payments/stats');
    return response.data;
};

/**
 * 회원 목록 조회
 * @param {Object} params - { page, limit, search }
 */
export const getUsers = async (params) => {
    const response = await adminApiClient.get('/admin/users', { params });
    return response.data;
};

/**
 * 회원 상세 조회
 * @param {number} id 
 */
export const getUserDetail = async (id) => {
    const response = await adminApiClient.get(`/admin/users/${id}`);
    return response.data;
};

/**
 * 관리자 정보 수정
 * @param {Object} data - { name, email, currentPassword, newPassword }
 */
// ... (existing exports)

/**
 * 대시보드 최근 활동 내역 조회
 */
export const getDashboardActivity = async () => {
    const response = await adminApiClient.get('/admin/dashboard/activity');
    return response.data;
};

// ... (existing exports)
export const updateAdminProfile = async (data) => {
    const response = await adminApiClient.put('/admin/me', data);
    return response.data;
};

export default adminApiClient;
