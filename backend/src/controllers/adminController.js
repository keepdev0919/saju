/**
 * 관리자 컨트롤러
 * 관리자 로그인, 로그아웃, 정보 조회
 */
import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { generateToken } from '../middleware/adminAuth.js';
import { logAdminAction, ACTIONS } from '../utils/auditLogger.js';

/**
 * 관리자 로그인
 * POST /api/admin/login
 *
 * @param {Object} req.body
 * @param {string} req.body.username - 관리자 ID
 * @param {string} req.body.password - 비밀번호
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    // 입력값 검증
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '아이디와 비밀번호를 입력해주세요.'
      });
    }

    // 관리자 조회
    const [admins] = await db.execute(
      `SELECT id, username, password_hash, name, email FROM admins WHERE username = ?`,
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 일치하지 않습니다.'
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

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: '아이디 또는 비밀번호가 잘못되었습니다.'
      });
    }

    // 토큰 생성
    const token = generateToken(admin);

    // 로그인 로그 기록
    await logAdminAction({
      adminId: admin.id,
      action: ACTIONS.LOGIN,
      details: '로그인 성공',
      req
    });

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('관리자 로그인 에러:', error);
    res.status(500).json({
      success: false,
      error: '서버 에러가 발생했습니다.'
    });
  }
}

/**
 * 내 정보 조회
 * GET /api/admin/me
 */
export async function getMe(req, res) {
  res.json({
    success: true,
    admin: req.admin
  });
}

/**
 * 관리자 정보 수정
 * PUT /api/admin/me
 *
 * @body {string} name - (선택) 표시 이름
 * @body {string} email - (선택) 이메일
 * @body {string} currentPassword - 필수
 * @body {string} newPassword - (선택)
 */
export async function updateMe(req, res) {
  try {
    const adminId = req.admin.id;
    const { name, email, currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: '정보를 수정하려면 현재 비밀번호를 입력해야 합니다.'
      });
    }

    // 현재 관리자 정보 조회 (비밀번호 확인용)
    const [admins] = await db.query(
      `SELECT id, username, password_hash, name, email FROM admins WHERE id = ?`,
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        error: '관리자 정보를 찾을 수 없습니다.'
      });
    }

    const admin = admins[0];

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '현재 비밀번호가 일치하지 않습니다.'
      });
    }

    // 업데이트 쿼리 구성
    let updateQuery = `UPDATE admins SET id = id`; // updated_at 컬럼이 없으므로 id=id (No-op)
    let queryParams = [];
    let logActions = [];

    // 이름 변경
    if (name && name !== req.admin.name) {
      updateQuery += `, name = ?`;
      queryParams.push(name);
      logActions.push(`Name changed to ${name}`);
    }

    // 이메일 변경
    if (email && email !== req.admin.email) {
      updateQuery += `, email = ?`;
      queryParams.push(email);
      logActions.push(`Email changed to ${email}`);
    }

    // 새 비밀번호가 있는 경우
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: '새 비밀번호는 최소 6자 이상이어야 합니다.'
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      updateQuery += `, password_hash = ?`;
      queryParams.push(hashedPassword);

      // 비밀번호 로그는 별도로 상세히 기록 (CHANGE_PASSWORD action)
      await logAdminAction({
        adminId,
        action: ACTIONS.CHANGE_PASSWORD,
        req
      });
    }

    updateQuery += ` WHERE id = ?`;
    queryParams.push(adminId);

    // 변경사항 수행
    if (queryParams.length > 1) { // id 외에 변경사항이 있어야 함 (length=1 이면 WHERE id=? 만 있음)
      await db.query(updateQuery, queryParams);
    }

    // 프로필 업데이트 로그 (비번 외 변경사항이 있을 때)
    if (logActions.length > 0) {
      await logAdminAction({
        adminId,
        action: ACTIONS.UPDATE_PROFILE,
        details: logActions.join(', '),
        req
      });
    }

    res.json({
      success: true,
      message: '관리자 정보가 수정되었습니다.'
    });

  } catch (error) {
    console.error('❌ 관리자 정보 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: '관리자 정보 수정 중 오류가 발생했습니다.',
      details: error.message // 디버깅용
    });
  }
}

/**
 * 로그아웃
 * POST /api/admin/logout
 */
export async function logout(req, res) {
  // 로그아웃 로그
  if (req.admin && req.admin.id) {
    await logAdminAction({
      adminId: req.admin.id,
      action: ACTIONS.LOGOUT,
      req
    });
  }

  res.json({
    success: true,
    message: '로그아웃되었습니다.'
  });
}
