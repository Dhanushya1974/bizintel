# Running with Docker

Three services are defined in [`docker-compose.yml`](docker-compose.yml):

| Service    | Image / build        | Port (host) | Notes |
|------------|----------------------|-------------|-------|
| `mysql`    | `mysql:8.4`          | `3306`      | Data persisted in the `mysql_data` volume. `backend/db/init.sql` runs once on first boot. |
| `backend`  | `./backend` (Node 22)| `4000`      | Minimal Express + `mysql2` API — scaffold for the real backend. |
| `frontend` | `.` (TanStack Start) | `3000`      | SSR build via the Nitro `node-server` preset. |

## Quick start

```bash
cp .env.example .env          # optional — sensible defaults are built in
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health  ·  DB check: http://localhost:4000/health/db
- MySQL: `localhost:3306` (user/pass/db from `.env`, default `bizintel` / `bizintelpass` / `bizintel`)

Stop and wipe the database volume:

```bash
docker compose down -v
```

## AI consultant

The consultant page calls `POST /api/consultant` on the backend. To use a real LLM,
set **one** key (host env or `.env`) before `docker compose up`:

```bash
OPENAI_API_KEY=sk-...        # + optional OPENAI_MODEL (default gpt-4o-mini)
# or
ANTHROPIC_API_KEY=sk-ant-... # + optional ANTHROPIC_MODEL (default claude-opus-5)
```

`OPENAI_API_KEY` works with any OpenAI-compatible API — set `OPENAI_BASE_URL` to point
elsewhere, e.g. **OpenRouter**:

```bash
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=minimax/minimax-m3:free   # or another slug
```

Free OpenRouter models are a shared pool and can return HTTP 429; the backend retries
a few times, then falls back to the heuristic for that turn.

With no key set, the backend answers from a data-grounded heuristic (real numbers
from the opportunity data, no external call). If the frontend can't reach the
backend at all, it falls back to the same heuristic client-side ("offline mode").

## Notes

- **`VITE_API_URL`** is baked into the frontend bundle at **build time** (Vite inlines `VITE_*`).
  Change it in `.env` (or `--build-arg`) and rebuild the `frontend` image for it to take effect.
- The backend waits for MySQL to accept connections before it starts listening
  (`waitForDb()` in `backend/src/db.js`), on top of the compose `depends_on: service_healthy`.
- To run just the data + API layer while developing the frontend locally with `npm run dev`:

  ```bash
  docker compose up --build mysql backend
  npm run dev            # frontend on http://localhost:8080/8081
  ```

- The frontend image can also be built on its own:

  ```bash
  docker build -t bizintel-frontend --build-arg VITE_API_URL=http://localhost:4000 .
  docker run --rm -p 3000:3000 bizintel-frontend
  ```
