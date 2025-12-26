import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse connection string payload
// Expected format: postgresql://postgres:[$DallasTexas21]@db.ref.supabase.co:5432/postgres
// We need to strip the brackets from the password if they exist
const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
}

// Clean up password if it has brackets
let connectionString = rawConnectionString;
if (rawConnectionString.includes(':[') && rawConnectionString.includes(']@')) {
    connectionString = rawConnectionString.replace(/:\[(.*?)]@/, ':$1@');
    console.log('Detected brackets in password. Stripping them for connection...');
}

const client = new pg.Client({
    connectionString: connectionString,
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database successfully.');

        const sqlPath = path.join(__dirname, '../supabase/migrations/01_initial_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying migration...');
        await client.query(sql);
        console.log('Migration applied successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
