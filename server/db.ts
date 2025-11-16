// db.ts — Version stable & compatible DigitalOcean

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// SSL configuration
const isLocalhost = process.env.DATABASE_URL.includes("localhost");

// Cloud providers require SSL
const ssl =
  isLocalhost
    ? false
    : { rejectUnauthorized: false };

// Pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

// Drizzle instance
export const db = drizzle(pool, { schema });

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("[DATABASE] ❌ Connection failed:", err.message);
  } else {
    console.log("[DATABASE] ✅ Connected at:", res.rows[0].now);
  }
});