import db from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetDatabase() {
  console.log('🔄 데이터베이스 초기화 시작...\n');

  try {
    // 1. 모든 테이블 삭제 (외래 키 제약조건 때문에 순서 중요)
    console.log('[1/4] 기존 테이블 삭제 중...');

    // 외래 키 체크 비활성화
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToDrop = [
      'sessions',
      'notifications',
      'saju_results',
      'payments',
      'users',
      'admins'
    ];

    for (const table of tablesToDrop) {
      try {
        await db.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✅ ${table} 테이블 삭제됨`);
      } catch (err) {
        console.log(`  ⚠️  ${table} 테이블 삭제 실패 (존재하지 않을 수 있음)`);
      }
    }

    // 외래 키 체크 재활성화
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ 모든 테이블 삭제 완료\n');

    // 2. schema.sql 실행
    console.log('[2/4] 기본 스키마 생성 중...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // SQL 파일을 세미콜론으로 분리하여 실행
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    for (const statement of statements) {
      if (statement.includes('CREATE DATABASE')) {
        // CREATE DATABASE는 건너뛰기 (이미 존재)
        continue;
      }
      try {
        await db.execute(statement);
      } catch (err) {
        // 이미 존재하는 테이블은 무시
        if (!err.message.includes('already exists')) {
          console.error('SQL 실행 오류:', statement.substring(0, 50) + '...');
          throw err;
        }
      }
    }
    console.log('✅ 기본 스키마 생성 완료\n');

    // 3. admin_schema.sql 실행
    console.log('[3/4] 관리자 스키마 생성 중...');
    const adminSchemaPath = path.join(__dirname, '../database/admin_schema.sql');
    const adminSchemaSql = fs.readFileSync(adminSchemaPath, 'utf8');

    const adminStatements = adminSchemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of adminStatements) {
      try {
        await db.execute(statement);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error('SQL 실행 오류:', statement.substring(0, 50) + '...');
          throw err;
        }
      }
    }
    console.log('✅ 관리자 스키마 생성 완료\n');

    // 4. 테이블 확인
    console.log('[4/4] 생성된 테이블 확인 중...');
    const [tables] = await db.execute('SHOW TABLES');
    console.log(`✅ 총 ${tables.length}개 테이블 생성됨:`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    console.log('\n🎉 데이터베이스 초기화 완료!');
    console.log('ℹ️  모든 데이터가 삭제되고 깨끗한 상태로 초기화되었습니다.\n');

  } catch (error) {
    console.error('\n❌ 초기화 실패:', error.message);
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
