# MIDAS Laptop Integration Check

1. Start FastAPI on port 8000.
2. Open `http://localhost:8000/api/health` — must return `status=ok`.
3. Open `http://localhost:8000/docs` — Swagger must load.
4. Start Next.js on port 3000.
5. Command page: NIFTY snapshot should populate.
6. Market page: volume/value tables should populate.
7. Market page: NIFTY intraday chart should attempt `/api/market/nifty/intraday`.
8. Alerts page: first-seen events should render when the backend alert store contains events.
9. Confluence page remains the next module to connect fully.
10. Only after these pass should we connect Dropbox/live CSV synchronization and test during market hours.
