from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.query_engine import run_query
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import QueryLog, User
from app.schemas.schemas import QueryRequest, QueryResponse
from app.services import store

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/ask", response_model=QueryResponse)
def ask(payload: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        df = store.get_frame(db, payload.source_id, user.id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = run_query(df, payload.question)

    db.add(QueryLog(
        user_id=user.id, source_id=payload.source_id,
        question=payload.question, answer=result.get("answer"),
    ))
    db.commit()
    return result
