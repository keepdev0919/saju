/**
 * payments 테이블에 refunded_at 컬럼 추가 마이그레이션
 */
import db from '../src/config/database.js';

async function migrate() {
  try {
    console.log('🔄 마이그레이션 시작: payments 테이블에 refunded_at 컬럼 추가');

    // 컬럼이 이미 존재하는지 확인
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND COLUMN_NAME = 'refunded_at'
    `);

    if (columns.length > 0) {
      console.log('⚠️  refunded_at 컬럼이 이미 존재합니다. 마이그레이션 스킵.');
      process.exit(0);
    }

    // refunded_at 컬럼 추가
    await db.execute(`
      ALTER TABLE payments
      ADD COLUMN refunded_at TIMESTAMP NULL AFTER paid_at
    `);

    console.log('✅ 마이그레이션 완료: refunded_at 컬럼이 추가되었습니다.');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

migrate();
