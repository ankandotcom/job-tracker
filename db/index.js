import pg from 'pg';

const { Pool } = pg;

// Neon requires SSL connections. We conditionally handle rejectUnauthorized: false 
// to prevent local TLS certification handshake issues during development.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: isProduction ? true : false,
  }
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err);
  process.exit(-1);
});

// Optional: Quick boot confirmation log to verify your cloud migration worked
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to database instance:', err.message);
  } else {
    console.log('🚀 Successfully connected to Postgres via pooling layer.');
  }
});

export default pool;