// Database connection setup - supports both Neon WebSocket and standard PostgreSQL
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon (WebSocket) or standard PostgreSQL (TCP)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                       process.env.DATABASE_URL.includes('neon.database');

let pool: any;
let db: any;

if (isNeonDatabase) {
  // Use Neon serverless driver for Neon databases
  const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.default;
  
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-serverless');
  db = neonDrizzle({ client: pool, schema });
  
  console.log('[DATABASE] Using Neon WebSocket driver');
} else {
  // Use standard PostgreSQL driver for Render and other providers
  const { Pool: PgPool } = await import('pg');
  const { drizzle: pgDrizzle } = await import('drizzle-orm/node-postgres');
  
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  db = pgDrizzle({ client: pool, schema });
  
  console.log('[DATABASE] Using standard PostgreSQL driver');
  
  // Add error listener for diagnostics
  pool.on('error', (err: Error) => {
    console.error('[DATABASE] Unexpected pool error:', err);
  });
}

// Test connection on startup
pool.query('SELECT NOW()', (err: Error | null, res: any) => {
  if (err) {
    console.error('[DATABASE] Connection test failed:', err.message);
  } else {
    console.log('[DATABASE] Connection successful at', res.rows[0].now);
  }
});

export { pool, db };
