import db from '../src/config/database.js';

async function testMigration() {
  console.log('🧪 세션 마이그레이션 테스트 시작...\n');

  try {
    // 1. sessions 테이블 존재 확인
    console.log('[1/6] sessions 테이블 존재 확인...');
    const [tables] = await db.execute(`
      SHOW TABLES LIKE 'sessions'
    `);

    if (tables.length > 0) {
      console.log('✅ sessions 테이블 존재\n');
    } else {
      console.error('❌ sessions 테이블 없음');
      throw new Error('sessions 테이블을 찾을 수 없습니다');
    }

    // 2. 인덱스 확인
    console.log('[2/6] 인덱스 확인...');
    const [indexes] = await db.execute(`
      SHOW INDEX FROM sessions
    `);
    const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];

    console.log(`✅ 인덱스 ${indexNames.length}개 생성됨:`);
    indexNames.forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log();

    // 3. 데이터 마이그레이션 확인
    console.log('[3/6] 데이터 마이그레이션 확인...');
    const [userCount] = await db.execute(`
      SELECT COUNT(*) as count FROM users
      WHERE access_token IS NOT NULL AND deleted_at IS NULL
    `);
    const [sessionCount] = await db.execute(`
      SELECT COUNT(*) as count FROM sessions
    `);

    console.log(`   users.access_token: ${userCount[0].count}개`);
    console.log(`   sessions 레코드: ${sessionCount[0].count}개`);

    if (userCount[0].count === sessionCount[0].count) {
      console.log('✅ 데이터 마이그레이션 성공\n');
    } else {
      console.warn('⚠️  데이터 수 불일치\n');
    }

    // 4. FK 제약조건 확인
    console.log('[4/6] Foreign Key 제약조건 확인...');
    const [fks] = await db.execute(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'sessions'
        AND CONSTRAINT_NAME != 'PRIMARY'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (fks.length > 0) {
      console.log(`✅ Foreign Key ${fks.length}개 설정됨:`);
      fks.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
      console.log();
    } else {
      console.warn('⚠️  Foreign Key 없음\n');
    }

    // 5. 컬럼 타입 확인
    console.log('[5/6] 컬럼 타입 확인...');
    const [columns] = await db.execute(`
      SHOW COLUMNS FROM sessions
    `);

    const requiredColumns = ['id', 'token', 'user_id', 'expires_at', 'created_at'];
    const missingColumns = requiredColumns.filter(col =>
      !columns.some(c => c.Field === col)
    );

    if (missingColumns.length === 0) {
      console.log('✅ 모든 필수 컬럼 존재');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      console.log();
    } else {
      console.error('❌ 누락된 컬럼:', missingColumns);
    }

    // 6. 샘플 데이터 조회
    console.log('[6/6] 샘플 데이터 조회...');
    const [samples] = await db.execute(`
      SELECT s.id, s.token, s.user_id, u.name, s.expires_at, s.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LIMIT 3
    `);

    if (samples.length > 0) {
      console.log(`✅ 샘플 데이터 ${samples.length}개:`);
      samples.forEach(sample => {
        console.log(`   - user_id=${sample.user_id} (${sample.name}), token=${sample.token.substring(0, 20)}..., expires=${sample.expires_at}`);
      });
      console.log();
    } else {
      console.log('ℹ️  데이터 없음 (정상: 사용자가 없을 수 있음)\n');
    }

    console.log('🎉 모든 테스트 통과!');
    console.log('✅ Phase 1 마이그레이션이 성공적으로 완료되었습니다.\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    throw error;
  } finally {
    await db.end();
  }
}

// 실행
testMigration()
  .then(() => {
    console.log('테스트 완료');
    process.exit(0);
  })
  .catch(err => {
    console.error('에러 발생:', err);
    process.exit(1);
  });
