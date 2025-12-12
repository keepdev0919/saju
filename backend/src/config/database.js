/**
 * MySQL 데이터베이스 연결 설정
 * 커넥션 풀을 사용하여 여러 요청을 효율적으로 처리
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 커넥션 풀 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saju_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * 데이터베이스 연결 테스트
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    return false;
  }
}

export default pool;

