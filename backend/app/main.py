from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.db import init_db, SessionLocal

app = FastAPI(title="DataQuery AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    db_ok = False
    db_error = ""
    try:
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as e:
        db_error = str(e)[:200]

    return {
        "status": "ok" if db_ok else "db_error",
        "database": "connected" if db_ok else db_error,
        "database_url_prefix": settings.DATABASE_URL[:30] + "...",
        "ai": bool(settings.OPENAI_API_KEY),
        "cors_origins": settings.CORS_ORIGINS[:3],
    }


from app.routers import auth, sources, query, dashboard, export, history, mongodb

app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(query.router)
app.include_router(dashboard.router)
app.include_router(export.router)
app.include_router(history.router)
app.include_router(mongodb.router)
