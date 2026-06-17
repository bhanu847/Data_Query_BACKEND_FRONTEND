from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import QueryLog, User
from app.schemas.schemas import HistoryItem

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[HistoryItem])
def history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(QueryLog)
        .filter(QueryLog.user_id == user.id)
        .order_by(QueryLog.created_at.desc())
        .limit(100)
        .all()
    )
