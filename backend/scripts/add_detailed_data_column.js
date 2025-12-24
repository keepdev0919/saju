/**
 * 데이터베이스 스키마 업데이트 스크립트
 * detailed_data 컬럼 추가
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saju_db',
  multipleStatements: true
};

async function updateSchema() {
  let connection;
  
  try {
    console.log('🔌 데이터베이스 연결 중...');
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // detailed_data 컬럼이 이미 있는지 확인
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'saju_results' 
       AND COLUMN_NAME = 'detailed_data'`,
      [connectionConfig.database]
    );

    if (columns.length > 0) {
      console.log('ℹ️  detailed_data 컬럼이 이미 존재합니다.');
      return;
    }

    // 컬럼 추가
    console.log('📝 detailed_data 컬럼 추가 중...');
    await connection.execute(
      `ALTER TABLE saju_results 
       ADD COLUMN detailed_data JSON COMMENT 'AI 상세 해석 데이터 (JSON 형식)' 
       AFTER ai_raw_response`
    );

    console.log('✅ 스키마 업데이트 완료!');
    console.log('   - detailed_data 컬럼이 추가되었습니다.');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  detailed_data 컬럼이 이미 존재합니다.');
    } else {
      console.error('❌ 스키마 업데이트 실패:', error.message);
      console.error('   에러 코드:', error.code);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

updateSchema()
  .then(() => {
    console.log('✨ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });

