/**
 * users 테이블에 is_leap 컬럼 추가
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saju_db'
  });

  try {
    console.log('🔄 users 테이블 스키마 업데이트 시작...');

    // is_leap 컬럼 추가 (TINYINT 1: true, 0: false)
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN is_leap TINYINT(1) DEFAULT 0 COMMENT '음력 윤달 여부 (1: 윤달, 0: 평달)' 
      AFTER calendar_type
    `);

    console.log('✅ is_leap 컬럼 추가 완료');

  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('ℹ️ 이미 is_leap 컬럼이 존재합니다.');
    } else {
      console.error('❌ 스키마 업데이트 실패:', error);
    }
  } finally {
    await connection.end();
  }
}

updateSchema();

