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

// Validate and prepare connection string
function prepareConnectionString(rawUrl: string): { url: string; isLocalhost: boolean; isSupabase: boolean } {
  const isLocalhost = rawUrl.includes('localhost');
  const isSupabase = rawUrl.includes('supabase.co');
  
  // Reject transaction pooler URLs (pgbouncer) - not compatible with migrations
  if (rawUrl.includes('pgbouncer=true') || rawUrl.includes(':6543')) {
    throw new Error(
      'Transaction pooler connection detected. Use the regular connection string (port 5432) instead of the transaction pooler (port 6543).'
    );
  }
  
  let url = rawUrl;
  
  // For cloud deployments (not localhost), ensure SSL is enabled
  if (!isLocalhost) {
    // Remove any existing sslmode parameter
    url = url.replace(/[?&]sslmode=[^&]*/g, '');
    // Add sslmode=require
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sslmode=require`;
    console.log('[DATABASE] 🔒 SSL/TLS enabled for cloud deployment');
  }
  
  return { url, isLocalhost, isSupabase };
}

// Detect if we're using Neon (WebSocket) or standard PostgreSQL (TCP)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || 
                       process.env.DATABASE_URL.includes('neon.database');

let pool: any;
let db: any;

if (isNeonDatabase) {
  // Use Neon serverless driver for Neon databases
  neonConfig.webSocketConstructor = ws;
  
  const { url } = prepareConnectionString(process.env.DATABASE_URL);
  pool = new NeonPool({ connectionString: url });
  db = neonDrizzle({ client: pool, schema });
  
  console.log('[DATABASE] Using Neon WebSocket driver');
} else {
  // Use standard PostgreSQL driver for Supabase, Render, and other providers
  const { url, isLocalhost, isSupabase } = prepareConnectionString(process.env.DATABASE_URL);
  
  // Configure SSL based on environment
  let sslConfig: any = false;
  if (!isLocalhost) {
    // For Supabase and other cloud providers:
    // Use 'require' mode which allows self-signed certificates
    // This is more compatible than rejectUnauthorized: false
    sslConfig = 'require';
    console.log('[DATABASE] SSL mode: require (compatible with Supabase/cloud providers)');
  }
    
  pool = new PgPool({ 
    connectionString: url,
    ssl: sslConfig
  });
  db = pgDrizzle({ client: pool, schema });
  
  console.log(`[DATABASE] Using standard PostgreSQL driver${isSupabase ? ' (Supabase)' : ''}`);
  console.log('[DATABASE] SSL enabled:', !isLocalhost);
  
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
