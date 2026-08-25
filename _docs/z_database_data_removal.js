// How to Run:
// 1. Open CMD / GitBash
// 2. cd "D:\Siew Feng\CD_Assignment\_docs"
// 3. node z_database_data_removal.js

const fs = require('fs');
const path = require('path');

// Read root .env and database .env
const rootEnvPath = path.resolve('d:/Siew Feng/CD_Assignment/.env');
let dbUrl = 'postgresql://postgres:siewfeng@localhost:5432/fcr_scs_db?schema=public';

if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, 'utf8');
  const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (match) {
    dbUrl = match[1];
  }
}

const pgPath = require.resolve('pg', {
  paths: [
    'd:/Siew Feng/CD_Assignment/business_logic_layer/compensation_management_service',
    'd:/Siew Feng/CD_Assignment/data_layer/database',
    'd:/Siew Feng/CD_Assignment'
  ]
});
const { Pool } = require(pgPath);

async function clearDatabase(connectionString) {
  console.log(`Connecting to: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT IN ('_prisma_migrations');
    `);
    
    const tables = res.rows.map(r => `"${r.tablename}"`);
    console.log(`Found ${tables.length} tables to truncate:`, tables.join(', '));
    
    if (tables.length > 0) {
      await client.query('BEGIN');
      await client.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE;`);
      await client.query('COMMIT');
      console.log('Successfully truncated all tables in database!');
    } else {
      console.log('No tables found to truncate.');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error truncating tables:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  // Clear the main database in root .env
  await clearDatabase(dbUrl);

  // Also check if fcr_scs database exists and clear if reachable
  const altUrl = 'postgresql://postgres:siewfeng@localhost:5432/fcr_scs?schema=public';
  try {
    await clearDatabase(altUrl);
  } catch (e) {
    // Ignore if alternate DB doesn't exist
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});