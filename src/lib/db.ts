import { Pool } from 'pg';

// Log database configuration for debugging (without password)
console.log('Database configuration:', {
  DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
  PGHOST: process.env.PGHOST || 'not set',
  PGPORT: process.env.PGPORT || '5432',
  PGDATABASE: process.env.PGDATABASE || 'not set',
  PGUSER: process.env.PGUSER || 'not set',
  PGPASSWORD: process.env.PGPASSWORD ? 'configured' : 'not configured',
});

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Alternative configuration using individual parameters
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : undefined,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Log successful connection
pool.on('connect', () => {
  console.log('Database pool: client connected');
});

// Helper function to get a client from the pool
export async function getClient() {
  const client = await pool.connect();
  return client;
}

// Helper function for transactions
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Query helper with automatic client management
export async function query(text: string, params?: any[]) {
  const client = await getClient();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export default pool;