import json
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.config import settings
from app.database.db import get_db
from app.models.models import Source, User
from app.schemas.schemas import SourceOut, UploadResult
from app.services.data_loader import load_dataframe, dataframe_preview
from app.services import store

router = APIRouter(prefix="/sources", tags=["sources"])

# Maps file extension → kind string understood by data_loader.py
_EXT_TO_KIND: dict[str, str] = {
    ".csv":     "csv",
    ".tsv":     "tsv",
    ".tab":     "tsv",
    ".xlsx":    "excel",
    ".xls":     "excel",
    ".json":    "json",
    ".jsonl":   "jsonl",
    ".ndjson":  "jsonl",
    ".parquet": "parquet",
    ".txt":     "text",
    ".log":     "text",
    ".html":    "html",
    ".htm":     "html",
    ".xml":     "xml",
    ".pdf":     "pdf",
    ".docx":    "docx",
}


def _save_upload(file: UploadFile) -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    path = os.path.join(settings.UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
    contents = file.file.read()
    if len(contents) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB limit")
    with open(path, "wb") as f:
        f.write(contents)
    return path


def _kind_from_filename(filename: str | None) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    return _EXT_TO_KIND.get(ext, ext.lstrip(".") or "file")


def _ingest(file: UploadFile, kind: str, db: Session, user: User) -> UploadResult:
    path = _save_upload(file)
    try:
        df = load_dataframe(path, kind)
    except Exception as e:
        os.remove(path)
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    source = Source(
        owner_id=user.id,
        name=file.filename or kind,
        kind=kind,
        file_path=path,
        row_count=len(df),
        columns=json.dumps(list(df.columns)),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    store.set_frame(source.id, df)

    out = SourceOut(
        id=source.id, name=source.name, kind=source.kind,
        row_count=source.row_count, columns=list(df.columns), created_at=source.created_at,
    )
    return UploadResult(source=out, preview=dataframe_preview(df), columns=list(df.columns))


# --------------------------------------------------------------------------- #
#  Generic endpoint — auto-detects format from file extension
# --------------------------------------------------------------------------- #

@router.post("/upload", response_model=UploadResult)
def upload_any(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload any supported file. Format is detected from the file extension."""
    return _ingest(file, _kind_from_filename(file.filename), db, user)


# --------------------------------------------------------------------------- #
#  Format-specific endpoints (force a particular parser regardless of ext)
# --------------------------------------------------------------------------- #

@router.post("/csv/upload", response_model=UploadResult)
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "csv", db, user)


@router.post("/excel/upload", response_model=UploadResult)
def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "excel", db, user)


@router.post("/pdf/upload", response_model=UploadResult)
def upload_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a PDF. Tables are extracted when present; falls back to page text."""
    return _ingest(file, "pdf", db, user)


@router.post("/json/upload", response_model=UploadResult)
def upload_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "json", db, user)


@router.post("/jsonl/upload", response_model=UploadResult)
def upload_jsonl(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "jsonl", db, user)


@router.post("/tsv/upload", response_model=UploadResult)
def upload_tsv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "tsv", db, user)


@router.post("/parquet/upload", response_model=UploadResult)
def upload_parquet(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "parquet", db, user)


@router.post("/xml/upload", response_model=UploadResult)
def upload_xml(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "xml", db, user)


@router.post("/html/upload", response_model=UploadResult)
def upload_html(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _ingest(file, "html", db, user)


@router.post("/docx/upload", response_model=UploadResult)
def upload_docx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a Word document (.docx). Tables are extracted; falls back to paragraphs."""
    return _ingest(file, "docx", db, user)


# --------------------------------------------------------------------------- #
#  List sources
# --------------------------------------------------------------------------- #

@router.get("", response_model=list[SourceOut])
def list_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Source).filter(Source.owner_id == user.id).order_by(Source.created_at.desc()).all()
    return [
        SourceOut(
            id=s.id, name=s.name, kind=s.kind, row_count=s.row_count,
            columns=json.loads(s.columns) if s.columns else [], created_at=s.created_at,
        )
        for s in rows
    ]
