import mysql from "mysql2/promise";

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER = "bizintel",
  DB_PASSWORD = "bizintelpass",
  DB_NAME = "bizintel",
} = process.env;

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/** Retry until MySQL accepts connections (the container may still be starting). */
export async function waitForDb({ retries = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log(`[db] connected to ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
      return;
    } catch (err) {
      console.warn(`[db] not ready (attempt ${attempt}/${retries}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("[db] could not connect after maximum retries");
}
