# Deploying to Vercel

## Frontend (this repo) — deploys as-is

The TanStack Start app builds to Vercel's Build Output API via the Nitro **`vercel`**
preset (`vite.config.ts` → `nitro.preset`). No extra setup needed.

### One-time import
1. Go to **https://vercel.com/new**
2. **Import Git Repository** → authorize GitHub → pick **`Dhanushya1974/bizintel`**
3. Leave the defaults (Framework: *Other*, Build Command: `vite build`, from `vercel.json`)
4. **Deploy**

Every push to `main` then redeploys automatically.

### Environment variables (Vercel → Project → Settings → Environment Variables)
| Name | Needed? | Value |
|------|---------|-------|
| `VITE_API_URL` | optional | URL of the deployed backend (see below). Baked in at build time — redeploy after changing. |

If `VITE_API_URL` is **not** set, the AI consultant answers from the client-side
data heuristic (no network call). Everything else works fully.

## Backend (`backend/`) — NOT on Vercel

It's a long-running Express server with a persistent MySQL pool — Vercel runs
short-lived serverless functions with no bundled database, so it can't host this
as-is. Deploy it on a platform that runs a Node process + managed MySQL:

- **Railway** / **Render** / **Fly.io** — `Dockerfile` in `backend/` works directly.
- Provision a MySQL database there, then set the backend env vars:
  `DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME`, `CORS_ORIGIN` (your Vercel URL),
  and one of `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`, `OPENAI_MODEL`) or `ANTHROPIC_API_KEY`.
- Run `backend/db/init.sql` once against the database.
- Put that backend's public URL into `VITE_API_URL` on Vercel and redeploy.

Or run the whole stack with `docker compose up` (see `DOCKER.md`).
