# MIDAS Next.js Frontend — Stage 6

Stage 6 completes the primary API-backed terminal modules.

Connected:
- Command Center
- Confluence Radar
- Market Activity + NIFTY intraday
- Sector Rotation / 21-sector view
- Breadth & Internals
- Global Alert Tape
- Admin operational controls

Backend: MIDAS FastAPI Stage 8.
Frontend remains a separate application.
Frozen Streamlit app remains the functional reference.

Run:
1. Start FastAPI on port 8000.
2. `npm install`
3. `$env:NEXT_PUBLIC_API_BASE="http://localhost:8000"`
4. `npm run dev`
5. Open http://localhost:3000

Important: admin POST actions require a valid admin bearer token.
