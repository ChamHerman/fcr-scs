const fs = require('fs');
const path = require('path');

// Read root .env and database .env
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../data_layer/database/.env'),
  path.resolve(process.cwd(), '.env')
];

let dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:siewfeng@localhost:5432/fcr_scs_db?schema=public';

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
    if (match) {
      dbUrl = match[1];
      break;
    }
  }
}

let Pool;
try {
  ({ Pool } = require('pg'));
} catch (e) {
  const pgPath = require.resolve('pg', {
    paths: [
      path.resolve(__dirname, '..'),
      path.resolve(__dirname, '../data_layer/database'),
      path.resolve(__dirname, '../business_logic_layer'),
      process.cwd()
    ]
  });
  ({ Pool } = require(pgPath));
}

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

  // Also check if legacy database (fcr_scs_db) exists and clear if reachable
  const altUrl = 'postgresql://postgres:siewfeng@localhost:5432/fcr_scs_db?schema=public';
  if (altUrl !== dbUrl) {
    try {
      await clearDatabase(altUrl);
    } catch (e) {
      // Ignore if legacy DB doesn't exist or unreachable
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});