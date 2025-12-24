/**
 * 사용자 컨트롤러
 * 사용자 정보 생성, 인증, 조회 기능
 */
import db from '../config/database.js';
import crypto from 'crypto';

/**
 * 고유 접근 토큰 생성
 * @returns {string} 랜덤 토큰 문자열
 */
function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 사용자 생성
 * 결제 전 사용자 정보를 저장하고 접근 토큰을 발급
 * Soft Delete 정책: 이미 탈퇴한 사용자(휴대폰+생일 중복)가 재가입 시 deleted_at을 NULL로 초기화하여 부활시킴
 */
export async function createUser(req, res) {
  try {
    const { name, phone, birthDate, birthTime, gender, calendarType, isLeap } = req.body;

    // 휴대폰 번호에서 숫자만 추출 (하이픈 제거 등)
    const cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : phone;

    // 필수 필드 검증
    if (!name || !phone || !birthDate || !gender) {
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다.',
        required: ['name', 'phone', 'birthDate', 'gender']
      });
    }

    // 접근 토큰 생성
    const accessToken = generateAccessToken();

    // 사용자 정보 저장 (Soft Deleted 된 유저가 재가입 시 deleted_at = NULL 로 부활)
    const [result] = await db.execute(
      `INSERT INTO users (name, phone, birth_date, birth_time, gender, calendar_type, is_leap, access_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         birth_time = VALUES(birth_time),
         gender = VALUES(gender),
         calendar_type = VALUES(calendar_type),
         is_leap = VALUES(is_leap),
         access_token = VALUES(access_token),
         deleted_at = NULL`,
      [name, cleanPhone, birthDate, birthTime || null, gender, calendarType || 'solar', isLeap ? 1 : 0, accessToken]
    );

    const userId = result.insertId || result.affectedRows;

    res.json({
      success: true,
      userId,
      accessToken,
      message: '사용자 정보가 저장되었습니다.'
    });
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    res.status(500).json({
      error: '사용자 정보 저장에 실패했습니다.',
      message: error.message
    });
  }
}

/**
 * 사용자 인증
 * 생년월일과 휴대폰 번호로 본인 확인 (탈퇴한 회원 제외)
 */
export async function verifyUser(req, res) {
  try {
    const { phone, birthDate } = req.body;

    if (!phone || !birthDate) {
      return res.status(400).json({
        error: '휴대폰 번호와 생년월일을 입력해주세요.'
      });
    }

    // 휴대폰 번호에서 숫자만 추출 (하이픈 제거 등)
    const cleanPhone = String(phone).replace(/[^\d]/g, '');

    // 사용자 조회 (삭제된 사용자 제외)
    const [users] = await db.execute(
      `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type, is_leap, access_token 
       FROM users 
       WHERE phone = ? AND birth_date = ? AND deleted_at IS NULL`,
      [cleanPhone, birthDate]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: '일치하는 정보를 찾을 수 없습니다.'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        gender: user.gender,
        calendarType: user.calendar_type,
        isLeap: !!user.is_leap,
        accessToken: user.access_token
      },
      message: '인증이 완료되었습니다.'
    });
  } catch (error) {
    console.error('사용자 인증 오류:', error);
    res.status(500).json({
      error: '인증 처리에 실패했습니다.',
      message: error.message
    });
  }
}

/**
 * 토큰으로 사용자 정보 조회
 * 결과 페이지 접근 시 사용 (탈퇴한 회원 제외)
 */
export async function getUserByToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    // 삭제된 사용자 제외
    const [users] = await db.execute(
      `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type, is_leap 
       FROM users WHERE access_token = ? AND deleted_at IS NULL`,
      [token]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 토큰입니다.' });
    }

    const user = users[0];

    // 민감한 정보 제외하고 반환
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        gender: user.gender,
        calendarType: user.calendar_type,
        isLeap: !!user.is_leap
      }
    });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({
      error: '사용자 정보 조회에 실패했습니다.',
      message: error.message
    });
  }
}

