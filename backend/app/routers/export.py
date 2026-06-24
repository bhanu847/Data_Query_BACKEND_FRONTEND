import io

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import Source, User
from app.services import store
from app.services.exporter import (
    to_csv_bytes,
    to_tsv_bytes,
    to_json_bytes,
    to_excel_bytes,
    to_pdf_bytes,
)
from app.services.report_engine import generate_report_pdf
from app.services.data_cleaner import profile_dataset, clean_dataset

router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    source_id: int


def _frame(db: Session, payload: ExportRequest, user: User):
    try:
        return store.get_frame(db, payload.source_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source not found")


def _name(db: Session, source_id: int) -> str:
    s = db.query(Source).filter(Source.id == source_id).first()
    return (s.name if s else "export").rsplit(".", 1)[0]


@router.post("/csv")
def export_csv(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_csv_bytes(df)),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{name}.csv"'},
    )


@router.post("/tsv")
def export_tsv(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_tsv_bytes(df)),
        media_type="text/tab-separated-values",
        headers={"Content-Disposition": f'attachment; filename="{name}.tsv"'},
    )


@router.post("/json")
def export_json(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_json_bytes(df)),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{name}.json"'},
    )


@router.post("/excel")
def export_excel(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_excel_bytes(df)),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{name}.xlsx"'},
    )


@router.post("/pdf")
def export_pdf(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_pdf_bytes(f"{name} Report", df)),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}.pdf"'},
    )


@router.post("/report")
def export_report(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    name = _name(db, payload.source_id)
    pdf_bytes = generate_report_pdf(df, dataset_name=name)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}_report.pdf"'},
    )


# ---------- Data Cleaning ----------

@router.post("/clean/profile")
def clean_profile(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, payload, user)
    return profile_dataset(df)


class CleanRequest(BaseModel):
    source_id: int
    fixes: list[str]


@router.post("/clean/apply")
def clean_apply(
    payload: CleanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, ExportRequest(source_id=payload.source_id), user)
    original_rows = len(df)
    cleaned = clean_dataset(df, payload.fixes)
    cleaned_preview = cleaned.head(10).fillna("").astype(str).to_dict(orient="records")
    return {
        "original_rows": original_rows,
        "cleaned_rows": len(cleaned),
        "rows_removed": original_rows - len(cleaned),
        "columns": list(cleaned.columns),
        "preview": cleaned_preview,
    }


class RowDetailRequest(BaseModel):
    source_id: int
    row_index: int


@router.post("/clean/row-detail")
def row_detail(
    payload: RowDetailRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, ExportRequest(source_id=payload.source_id), user)
    if payload.row_index < 0 or payload.row_index >= len(df):
        raise HTTPException(status_code=400, detail="Row index out of range")
    row = df.iloc[payload.row_index]
    record = {}
    for col in df.columns:
        val = row[col]
        if val is None or (isinstance(val, float) and (val != val)):
            record[col] = None
        else:
            record[col] = str(val)
    return {"row": payload.row_index, "record": record}


@router.post("/clean/download")
def clean_download(
    payload: CleanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    df = _frame(db, ExportRequest(source_id=payload.source_id), user)
    cleaned = clean_dataset(df, payload.fixes)
    name = _name(db, payload.source_id)
    return StreamingResponse(
        io.BytesIO(to_excel_bytes(cleaned)),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{name}_cleaned.xlsx"'},
    )
