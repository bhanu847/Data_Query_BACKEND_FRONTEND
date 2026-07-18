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

## Excel Live add-in (local dev)

Excel Live lets the AI work on the workbook you already have open in Microsoft
Excel via a chat sidebar (Office Add-in), instead of uploading a file. It's a
sibling project at `./excel-addin` with its own `package.json` — it does not
share a build with `frontend/`.

Requirements: a real `OPENAI_API_KEY` set in `backend/.env` (Excel Live uses
OpenAI tool/function calling — the deterministic pandas engine used by the
other tools doesn't apply here), and Node 18+.

The add-in's task pane sign-in is a plain email/password form built into the
sidebar itself — there is **no separate sign-in popup**. An earlier version
used the Office Dialog API for this (opening a popup that posted a token back
via `messageParent`), but that handshake proved unreliable across Excel
Online sessions, so the task pane now just calls the login API directly, the
same way the web app does.

Office Add-ins are HTTPS-only for the task pane itself, and the task pane
calls the backend directly, so **the backend must run over HTTPS** too
(otherwise the HTTPS task pane calling a plain-HTTP backend gets blocked as
mixed content). The web app itself doesn't need HTTPS — it's not involved in
this flow.

```bash
# 1. Install a trusted local dev certificate (once)
cd excel-addin
npm install
npx office-addin-dev-certs install
```

```bash
# 2. Backend — HTTPS, not the old `uvicorn app.main:app --reload`
cd backend
python run_https.py            # serves https://localhost:8000
```

```bash
# 3. Web app (plain HTTP is fine)
cd frontend
npm run dev                    # serves http://localhost:5173
```

```bash
# 4. Add-in
cd excel-addin
cp .env.example .env           # VITE_API_URL=https://localhost:8000
npm run dev                    # serves https://localhost:3000
```

⚠️ If you already have a backend terminal running the old
`uvicorn app.main:app --reload` command, **stop it (Ctrl+C) and restart with
`python run_https.py`** — the two can silently coexist on port 8000 on
Windows, and requests will land on whichever one wins, producing a confusing
`wrong version number` / SSL error in the add-in.

Sideload the add-in into Excel:
- **Excel on the web or Desktop (Microsoft 365):** Home tab (or Insert tab) →
  Add-ins → **My Add-ins** → **Upload My Add-in** → choose
  `excel-addin/manifest.xml`. (If you only see a **Store** tab with no upload
  option, your account may be an IT-managed work/school account that
  restricts sideloading — use the next option instead.)
- **Excel Desktop, from the terminal:** run `npm run sideload` from
  `excel-addin/` (uses `office-addin-debugging`, requires Excel Desktop
  installed) — this registers the add-in directly via the Windows registry
  and doesn't depend on the upload UI being available.

Once loaded, click the **DataQuery AI** button on the Home ribbon (maximize
the Excel window or check the ribbon's overflow `>>` arrow if you don't see
it), sign in with your DataQuery account directly in the sidebar, and start
chatting — the connection also shows up in the web app at `/tools/excel-live`
and counts as one workspace source, same as an uploaded file.

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
| Excel Live (Office Add-in + tool-calling chat) | ✅ Done — `excel-addin/`, `backend/app/routers/excel_live.py` |
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
excel-addin/                      # Office Add-in (task pane) — sibling project, own package.json
```
