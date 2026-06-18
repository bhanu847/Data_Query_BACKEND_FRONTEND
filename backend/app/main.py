from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.db import init_db
from app.routers import auth, sources, query, dashboard, export, history, mongodb

app = FastAPI(title="DataQuery AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "ai": bool(settings.OPENAI_API_KEY)}


app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(query.router)
app.include_router(dashboard.router)
app.include_router(export.router)
app.include_router(history.router)
app.include_router(mongodb.router)
