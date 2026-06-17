from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.dashboard_engine import generate_dashboard
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import Source, User
from app.schemas.schemas import DashboardResponse
from app.services import store

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardRequest(BaseModel):
    source_id: int


@router.post("/generate", response_model=DashboardResponse)
def generate(payload: DashboardRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        df = store.get_frame(db, payload.source_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    source = db.query(Source).filter(Source.id == payload.source_id).first()
    return generate_dashboard(df, name=source.name if source else "Dataset")
