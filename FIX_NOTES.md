# MIDAS Frontend Stage 9.3

## Fix
- GET API calls no longer send `Content-Type: application/json`, avoiding unnecessary CORS preflight behavior.
- API base defaults to `http://127.0.0.1:8000` and removes trailing slash.
- API errors now include response status/body details.
- Command Center displays a visible backend error instead of silently failing.
- Dark-only UI retained; no Light/Dark theme toggle.

## Preserved
- Stage 9.2 pages and functionality.
- Confluence charts and TradingView links.
- Market Activity and Dual Leader highlighting.
- Sector drill-down.
- Breadth, Alerts, Admin.
