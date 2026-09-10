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
      await ensureSchema();
      return;
    } catch (err) {
      console.warn(`[db] not ready (attempt ${attempt}/${retries}): ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error("[db] could not connect after maximum retries");
}

/**
 * Idempotent schema + seed. `db/init.sql` only runs on a container's first boot,
 * so this also creates/seeds the base tables — a fresh managed MySQL (Railway,
 * Aiven, TiDB…) then needs no manual SQL step.
 */
export async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      cache_key  VARCHAR(255) NOT NULL PRIMARY KEY,
      lat        DOUBLE NOT NULL,
      lng        DOUBLE NOT NULL,
      label      VARCHAR(512),
      source     VARCHAR(40),
      city       VARCHAR(120),
      state      VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  // add city/state to a geocode_cache that predates them (no ADD COLUMN IF NOT EXISTS in MySQL)
  const [gc] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'geocode_cache'`,
  );
  const gcCols = new Set(gc.map((r) => r.COLUMN_NAME));
  if (!gcCols.has("city")) await pool.query(`ALTER TABLE geocode_cache ADD COLUMN city VARCHAR(120)`);
  if (!gcCols.has("state")) await pool.query(`ALTER TABLE geocode_cache ADD COLUMN state VARCHAR(120)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nearby_cache (
      cache_key  VARCHAR(255) NOT NULL PRIMARY KEY,
      payload    JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email      VARCHAR(255) NOT NULL UNIQUE,
      name       VARCHAR(255),
      mode       ENUM('own-idea','ai') DEFAULT 'ai',
      idea       VARCHAR(500),
      category   VARCHAR(120),
      budget     VARCHAR(60),
      country    VARCHAR(120),
      state      VARCHAR(120),
      city       VARCHAR(120),
      pincode    VARCHAR(20),
      plan       VARCHAR(40) DEFAULT 'explorer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id                VARCHAR(40) NOT NULL PRIMARY KEY,
      name              VARCHAR(255) NOT NULL,
      category          VARCHAR(120) NOT NULL,
      score             TINYINT UNSIGNED NOT NULL,
      confidence        ENUM('High','Medium','Low') DEFAULT 'Medium',
      demand            TINYINT UNSIGNED,
      competition       TINYINT UNSIGNED,
      investment_min    INT UNSIGNED,
      investment_max    INT UNSIGNED,
      break_even_months TINYINT UNSIGNED,
      rationale         TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email      VARCHAR(255) NOT NULL,
      idea       VARCHAR(500),
      city       VARCHAR(120),
      pincode    VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    INSERT INTO opportunities
      (id, name, category, score, confidence, demand, competition, investment_min, investment_max, break_even_months, rationale)
    VALUES
      ('opp-1','Specialty Coffee & Bakery','Food & Beverage',87,'High',82,34,120000,210000,14,
       'Dense residential foot traffic, above-median household income, and only two comparable operators within a 6-minute walk.'),
      ('opp-2','Boutique Pilates Studio','Health & Wellness',81,'High',74,41,180000,260000,18,
       'Strong 25-44 female demographic, wellness search intent up 38% YoY, no premium boutique studio within 1.5 miles.'),
      ('opp-3','Neighborhood Wine Bar','Food & Beverage',74,'Medium',66,52,220000,340000,22,
       'Evening foot traffic strong, but three established wine bars nearby. Differentiation on food and events required.'),
      ('opp-4','Pet Daycare & Grooming','Consumer Services',69,'Medium',71,58,95000,165000,20,
       'High pet-ownership index, limited grooming supply, but requires 3,500+ sq ft with outdoor access.'),
      ('opp-5','Fast-Casual Poke Bowls','Food & Beverage',58,'Low',54,71,140000,220000,26,
       'Category is crowded within a 1-mile radius. Consider adjacent white-space or brand differentiation.')
    AS new
    ON DUPLICATE KEY UPDATE name = new.name, category = new.category, score = new.score
  `);
}

export async function getCachedGeocode(key) {
  try {
    const [rows] = await pool.query(
      "SELECT lat, lng, label, source, city, state FROM geocode_cache WHERE cache_key = ?",
      [key],
    );
    if (!rows.length) return null;
    const r = rows[0];
    const out = { latitude: r.lat, longitude: r.lng, label: r.label, source: r.source };
    if (r.city || r.state) out.address = { city: r.city || null, state: r.state || null, country: null };
    return out;
  } catch {
    return null;
  }
}

export async function putCachedGeocode(key, v) {
  await pool.execute(
    `INSERT INTO geocode_cache (cache_key, lat, lng, label, source, city, state)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE lat = VALUES(lat), lng = VALUES(lng), label = VALUES(label),
       source = VALUES(source), city = VALUES(city), state = VALUES(state)`,
    [key, v.latitude, v.longitude, v.label ?? null, v.source ?? null, v.address?.city ?? null, v.address?.state ?? null],
  );
}

export async function getCachedNearby(key, maxAgeDays = 7) {
  try {
    const [rows] = await pool.query(
      `SELECT payload FROM nearby_cache WHERE cache_key = ? AND created_at > (NOW() - INTERVAL ? DAY)`,
      [key, maxAgeDays],
    );
    if (!rows.length) return null;
    return typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
  } catch {
    return null;
  }
}

export async function putCachedNearby(key, value) {
  await pool.execute(
    `INSERT INTO nearby_cache (cache_key, payload, created_at) VALUES (?, CAST(? AS JSON), NOW())
     ON DUPLICATE KEY UPDATE payload = VALUES(payload), created_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}
