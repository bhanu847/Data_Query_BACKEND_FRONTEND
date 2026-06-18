from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import QueryLog, Source, User

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(QueryLog)
        .filter(QueryLog.user_id == user.id)
        .order_by(QueryLog.created_at.desc())
        .limit(100)
        .all()
    )
    result = []
    for row in rows:
        source_name = None
        source_kind = None
        if row.source_id:
            source = db.query(Source).filter(Source.id == row.source_id).first()
            if source:
                source_name = source.name
                source_kind = source.kind
        result.append({
            "id": row.id,
            "question": row.question,
            "answer": row.answer,
            "source_id": row.source_id,
            "source_name": source_name,
            "source_kind": source_kind,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        })
    return result


@router.delete("/{item_id}")
def delete_history_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(QueryLog).filter(QueryLog.id == item_id, QueryLog.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(item)
    db.commit()
    return {"detail": "History item deleted"}


@router.delete("")
def clear_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = db.query(QueryLog).filter(QueryLog.user_id == user.id).delete()
    db.commit()
    return {"detail": f"Deleted {count} history items"}
