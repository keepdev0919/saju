
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'saju_db',
    port: process.env.DB_PORT || 3306
};

async function addIndexIfNotExists(connection, tableName, indexName, columnNames) {
    try {
        // 인덱스 존재 여부 확인
        const [rows] = await connection.execute(
            `SELECT COUNT(1) IndexIsThere 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE table_schema = DATABASE() 
       AND table_name = ? 
       AND index_name = ?`,
            [tableName, indexName]
        );

        if (rows[0].IndexIsThere === 0) {
            console.log(`➕ 인덱스 추가 중: ${indexName} (${columnNames})`);
            await connection.execute(`CREATE INDEX ${indexName} ON ${tableName} (${columnNames})`);
            console.log(`✅ 인덱스 추가 완료: ${indexName}`);
        } else {
            console.log(`ℹ️ 이미 존재하는 인덱스: ${indexName}`);
        }
    } catch (error) {
        console.error(`❌ 인덱스 추가 실패 (${indexName}):`, error.message);
    }
}

async function migrate() {
    let connection;
    try {
        console.log('🚀 성능 최적화 인덱스 마이그레이션 시작...');
        connection = await mysql.createConnection(dbConfig);

        // users 테이블 인덱스 추가
        await addIndexIfNotExists(connection, 'users', 'idx_name', 'name');
        await addIndexIfNotExists(connection, 'users', 'idx_created_at', 'created_at');

        console.log('🎉 모든 성능 인덱스 작업이 완료되었습니다.');
    } catch (error) {
        console.error('❌ 마이그레이션 중 치명적 오류:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrate();
