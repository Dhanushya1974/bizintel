import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool, waitForDb } from "./db.js";
import { chat } from "./consultant.js";
import { resolveMapsLink, geocode, nearby, siteScore } from "./geo.js";
import { requestLoginCode, verifyLoginCode } from "./auth.js";

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  "http://localhost:3000,http://localhost:8080,http://localhost:8081";

// CORS_ORIGIN="*" reflects any origin (handy for tunnels / demos); otherwise it's
// a comma-separated allow-list.
const corsOrigin =
  CORS_ORIGIN.trim() === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim());

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// --- health ---------------------------------------------------------------
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/health/db", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows[0].ok === 1 });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

// --- sample API (placeholder until the real backend is built) -------------
app.get("/api/opportunities", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, category, score FROM opportunities ORDER BY score DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/leads", async (req, res) => {
  const { email, idea, city, pincode } = req.body ?? {};
  if (!email) return res.status(400).json({ message: "email is required" });
  try {
    const [result] = await pool.execute(
      "INSERT INTO leads (email, idea, city, pincode) VALUES (?, ?, ?, ?)",
      [email, idea ?? null, city ?? null, pincode ?? null],
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- auth: email verification codes --------------------------------------
app.post("/api/auth/request-code", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "email is required" });
  }
  try {
    await requestLoginCode(email.trim().toLowerCase());
    res.json({ sent: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

app.post("/api/auth/verify-code", async (req, res) => {
  const { email, code } = req.body ?? {};
  if (!email || !code) {
    return res.status(400).json({ message: "email and code are required" });
  }
  try {
    verifyLoginCode(email.trim().toLowerCase(), String(code).trim());
    res.json({ verified: true });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});

// --- AI consultant ------------------------------------------------------
app.post("/api/consultant", async (req, res) => {
  const { messages = [], context = {} } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages[] is required" });
  }
  const clean = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20);
  try {
    const out = await chat(clean, context);
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- geolocation ------------------------------------------------------
app.post("/api/resolve-maps-link", async (req, res) => {
  const { maps_link: mapsLink } = req.body ?? {};
  try {
    res.json(await resolveMapsLink(mapsLink));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

app.post("/api/geocode", async (req, res) => {
  const { city, pincode, state, country } = req.body ?? {};
  try {
    res.json(await geocode({ city, pincode, state, country }));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

app.get("/api/nearby", async (req, res) => {
  try {
    res.json(await nearby(req.query));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

app.get("/api/site-score", async (req, res) => {
  try {
    res.json(await siteScore(req.query));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

// --- boot ---------------------------------------------------------------
app.listen(PORT, () => console.log(`[api] listening on http://0.0.0.0:${PORT}`));

// Connect to MySQL in the background — DB-backed routes fail gracefully until it's up.
waitForDb().catch((err) => console.error(`[db] ${err.message}`));
