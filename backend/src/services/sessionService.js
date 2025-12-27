import db from '../config/database.js';
import crypto from 'crypto';

/**
 * 세션 토큰 생성
 * SHA-256 해시를 사용하여 안전한 토큰 생성
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 세션 생성
 * @param {number} userId - 사용자 ID
 * @param {object} options - 세션 옵션
 * @returns {Promise<string>} 생성된 토큰
 */
export async function createSession(userId, options = {}) {
  const {
    deviceInfo = null,
    ipAddress = null,
    expiresInDays = 90 // 기본 90일
  } = options;

  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.execute(`
    INSERT INTO sessions (token, user_id, device_info, ip_address, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [token, userId, deviceInfo, ipAddress, expiresAt]);

  console.log(`✅ 세션 생성: user_id=${userId}, expires=${expiresInDays}일`);
  return token;
}

/**
 * 세션 검증 및 사용자 정보 조회
 * @param {string} token - 세션 토큰
 * @returns {Promise<object|null>} 사용자 정보 또는 null
 */
export async function validateSession(token) {
  if (!token) return null;

  const [sessions] = await db.execute(`
    SELECT s.*, u.id, u.name, u.phone, u.birth_date, u.birth_time, u.gender, u.calendar_type, u.is_leap
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
      AND s.expires_at > NOW()
      AND s.revoked_at IS NULL
      AND u.deleted_at IS NULL
  `, [token]);

  if (sessions.length === 0) {
    return null;
  }

  const session = sessions[0];

  // last_used_at 업데이트 (비동기로 실행, 응답 지연 방지)
  db.execute(`
    UPDATE sessions SET last_used_at = NOW() WHERE token = ?
  `, [token]).catch(err => console.error('세션 업데이트 실패:', err));

  return {
    userId: session.user_id,
    name: session.name,
    phone: session.phone,
    birthDate: session.birth_date,
    birthTime: session.birth_time,
    gender: session.gender,
    calendarType: session.calendar_type,
    isLeap: !!session.is_leap
  };
}

/**
 * 레거시 토큰 검증 (하위 호환성)
 * users.access_token으로 조회 후 자동으로 sessions로 마이그레이션
 */
export async function validateLegacyToken(token) {
  if (!token) return null;

  const [users] = await db.execute(`
    SELECT id, name, phone, birth_date, birth_time, gender, calendar_type, is_leap
    FROM users
    WHERE access_token = ? AND deleted_at IS NULL
  `, [token]);

  if (users.length === 0) {
    return null;
  }

  const user = users[0];

  // 레거시 토큰을 sessions로 자동 마이그레이션
  const [existingSessions] = await db.execute(`
    SELECT id FROM sessions WHERE token = ? AND user_id = ?
  `, [token, user.id]);

  if (existingSessions.length === 0) {
    console.log(`🔄 레거시 토큰 자동 마이그레이션: user_id=${user.id}`);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await db.execute(`
      INSERT INTO sessions (token, user_id, device_info, expires_at)
      VALUES (?, ?, 'auto-migrated', ?)
    `, [token, user.id, expiresAt]);
  }

  return {
    userId: user.id,
    name: user.name,
    phone: user.phone,
    birthDate: user.birth_date,
    birthTime: user.birth_time,
    gender: user.gender,
    calendarType: user.calendar_type,
    isLeap: !!user.is_leap
  };
}

/**
 * 통합 토큰 검증 (신규 + 레거시 지원)
 * Phase 2 중 사용, Phase 3에서는 validateSession만 사용
 */
export async function validateToken(token) {
  // 1. 먼저 sessions 테이블에서 검증
  let user = await validateSession(token);
  if (user) return user;

  // 2. sessions에 없으면 레거시 토큰으로 검증 (자동 마이그레이션)
  user = await validateLegacyToken(token);
  return user;
}

/**
 * 세션 폐기
 * @param {string} token - 폐기할 토큰
 */
export async function revokeSession(token) {
  await db.execute(`
    UPDATE sessions SET revoked_at = NOW() WHERE token = ?
  `, [token]);

  console.log(`🗑️ 세션 폐기: token=${token.substring(0, 20)}...`);
}

/**
 * 사용자의 모든 세션 폐기
 * @param {number} userId - 사용자 ID
 */
export async function revokeAllUserSessions(userId) {
  const [result] = await db.execute(`
    UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL
  `, [userId]);

  console.log(`🗑️ 사용자 ${userId}의 세션 ${result.affectedRows}개 폐기됨`);
  return result.affectedRows;
}

/**
 * 만료된 세션 정리 (크론잡으로 실행)
 */
export async function cleanupExpiredSessions() {
  const [result] = await db.execute(`
    DELETE FROM sessions
    WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      OR revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
  `);

  console.log(`🗑️ 만료된 세션 ${result.affectedRows}개 삭제됨`);
  return result.affectedRows;
}

/**
 * 세션 갱신 (토큰은 그대로, 만료 시간만 연장)
 * @param {string} token - 갱신할 토큰
 * @param {number} expiresInDays - 연장할 일수
 */
export async function refreshSession(token, expiresInDays = 90) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [result] = await db.execute(`
    UPDATE sessions
    SET expires_at = ?, last_used_at = NOW()
    WHERE token = ? AND revoked_at IS NULL
  `, [expiresAt, token]);

  if (result.affectedRows > 0) {
    console.log(`🔄 세션 갱신: token=${token.substring(0, 20)}..., expires=+${expiresInDays}일`);
  }

  return result.affectedRows > 0;
}
