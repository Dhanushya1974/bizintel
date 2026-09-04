# bizintel-backend

Minimal Node.js API scaffold (Express + `mysql2`). Replace the placeholder routes
in `src/server.js` as the real backend is built.

## Endpoints

| Method | Path                  | Purpose |
|--------|-----------------------|---------|
| GET    | `/health`             | Liveness. |
| GET    | `/health/db`          | Runs `SELECT 1` against MySQL. |
| GET    | `/api/opportunities`  | Reads the `opportunities` table (seeded by `db/init.sql`). |
| POST   | `/api/leads`          | `{ email, idea, city, pincode }` → inserts a row into `leads`. |
| POST   | `/api/consultant`     | `{ messages: [{role,content}], context }` → `{ text, provider }`. Uses OpenAI or Anthropic when a key is set, else a data-grounded heuristic. |

## Local dev (without Docker)

```bash
cd backend
cp .env.example .env      # point DB_HOST at 127.0.0.1 if MySQL runs on the host
npm install
npm run dev
```

## Env

See `.env.example`. In Docker these come from `docker-compose.yml`.
