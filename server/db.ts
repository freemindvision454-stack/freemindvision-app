// Database connection setup - supports both Neon WebSocket and standard PostgreSQL
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from 'ws';
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
  neonConfig.webSocketConstructor = ws;
  
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool, schema });
  
  console.log('[DATABASE] Using Neon WebSocket driver');
} else {
  // Use standard PostgreSQL driver for Render and other providers
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
