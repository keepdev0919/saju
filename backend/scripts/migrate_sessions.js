import db from '../src/config/database.js';
import crypto from 'crypto';

async function migrateSessions() {
  console.log('🚀 세션 시스템 마이그레이션 시작...\n');

  try {
    // 1. sessions 테이블 생성
    console.log('[1/3] sessions 테이블 생성 중...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        device_info VARCHAR(500),
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_revoked_at (revoked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ sessions 테이블 생성 완료\n');

    // 2. 기존 access_token 데이터를 sessions로 마이그레이션
    console.log('[2/3] 기존 토큰 마이그레이션 중...');
    const [users] = await db.execute(`
      SELECT id, access_token, created_at
      FROM users
      WHERE access_token IS NOT NULL AND deleted_at IS NULL
    `);

    console.log(`📊 마이그레이션할 사용자: ${users.length}명`);

    let successCount = 0;
    for (const user of users) {
      try {
        // 기존 토큰을 sessions에 저장 (90일 만료)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await db.execute(`
          INSERT INTO sessions (token, user_id, device_info, expires_at)
          VALUES (?, ?, 'migrated-legacy-token', ?)
          ON DUPLICATE KEY UPDATE last_used_at = NOW()
        `, [user.access_token, user.id, expiresAt]);

        successCount++;
      } catch (err) {
        console.error(`⚠️  user_id=${user.id} 마이그레이션 실패:`, err.message);
      }
    }

    console.log(`✅ 기존 토큰 마이그레이션 완료: ${successCount}/${users.length}명\n`);

    // 3. 검증
    console.log('[3/3] 마이그레이션 검증 중...');
    const [userCount] = await db.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE access_token IS NOT NULL AND deleted_at IS NULL
    `);
    const [sessionCount] = await db.execute(`
      SELECT COUNT(*) as count FROM sessions
    `);

    console.log(`📊 users.access_token: ${userCount[0].count}개`);
    console.log(`📊 sessions 레코드: ${sessionCount[0].count}개`);

    if (userCount[0].count === sessionCount[0].count) {
      console.log('✅ 검증 성공: 모든 토큰이 마이그레이션되었습니다!\n');
    } else {
      console.warn('⚠️  경고: 토큰 수가 일치하지 않습니다. 확인 필요\n');
    }

    // 4. 인덱스 확인
    const [indexes] = await db.execute(`
      SHOW INDEX FROM sessions
    `);
    console.log(`📊 생성된 인덱스: ${indexes.length}개`);
    indexes.forEach(idx => {
      console.log(`   - ${idx.Key_name} (${idx.Column_name})`);
    });

    console.log('\n🎉 세션 시스템 마이그레이션 완료!');
    console.log('ℹ️  users.access_token 컬럼은 롤백을 위해 유지됩니다');
    console.log('⚠️  Phase 6 완료 후 수동으로 제거하세요\n');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// 실행
migrateSessions()
  .then(() => {
    console.log('프로세스 종료');
    process.exit(0);
  })
  .catch(err => {
    console.error('에러 발생:', err);
    process.exit(1);
  });
