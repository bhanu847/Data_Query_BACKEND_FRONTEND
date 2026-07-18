import json
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.excel_live_engine import EngineNotConfiguredError, build_initial_messages, run_turn
from app.ai.excel_tools import MAX_ITERATIONS, ToolValidationError, validate_tool_call
from app.auth.deps import get_current_user
from app.config import settings
from app.database.db import get_db
from app.models.models import Source, User
from app.schemas.schemas import (
    ExcelLiveChatRequest,
    ExcelLiveChatResponse,
    ExcelLiveConnectResponse,
    ExcelLiveStatusResponse,
    ExcelLiveToolResultsRequest,
    ToolCallOut,
)
from app.services import excel_live_store as store

router = APIRouter(prefix="/excel-live", tags=["excel-live"])

_EXCEL_LIVE_SOURCE_NAME = "Excel Live"

# ---- Minimal per-user sliding-window rate limit (in-memory; single-process MVP) ----
_rate_log: dict[int, list[float]] = {}


def _check_rate_limit(user_id: int) -> None:
    now = time.time()
    window = _rate_log.setdefault(user_id, [])
    window[:] = [t for t in window if now - t < 60]
    if len(window) >= settings.EXCEL_LIVE_RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Too many Excel Live requests — please slow down.")
    window.append(now)


def _get_excel_live_source(db: Session, user_id: int) -> Source | None:
    return (
        db.query(Source)
        .filter(Source.owner_id == user_id, Source.kind == "excel-live")
        .first()
    )


def _connection_info(source: Source) -> dict:
    try:
        return json.loads(source.connection_info) if source.connection_info else {}
    except (json.JSONDecodeError, TypeError):
        return {}


# --------------------------------------------------------------------------- #
#  Connect / status — workspace source registration
# --------------------------------------------------------------------------- #

@router.post("/connect", response_model=ExcelLiveConnectResponse)
def connect(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    existing = _get_excel_live_source(db, user.id)

    if existing:
        info = _connection_info(existing)
        info["lastActiveAt"] = now.isoformat()
        existing.connection_info = json.dumps(info)
        db.commit()
        db.refresh(existing)
        return ExcelLiveConnectResponse(
            source_id=existing.id, connected=True,
            last_active_at=now, created_at=existing.created_at,
        )

    limit = settings.PLAN_SOURCE_LIMITS.get(user.plan, settings.PLAN_SOURCE_LIMITS["free"])
    current_count = db.query(Source).filter(Source.owner_id == user.id).count()
    if current_count >= limit:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Your {user.plan} plan is limited to {limit} sources. "
                "Remove a source or upgrade your plan to connect Excel Live."
            ),
        )

    info = {"createdAt": now.isoformat(), "lastActiveAt": now.isoformat()}
    source = Source(
        owner_id=user.id,
        name=_EXCEL_LIVE_SOURCE_NAME,
        kind="excel-live",
        connection_info=json.dumps(info),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return ExcelLiveConnectResponse(
        source_id=source.id, connected=True,
        last_active_at=now, created_at=source.created_at,
    )


@router.get("/status", response_model=ExcelLiveStatusResponse)
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    source = _get_excel_live_source(db, user.id)
    if not source:
        return ExcelLiveStatusResponse(connected=False)
    info = _connection_info(source)
    last_active = info.get("lastActiveAt")
    return ExcelLiveStatusResponse(
        connected=True,
        last_active_at=datetime.fromisoformat(last_active) if last_active else None,
    )


# --------------------------------------------------------------------------- #
#  Chat loop
# --------------------------------------------------------------------------- #

def _force_stop_response(conv_id: str) -> ExcelLiveChatResponse:
    store.reset_iterations(conv_id)
    text = (
        f"I've reached the {MAX_ITERATIONS}-step limit for this request and stopped to "
        "avoid an unbounded loop. Here's a summary of what I attempted — let me know if "
        "you'd like me to continue with a more specific next step."
    )
    store.append_message(conv_id, {"role": "assistant", "content": text})
    return ExcelLiveChatResponse(type="message", conversation_id=conv_id, text=text)


def _handle_turn_result(conv_id: str, result: dict) -> ExcelLiveChatResponse:
    if result["type"] == "message":
        store.append_message(conv_id, {"role": "assistant", "content": result["text"]})
        return ExcelLiveChatResponse(type="message", conversation_id=conv_id, text=result["text"])

    iterations = store.increment_iterations(conv_id)
    if iterations > MAX_ITERATIONS:
        return _force_stop_response(conv_id)

    validated_calls = []
    for call in result["calls"]:
        try:
            validate_tool_call(call["name"], call["input"])
        except ToolValidationError as e:
            # Surface the validation error back into the conversation so the
            # model can see and correct it, rather than crashing the request.
            store.append_message(conv_id, {
                "role": "tool", "tool_call_id": call["id"], "content": json.dumps({"error": str(e)}),
            })
            continue
        validated_calls.append(call)

    store.append_message(conv_id, result["raw_assistant_message"])
    return ExcelLiveChatResponse(
        type="tool_calls",
        conversation_id=conv_id,
        calls=[ToolCallOut(**c) for c in validated_calls],
    )


@router.post("/chat", response_model=ExcelLiveChatResponse)
def chat(
    payload: ExcelLiveChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_rate_limit(user.id)
    source = _get_excel_live_source(db, user.id)
    if not source:
        raise HTTPException(status_code=400, detail="Connect Excel Live before starting a chat.")

    if payload.conversation_id:
        try:
            store.get_conversation(payload.conversation_id, user.id)
        except store.ConversationNotFoundError:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv_id = payload.conversation_id
    else:
        conv_id = store.create_conversation(user.id, source.id)

    # Every new user message gets a fresh iteration budget.
    store.reset_iterations(conv_id)
    store.append_message(conv_id, {"role": "user", "content": payload.message})

    conv = store.get_conversation(conv_id, user.id)
    try:
        result = run_turn(build_initial_messages(conv["messages"]))
    except EngineNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return _handle_turn_result(conv_id, result)


@router.post("/tool-results", response_model=ExcelLiveChatResponse)
def tool_results(
    payload: ExcelLiveToolResultsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_rate_limit(user.id)
    try:
        store.get_conversation(payload.conversation_id, user.id)
    except store.ConversationNotFoundError:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for result in payload.results:
        content = result.content if isinstance(result.content, str) else json.dumps(result.content)
        store.append_message(payload.conversation_id, {
            "role": "tool", "tool_call_id": result.tool_use_id, "content": content,
        })

    conv = store.get_conversation(payload.conversation_id, user.id)
    try:
        result = run_turn(build_initial_messages(conv["messages"]))
    except EngineNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return _handle_turn_result(payload.conversation_id, result)
