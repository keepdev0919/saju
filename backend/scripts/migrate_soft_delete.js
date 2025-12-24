
import db from '../src/config/database.js';

async function migrateSoftDelete() {
    console.log('🚀 Starting Soft Delete Migration...');

    const tables = ['users', 'payments', 'saju_results'];

    try {
        for (const table of tables) {
            console.log(`Checking table: ${table}...`);

            // Check if column exists
            const [columns] = await db.execute(
                `SHOW COLUMNS FROM ${table} LIKE 'deleted_at'`
            );

            if (columns.length === 0) {
                console.log(`Adding deleted_at to ${table}...`);
                await db.execute(
                    `ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL`
                );
                await db.execute(
                    `CREATE INDEX idx_${table}_deleted_at ON ${table} (deleted_at)`
                );
                console.log(`✅ ${table} upgraded.`);
            } else {
                console.log(`ℹ️ ${table} already has deleted_at.`);
            }
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateSoftDelete();
