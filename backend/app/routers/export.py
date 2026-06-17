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
