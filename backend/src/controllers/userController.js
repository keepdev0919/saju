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
 */
export async function createUser(req, res) {
  try {
    const { name, phone, birthDate, birthTime, gender, calendarType } = req.body;

    // 필수 필드 검증
    if (!name || !phone || !birthDate || !gender) {
      return res.status(400).json({ 
        error: '필수 정보가 누락되었습니다.',
        required: ['name', 'phone', 'birthDate', 'gender']
      });
    }

    // 접근 토큰 생성
    const accessToken = generateAccessToken();

    // 사용자 정보 저장
    const [result] = await db.execute(
      `INSERT INTO users (name, phone, birth_date, birth_time, gender, calendar_type, access_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         birth_time = VALUES(birth_time),
         gender = VALUES(gender),
         calendar_type = VALUES(calendar_type),
         access_token = VALUES(access_token)`,
      [name, phone, birthDate, birthTime || null, gender, calendarType || 'solar', accessToken]
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
 * 생년월일과 휴대폰 번호로 본인 확인
 */
export async function verifyUser(req, res) {
  try {
    const { phone, birthDate } = req.body;

    if (!phone || !birthDate) {
      return res.status(400).json({ 
        error: '휴대폰 번호와 생년월일을 입력해주세요.' 
      });
    }

    // 사용자 조회
    const [users] = await db.execute(
      `SELECT id, name, access_token FROM users 
       WHERE phone = ? AND birth_date = ?`,
      [phone, birthDate]
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
 * 결과 페이지 접근 시 사용
 */
export async function getUserByToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    const [users] = await db.execute(
      `SELECT id, name, phone, birth_date, birth_time, gender, calendar_type 
       FROM users WHERE access_token = ?`,
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
        calendarType: user.calendar_type
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

