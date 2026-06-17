# DataQuery AI

Ask your data anything. Upload Excel/CSV, view it as a spreadsheet, chat with it
in plain English, auto-generate a dashboard, and export the results — built with
**FastAPI + React (Vite)**.

> **Status: Phase 1 (runnable MVP).** Excel/CSV upload, natural-language query,
> auto dashboard, CSV/Excel/PDF export, and JWT auth all work end-to-end. The AI
> query engine runs deterministically with pandas (no API key required) and is
> enhanced with an LLM narrative when `OPENAI_API_KEY` is set. See
> [Roadmap](#roadmap) for what's scaffolded for Phase 2 (PDF/RAG, SQL agent,
> DB connectors, reports, subscriptions).

---

## Quick start (local, no API key needed)

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # defaults to SQLite, no key
uvicorn app.main:app --reload
```
API runs at http://localhost:8000 — docs at http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env                                 # VITE_API_URL=http://localhost:8000
npm run dev
```
App runs at http://localhost:5173

### 3. Try it
1. Sign up at `/signup`.
2. Upload `sample_data/sales.csv` (included).
3. Ask: *"top 5 products"*, *"revenue by region"*, *"average price"*.
4. Click **Generate Dashboard**.
5. Export to CSV / Excel / PDF.

## Enable real AI (optional)
Put a key in `backend/.env`:
```
OPENAI_API_KEY=sk-...
```
The query engine still computes results deterministically (safe, no arbitrary
code execution) and adds an LLM-written narrative on top.

## Docker
```bash
docker compose up --build
```

## Deploy
- **Frontend → Vercel:** root `frontend/`, build `npm run build`, output `dist`.
  Set `VITE_API_URL` to your backend URL.
- **Backend → Railway/Render:** root `backend/`, start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `DATABASE_URL`
  (Postgres), `JWT_SECRET`, `CORS_ORIGINS`, and optionally `OPENAI_API_KEY`.

---

## Roadmap

| Feature | Status |
|---|---|
| Auth (JWT signup/login) | ✅ Done |
| Excel / CSV upload + AG Grid | ✅ Done |
| NL query engine (pandas + optional LLM) | ✅ Done |
| Auto dashboard (KPIs, charts, insights) | ✅ Done |
| Export CSV / Excel / PDF | ✅ Done |
| Query history | ✅ Done |
| PDF chat (RAG + ChromaDB) | 🔜 Phase 2 — `api.js` + endpoints stubbed |
| SQL agent (Postgres/MySQL/Mongo connect) | 🔜 Phase 2 — `api.js` stubbed |
| Report generator (multi-section PDF) | 🔜 Phase 2 |
| Subscriptions (Free/Pro/Enterprise limits) | 🔜 Phase 2 — `plan` field on User |
| LangChain agents, embeddings | 🔜 Phase 2 |

## Structure
```
backend/app/{config,main}.py
backend/app/{database,models,schemas,auth,routers,services,ai}/
frontend/src/{pages,components,charts,contexts,services}/
```
