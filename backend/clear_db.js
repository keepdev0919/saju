
import db from './src/config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function clearDatabase() {
    try {
        console.log('🗑️ 데이터베이스 초기화 시작...');

        // 순서 중요: 외래 키 제약 조건 때문에 자식 테이블부터 삭제
        await db.execute('DELETE FROM payments');
        console.log('✅ payments 테이블 비움');

        await db.execute('DELETE FROM saju_results');
        console.log('✅ saju_results 테이블 비움');

        await db.execute('DELETE FROM users');
        console.log('✅ users 테이블 비움');

        console.log('🎉 모든 데이터가 삭제되었습니다. 깨끗한 상태로 테스트 가능합니다!');
        process.exit(0);
    } catch (err) {
        console.error('❌ 데이터 삭제 실패:', err);
        process.exit(1);
    }
}

clearDatabase();
