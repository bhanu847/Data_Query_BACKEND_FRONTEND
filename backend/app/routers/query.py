import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.ai.query_engine import run_query
from app.ai.text_query_engine import run_text_query
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import QueryLog, Source, User
from app.schemas.schemas import (
    QueryRequest,
    QueryResponse,
    TextQueryResponse,
    DownloadQueryRequest,
)
from app.services import store
from app.services.exporter import to_excel_bytes, to_pdf_bytes, to_json_bytes

import pandas as pd

router = APIRouter(prefix="/query", tags=["query"])

TEXT_ONLY_KINDS = {"text", "txt"}
TABULAR_KINDS = {"csv", "excel", "json", "jsonl", "tsv", "parquet", "xml", "html", "mongodb"}
HYBRID_KINDS = {"pdf", "docx", "doc"}


def _get_source(db: Session, source_id: int, user_id: int) -> Source:
    source = (
        db.query(Source)
        .filter(Source.id == source_id, Source.owner_id == user_id)
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


def _source_has_tabular_data(db: Session, source: Source, user_id: int) -> bool:
    """Check if a source (even PDF/DOCX) was parsed into real tabular columns."""
    if source.columns:
        try:
            cols = json.loads(source.columns)
        except (json.JSONDecodeError, TypeError):
            cols = []
        if not _are_real_columns(cols):
            return False
        return True
    try:
        df = store.get_frame(db, source.id, user_id)
        return _are_real_columns(list(df.columns))
    except (KeyError, ValueError):
        return False


def _are_real_columns(cols: list[str]) -> bool:
    """Validate that column names represent real structured data, not PDF text garbage."""
    if not cols or len(cols) < 3:
        return False

    text_fallback = [{"page", "content"}, {"content"}, {"paragraph", "content"}, {"line", "content"}]
    if set(cols) in text_fallback:
        return False

    import re
    # Reject if most columns are auto-generated placeholders (col_0, col_1, ...)
    auto_count = sum(1 for c in cols if re.match(r'^col_\d+$', c))
    if auto_count / len(cols) > 0.4:
        return False

    # Reject if most columns are very short fragments (1-2 chars like "om", "ar", "i")
    short_count = sum(1 for c in cols if len(c.strip()) <= 2)
    if short_count / len(cols) > 0.4:
        return False

    # Reject if any column name is extremely long (garbled sentence fragments)
    long_count = sum(1 for c in cols if len(c.strip()) > 40)
    if long_count / len(cols) > 0.2:
        return False

    return True


# --------------------------------------------------------------------------- #
#  Smart ask — auto-routes based on actual data structure, not just file type
# --------------------------------------------------------------------------- #

@router.post("/ask", response_model=None)
def ask(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)

    if source.kind in TABULAR_KINDS:
        return _ask_tabular(source, payload, db, user)

    if source.kind in HYBRID_KINDS:
        if _source_has_tabular_data(db, source, user.id):
            return _ask_tabular(source, payload, db, user)
        return _ask_text(source, payload.question, db, user)

    # text, txt, or unknown
    return _ask_text(source, payload.question, db, user)


# --------------------------------------------------------------------------- #
#  PDF endpoint — uses tabular engine if PDF has table data
# --------------------------------------------------------------------------- #

@router.post("/ask/pdf", response_model=None)
def ask_pdf(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)
    if source.kind not in ("pdf",):
        raise HTTPException(status_code=400, detail=f"Source is '{source.kind}', not a PDF. Use the correct endpoint.")

    if _source_has_tabular_data(db, source, user.id):
        return _ask_tabular(source, payload, db, user)
    return _ask_text(source, payload.question, db, user)


# --------------------------------------------------------------------------- #
#  DOCX endpoint — uses tabular engine if DOCX has table data
# --------------------------------------------------------------------------- #

@router.post("/ask/docx", response_model=None)
def ask_docx(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)
    if source.kind not in ("docx", "doc"):
        raise HTTPException(status_code=400, detail=f"Source is '{source.kind}', not a Word document.")

    if _source_has_tabular_data(db, source, user.id):
        return _ask_tabular(source, payload, db, user)
    return _ask_text(source, payload.question, db, user)


# --------------------------------------------------------------------------- #
#  Excel/CSV endpoint — always uses tabular engine
# --------------------------------------------------------------------------- #

@router.post("/ask/excel", response_model=QueryResponse)
def ask_excel(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)
    if source.kind not in ("excel", "csv", "tsv"):
        raise HTTPException(status_code=400, detail=f"Source is '{source.kind}', not Excel/CSV.")
    return _ask_tabular(source, payload, db, user)


# --------------------------------------------------------------------------- #
#  JSON endpoint
# --------------------------------------------------------------------------- #

@router.post("/ask/json", response_model=QueryResponse)
def ask_json(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)
    if source.kind not in ("json", "jsonl"):
        raise HTTPException(status_code=400, detail=f"Source is '{source.kind}', not JSON.")
    return _ask_tabular(source, payload, db, user)


# --------------------------------------------------------------------------- #
#  XML/HTML endpoint
# --------------------------------------------------------------------------- #

@router.post("/ask/xml", response_model=QueryResponse)
def ask_xml(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_source(db, payload.source_id, user.id)
    if source.kind not in ("xml", "html"):
        raise HTTPException(status_code=400, detail=f"Source is '{source.kind}', not XML/HTML.")
    return _ask_tabular(source, payload, db, user)


# --------------------------------------------------------------------------- #
#  Download query result in Excel / PDF / JSON
# --------------------------------------------------------------------------- #

@router.post("/download")
def download_query_result(
    payload: DownloadQueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    source = _get_source(db, payload.source_id, user.id)

    use_text = source.kind in TEXT_ONLY_KINDS
    if source.kind in HYBRID_KINDS and not _source_has_tabular_data(db, source, user.id):
        use_text = True

    if use_text:
        result = run_text_query(source.file_path, source.kind, payload.question)
        df = pd.DataFrame([{"question": payload.question, "answer": result["answer"]}])
        title = f"Query: {payload.question[:50]}"
    else:
        try:
            df = store.get_frame(db, payload.source_id, user.id)
        except (KeyError, ValueError) as e:
            raise HTTPException(status_code=404, detail=str(e))
        result = run_query(df, payload.question)
        if result.get("table"):
            df = pd.DataFrame(result["table"])
        title = result.get("answer", payload.question)[:80]

    fmt = payload.format.lower()

    if fmt == "excel":
        data = to_excel_bytes(df)
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="query_result.xlsx"'},
        )
    elif fmt == "pdf":
        data = to_pdf_bytes(title, df)
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="query_result.pdf"'},
        )
    else:
        data = to_json_bytes(df)
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="query_result.json"'},
        )


# --------------------------------------------------------------------------- #
#  Internal helpers
# --------------------------------------------------------------------------- #

def _ask_text(source: Source, question: str, db: Session, user: User) -> dict:
    if not source.file_path:
        raise HTTPException(status_code=400, detail="Source has no associated file")

    result = run_text_query(source.file_path, source.kind, question)

    db.add(QueryLog(
        user_id=user.id, source_id=source.id,
        question=question, answer=result.get("answer"),
    ))
    db.commit()
    return result


def _ask_tabular(source: Source, payload: QueryRequest, db: Session, user: User) -> dict:
    try:
        df = store.get_frame(db, payload.source_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source not found or file missing")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = run_query(df, payload.question)

    db.add(QueryLog(
        user_id=user.id, source_id=payload.source_id,
        question=payload.question, answer=result.get("answer"),
    ))
    db.commit()
    return result
