import db from '../src/config/database.js';

async function resetDatabase() {
  console.log('🔄 데이터베이스 초기화 시작...\n');

  try {
    // 1. 기존 테이블 삭제
    console.log('[1/3] 기존 테이블 삭제 중...');
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToDrop = [
      'sessions',
      'admin_audit_logs',
      'admins',
      'notifications',
      'saju_results',
      'payments',
      'users'
    ];

    for (const table of tablesToDrop) {
      try {
        await db.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✅ ${table} 삭제`);
      } catch (err) {
        console.log(`  ⚠️  ${table} 삭제 실패`);
      }
    }

    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ 모든 테이블 삭제 완료\n');

    // 2. users 테이블 생성
    console.log('[2/3] 테이블 생성 중...');
    await db.execute(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        birth_date DATE NOT NULL,
        birth_time VARCHAR(10),
        gender ENUM('male', 'female') NOT NULL,
        calendar_type ENUM('solar', 'lunar') DEFAULT 'solar',
        is_leap TINYINT(1) DEFAULT 0,
        access_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,

        UNIQUE KEY unique_user (phone, birth_date),
        INDEX idx_access_token (access_token),
        INDEX idx_deleted_at (deleted_at),
        INDEX idx_name (name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ users 테이블 생성');

    // 3. payments 테이블 생성
    await db.execute(`
      CREATE TABLE payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        merchant_uid VARCHAR(100) UNIQUE NOT NULL,
        imp_uid VARCHAR(100),
        amount INT NOT NULL,
        product_type ENUM('basic', 'pdf', 'premium') NOT NULL DEFAULT 'basic',
        status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending',
        paid_at TIMESTAMP NULL,
        refunded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_merchant_uid (merchant_uid),
        INDEX idx_status (status),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ payments 테이블 생성');

    // 4. saju_results 테이블 생성
    await db.execute(`
      CREATE TABLE saju_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        saju_data JSON,
        overall_fortune TEXT,
        wealth_fortune TEXT,
        love_fortune TEXT,
        career_fortune TEXT,
        health_fortune TEXT,
        oheng_data JSON,
        ai_raw_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ saju_results 테이블 생성');

    // 5. notifications 테이블 생성
    await db.execute(`
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('result_link', 'delay_notice', 'pdf_complete') NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ notifications 테이블 생성');

    // 6. admins 테이블 생성
    await db.execute(`
      CREATE TABLE admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(100),
        is_active TINYINT(1) DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_username (username),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ admins 테이블 생성');

    // 7. admin_audit_logs 테이블 생성
    await db.execute(`
      CREATE TABLE admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ admin_audit_logs 테이블 생성');

    console.log('✅ 모든 테이블 생성 완료\n');

    // 3. 테이블 확인
    console.log('[3/3] 생성된 테이블 확인 중...');
    const [tables] = await db.execute('SHOW TABLES');
    console.log(`✅ 총 ${tables.length}개 테이블:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n🎉 데이터베이스 초기화 완료!');
    console.log('ℹ️  모든 데이터가 삭제되고 깨끗한 상태로 초기화되었습니다.\n');

  } catch (error) {
    console.error('\n❌ 초기화 실패:', error.message);
    console.error(error);
    throw error;
  } finally {
    await db.end();
  }
}

// 실행
resetDatabase()
  .then(() => {
    console.log('프로세스 종료');
    process.exit(0);
  })
  .catch(err => {
    console.error('에러 발생:', err);
    process.exit(1);
  });
