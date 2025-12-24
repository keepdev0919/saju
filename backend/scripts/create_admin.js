/**
 * 초기 관리자 계정 생성 스크립트
 *
 * 사용법:
 *   node scripts/create_admin.js
 *
 * 환경변수로 설정 가능:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=password node scripts/create_admin.js
 */
import bcrypt from 'bcrypt';
import db from '../src/config/database.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('===========================================');
    console.log('  관리자 계정 생성');
    console.log('===========================================\n');

    // 환경변수에서 값 가져오기 또는 입력 받기
    let username = process.env.ADMIN_USERNAME;
    let password = process.env.ADMIN_PASSWORD;
    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;

    if (!username) {
      username = await question('관리자 아이디: ');
    }

    if (!password) {
      password = await question('비밀번호: ');
    }

    if (!name) {
      name = await question('이름: ');
    }

    if (!email) {
      email = await question('이메일 (선택사항): ');
    }

    // 입력값 검증
    if (!username || !password || !name) {
      console.error('❌ 아이디, 비밀번호, 이름은 필수입니다.');
      process.exit(1);
    }

    if (password.length < 4) {
      console.error('❌ 비밀번호는 최소 4자 이상이어야 합니다.');
      process.exit(1);
    }

    // 중복 확인
    const [existing] = await db.execute(
      `SELECT id FROM admins WHERE username = ?`,
      [username]
    );

    if (existing.length > 0) {
      console.error(`❌ 이미 존재하는 아이디입니다: ${username}`);
      process.exit(1);
    }

    // 비밀번호 해시
    console.log('\n🔐 비밀번호 해싱 중...');
    const passwordHash = await bcrypt.hash(password, 10);

    // 관리자 생성
    const [result] = await db.execute(
      `INSERT INTO admins (username, password_hash, name, email) VALUES (?, ?, ?, ?)`,
      [username, passwordHash, name, email || null]
    );

    console.log('\n✅ 관리자 계정이 생성되었습니다!');
    console.log('===========================================');
    console.log(`   아이디: ${username}`);
    console.log(`   이름: ${name}`);
    console.log(`   이메일: ${email || '(없음)'}`);
    console.log(`   Admin ID: ${result.insertId}`);
    console.log('===========================================\n');
    console.log('💡 이제 이 계정으로 로그인할 수 있습니다.');
    console.log('   POST /api/admin/login\n');

  } catch (error) {
    console.error('❌ 관리자 생성 실패:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// 스크립트 실행
createAdmin();
