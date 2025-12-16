/**
 * 관리자 인증 미들웨어
 * JWT 토큰 검증 및 관리자 권한 확인
 */
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * JWT 토큰 검증 미들웨어
 * Authorization 헤더에서 Bearer 토큰 추출 및 검증
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export async function adminAuth(req, res, next) {
  try {
    // Authorization 헤더 확인
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      });
    }

    // Bearer 토큰 추출
    const token = authHeader.substring(7); // "Bearer " 제거

    // JWT 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: '토큰이 만료되었습니다. 다시 로그인해주세요.'
        });
      }

      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }

    // 관리자 존재 여부 확인
    const [admins] = await db.execute(
      `SELECT id, username, name, email, is_active FROM admins WHERE id = ?`,
      [decoded.adminId]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        error: '관리자 계정을 찾을 수 없습니다.'
      });
    }

    const admin = admins[0];

    // 계정 활성화 여부 확인
    if (admin.is_active === 0) {
      return res.status(403).json({
        success: false,
        error: '비활성화된 관리자 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 요청 객체에 관리자 정보 추가
    req.admin = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      is_active: admin.is_active
    };

    next();
  } catch (error) {
    console.error('관리자 인증 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다.'
    });
  }
}

/**
 * JWT 토큰 생성
 *
 * @param {Object} adminData - 관리자 데이터
 * @param {number} adminData.id - 관리자 ID
 * @param {string} adminData.username - 관리자 username
 * @returns {string} JWT 토큰
 */
export function generateToken(adminData) {
  const payload = {
    adminId: adminData.id,
    username: adminData.username
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
