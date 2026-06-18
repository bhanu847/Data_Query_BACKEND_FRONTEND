from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr


# ---- Auth ----
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    plan: str

    class Config:
        from_attributes = True


# ---- Sources ----
class SourceOut(BaseModel):
    id: int
    name: str
    kind: str
    row_count: Optional[int] = None
    columns: Optional[list[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResult(BaseModel):
    source: SourceOut
    preview: list[dict[str, Any]]
    columns: list[str]


# ---- Query ----
class QueryRequest(BaseModel):
    source_id: int
    question: str


class ChartSpec(BaseModel):
    type: str  # line | bar | pie | scatter
    title: str
    x: Optional[str] = None
    y: Optional[str] = None
    data: list[dict[str, Any]]


class QueryResponse(BaseModel):
    answer: str
    table: list[dict[str, Any]]
    columns: list[str]
    charts: list[ChartSpec]
    insights: list[str] = []
    sql: Optional[str] = None
    confidence: float = 0.5


class ExcerptItem(BaseModel):
    section: int
    content: str


class TextQueryResponse(BaseModel):
    answer: str
    excerpts: list[ExcerptItem] = []
    source_type: str
    page_count: int = 0
    total_characters: int = 0


class DownloadQueryRequest(BaseModel):
    source_id: int
    question: str
    format: str = "json"  # json | excel | pdf


# ---- MongoDB ----
class MongoDBConnectRequest(BaseModel):
    host: str
    port: int = 27017
    database: str
    username: Optional[str] = None
    password: Optional[str] = None
    auth_source: str = "admin"
    collection: Optional[str] = None


class MongoDBQueryRequest(BaseModel):
    source_id: int
    question: str
    collection: Optional[str] = None


# ---- Dashboard ----
class KpiCard(BaseModel):
    label: str
    value: str
    delta: Optional[str] = None


class DashboardResponse(BaseModel):
    title: str
    kpis: list[KpiCard]
    charts: list[ChartSpec]
    insights: list[str]


# ---- History ----
class HistoryItem(BaseModel):
    id: int
    question: str
    answer: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
