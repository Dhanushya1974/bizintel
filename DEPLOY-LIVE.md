# Making BizIntel live

Two hosts: **frontend on Vercel** (free), **backend + MySQL on Railway** (~$5/mo of
usage after the trial credit; alternatives below). The frontend still works if the
backend is down — the AI consultant and the location features fall back to model
estimates — so deploy order doesn't matter much.

> **Security note:** auth is client-side only (any email "signs in", data lives in
> the browser's `localStorage`). Fine for a public demo, **not** for real user data.
> Add real auth before treating this as production.

---

## 0. Push the current code to GitHub

The repo already points at `https://github.com/Dhanushya1974/bizintel`.

```bash
git add -A
git commit -m "Live data layer (geolocation) + deploy config"
git push
```

---

## 1. Backend + MySQL on Railway

1. Go to **https://railway.com** → sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick **`Dhanushya1974/bizintel`**.
3. On the created service → **Settings**:
   - **Root Directory**: `backend`
   - Build: it auto-detects `backend/Dockerfile` (Builder = Dockerfile). Leave the rest.
4. In the same project: **New** → **Database** → **Add MySQL**.
5. Back on the **backend service** → **Variables** → add:

   | Variable | Value |
   |---|---|
   | `PORT` | `4000` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL once you have it (e.g. `https://bizintel.vercel.app`) — or `*` to start |
   | `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_USER` | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
   | `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |

   Optional AI consultant: `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`, `OPENAI_MODEL`) or `ANTHROPIC_API_KEY`.
6. **Settings → Networking → Generate Domain**. Note the URL, e.g.
   `https://bizintel-backend-production.up.railway.app`.
7. The backend **self-creates and seeds every table** on first boot (`ensureSchema()` in
   `backend/src/db.js`) — no manual `init.sql` step.
8. Check `https://<backend-url>/health` → `{"status":"ok"}` and `/health/db` → `{"db":true}`.

## 2. Frontend on Vercel

1. Go to **https://vercel.com/new** → import **`Dhanushya1974/bizintel`**.
2. Framework preset: **Other**. Build command `vite build`, output handled by
   `vercel.json` + the Nitro `vercel` preset — leave defaults.
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | your Railway backend URL from step 1.6 (no trailing slash) |

   `VITE_*` is inlined at **build time** — after changing it you must **redeploy**.
4. **Deploy**. You get `https://<project>.vercel.app`.

## 3. Close the loop

1. Railway → backend **Variables** → set `CORS_ORIGIN` to the exact Vercel URL
   (`https://<project>.vercel.app`, no trailing slash). Backend redeploys.
2. Open the Vercel URL → "Or explore with the demo account →".
3. Every `git push` to `main` now redeploys both.

---

## Alternatives

- **Backend host**: Render (Docker web service; use an external MySQL — Aiven free
  trial or TiDB Cloud Serverless free tier) · Fly.io (`fly launch` in `backend/`,
  MySQL via a separate app or external).
- **MySQL only** (if the host has no managed MySQL): **TiDB Cloud Serverless**
  (MySQL-compatible, generous free tier) or **Aiven** (free trial). Set the five
  `DB_*` vars to that database's credentials.
- **Whole stack on one box**: any VPS with Docker → `docker compose up -d --build`
  (see `DOCKER.md`), then put a reverse proxy / Cloudflare in front.

## Quick temporary link (no accounts)

From the repo root with the Docker stack running:

```bash
# backend tunnel
.tools/cloudflared.exe tunnel --url http://localhost:4000
# -> note the https URL, put it in .env as VITE_API_URL, set CORS_ORIGIN=*
docker compose up -d --build backend frontend
# frontend tunnel
.tools/cloudflared.exe tunnel --url http://localhost:3000
```

The `*.trycloudflare.com` URLs last only while `cloudflared` and this machine stay on,
and change on restart.
