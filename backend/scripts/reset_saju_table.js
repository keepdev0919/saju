import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결 설정
const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saju_db',
    multipleStatements: true
};

async function resetSajuTable() {
    let connection;

    try {
        console.log('🔌 데이터베이스 연결 중...');
        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ 데이터베이스 연결 성공');

        // 1. saju_results 테이블 삭제
        console.log('🗑️  기존 saju_results 테이블 삭제 중...');
        await connection.execute('DROP TABLE IF EXISTS saju_results');
        console.log('✅ 테이블 삭제 완료');

        // 2. schema.sql 읽기
        const schemaPath = join(__dirname, '../database/schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');

        // 3. 스키마 적용 (테이블 재생성)
        console.log('📝 스키마 파일 적용 중...');
        await connection.query(schemaSql);
        console.log('✅ 테이블 재생성 완료');

    } catch (error) {
        console.error('❌ 테이블 초기화 실패:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 데이터베이스 연결 종료');
        }
    }
}

// 스크립트 실행
resetSajuTable()
    .then(() => {
        console.log('✨ 작업 완료: saju_results 테이블이 초기화되었습니다.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ 예상치 못한 오류:', error);
        process.exit(1);
    });
