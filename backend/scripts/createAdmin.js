
import db from '../src/config/database.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// .env 로드 (ES Module 환경에서 __dirname 사용 불가)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function createAdmin() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: node scripts/createAdmin.js <username> <password> [name] [email]');
        console.log('Example: node scripts/createAdmin.js admin2 1234 "부관리자" "admin2@example.com"');
        process.exit(1);
    }

    const [username, password, name = '관리자', email = ''] = args;

    try {
        // 중복 체크
        const [existing] = await db.query('SELECT id FROM admins WHERE username = ?', [username]);
        if (existing.length > 0) {
            console.error(`❌ Error: Username '${username}' already exists.`);
            process.exit(1);
        }

        // 비밀번호 해싱
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // DB 삽입
        await db.query(
            `INSERT INTO admins (username, password_hash, name, email, is_active) VALUES (?, ?, ?, ?, 1)`,
            [username, hashedPassword, name, email]
        );

        console.log('✅ Admin created successfully!');
        console.log(`👤 Username: ${username}`);
        console.log(`🔑 Password: ${password}`); // 보여주고 끝냄 (보안상 저장은 안 함)
        console.log(`📛 Name: ${name}`);

    } catch (error) {
        console.error('❌ Failed to create admin:', error);
    } finally {
        db.end(); // 연결 종료
        process.exit(0);
    }
}

createAdmin();
