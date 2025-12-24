import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function findToken() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute(`
            SELECT u.name, u.access_token, p.status, p.amount 
            FROM users u
            JOIN payments p ON u.id = p.user_id
            WHERE p.status = 'paid'
            ORDER BY p.created_at DESC
            LIMIT 1
        `);

        if (rows.length > 0) {
            console.log('✅ Found Paid User:');
            console.log(`Name: ${rows[0].name}`);
            console.log(`Token: ${rows[0].access_token}`);
            console.log(`Payment: ${rows[0].amount} KRW (${rows[0].status})`);
            console.log('\nUse this URL:');
            console.log(`http://localhost:5173/result/${rows[0].access_token}`);
        } else {
            console.log('❌ No paid users found. Falling back to ANY user with a result...');
            const [anyRows] = await connection.execute(`
                SELECT u.name, u.access_token 
                FROM users u
                JOIN saju_results r ON u.id = r.user_id
                LIMIT 1
            `);
            if (anyRows.length > 0) {
                console.log('✅ Found User with Result (Payment status unknown):');
                console.log(`Name: ${anyRows[0].name}`);
                console.log(`Token: ${anyRows[0].access_token}`);
                console.log('\nUse this URL:');
                console.log(`http://localhost:5173/result/${anyRows[0].access_token}`);
            } else {
                console.log('❌ No users with results found.');
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

findToken();
