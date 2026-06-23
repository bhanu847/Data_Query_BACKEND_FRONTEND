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


class MultiQueryRequest(BaseModel):
    source_ids: list[int]
    question: str


class ChartSpec(BaseModel):
    type: str  # line | bar | pie | scatter
    title: str
    x: Optional[str] = None
    y: Optional[str] = None
    data: list[dict[str, Any]]


class ConfidenceExplanation(BaseModel):
    level: str = "Medium"
    score: int = 50
    reasons: list[str] = []


class QueryResponse(BaseModel):
    answer: str
    table: list[dict[str, Any]]
    columns: list[str]
    charts: list[ChartSpec]
    insights: list[str] = []
    confidence: float = 0.5
    metric_used: Optional[str] = None
    group_by: Optional[str] = None
    aggregation: Optional[str] = None
    reasoning: list[str] = []
    planner: Optional[dict[str, Any]] = None
    executive_summary: Optional[str] = None
    business_impact: Optional[str] = None
    recommendations: list[str] = []
    chart_narrative: Optional[str] = None
    confidence_explanation: Optional[ConfidenceExplanation] = None


class ExcerptItem(BaseModel):
    section: int
    content: str


class TextQueryResponse(BaseModel):
    answer: str
    excerpts: list[ExcerptItem] = []
    source_type: str
    page_count: int = 0
    total_characters: int = 0
    executive_summary: Optional[str] = None
    key_findings: list[str] = []
    risks: list[str] = []
    opportunities: list[str] = []
    recommendations: list[str] = []
    confidence: Optional[str] = None
    confidence_reason: Optional[str] = None


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
    description: Optional[str] = None


class DashboardChartSpec(ChartSpec):
    insight: Optional[str] = None


class DashboardResponse(BaseModel):
    title: str
    kpis: list[KpiCard]
    charts: list[DashboardChartSpec]
    insights: list[str]
    executive_summary: Optional[str] = None
    recommendations: list[str] = []


class ColumnsResponse(BaseModel):
    columns: list[str]
    dtypes: dict[str, str]
    sample: list[dict[str, Any]]
    row_count: int


class ChartDataRequest(BaseModel):
    source_id: int
    chart_type: str
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    aggregation: str = "sum"
    sort_order: Optional[str] = None
    limit: Optional[int] = None
    filters: Optional[dict[str, Any]] = None


class ChartDataResponse(BaseModel):
    chart_type: str
    title: str
    x: Optional[str] = None
    y: Optional[str] = None
    data: list[dict[str, Any]]


class KpiDataRequest(BaseModel):
    source_id: int
    column: str
    aggregation: str = "sum"
    filters: Optional[dict[str, Any]] = None


class KpiDataResponse(BaseModel):
    label: str
    value: str
    aggregation: str


class SaveDashboardRequest(BaseModel):
    source_id: int
    name: str
    config: dict[str, Any]
    template: Optional[str] = None


class UpdateDashboardRequest(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class DashboardOut(BaseModel):
    id: int
    source_id: Optional[int]
    name: str
    config: dict[str, Any]
    template: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- History ----
class HistoryItem(BaseModel):
    id: int
    question: str
    answer: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
