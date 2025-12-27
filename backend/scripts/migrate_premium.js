import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migratePremium() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🚀 프리미엄 기능 마이그레이션 시작...');

    // 1. payments 테이블 수정
    try {
      await connection.execute(`
        ALTER TABLE payments
        ADD COLUMN payment_type ENUM('basic', 'premium')
        DEFAULT 'basic'
        AFTER status
      `);
      console.log('✅ payments.payment_type 컬럼 추가 완료');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  payments.payment_type 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    // 2. saju_results.custom_hanja_name 컬럼 추가 (테이블 끝에 추가)
    try {
      await connection.execute(`
        ALTER TABLE saju_results
        ADD COLUMN custom_hanja_name VARCHAR(10)
        DEFAULT NULL
        AFTER deleted_at
      `);
      console.log('✅ saju_results.custom_hanja_name 컬럼 추가 완료');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  saju_results.custom_hanja_name 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    // 3. saju_results.is_premium 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE saju_results
        ADD COLUMN is_premium BOOLEAN
        DEFAULT FALSE
        AFTER custom_hanja_name
      `);
      console.log('✅ saju_results.is_premium 컬럼 추가 완료');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  saju_results.is_premium 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    console.log('🎉 프리미엄 기능 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migratePremium().catch(console.error);
