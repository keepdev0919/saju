import db from '../config/database.js';

/**
 * 관리자 활동 로그 기록
 * 
 * @param {Object} params
 * @param {number} params.adminId - 관리자 ID
 * @param {string} params.action - 활동 유형 (LOGIN, LOGOUT, UPDATE_PROFILE, REFUND, etc.)
 * @param {string} [params.target] - 활동 대상 (예: payment_id:123, user_id:456)
 * @param {string} [params.details] - 상세 내용 (JSON 문자열 또는 텍스트)
 * @param {Object} [params.req] - Express request 객체 (IP 추출용)
 */
export async function logAdminAction({ adminId, action, target, details, req }) {
    try {
        let ipAddress = 'unknown';

        // IP 주소 추출
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
            // IPv6 Loopback 변환
            if (ipAddress === '::1') ipAddress = '127.0.0.1';
        }

        await db.execute(
            `INSERT INTO admin_audit_logs (admin_id, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
            [adminId, action, target || null, details || null, ipAddress]
        );

        // 개발 모드에서는 콘솔에도 출력
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AuditLog] Admin:${adminId} Action:${action} Target:${target}`);
        }
    } catch (error) {
        // 로그 기록 실패가 메인 로직을 방해하지 않도록 에러만 출력하고 무시
        console.error('❌ Failed to write audit log:', error);
    }
}

export const ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT', // (Optional, hard to track with JWT except explicit logout)
    UPDATE_PROFILE: 'UPDATE_PROFILE',
    CHANGE_PASSWORD: 'CHANGE_PASSWORD',
    REFUND: 'REFUND',
    VIEW_USER: 'VIEW_USER' // (Optional, can be noisy)
};
