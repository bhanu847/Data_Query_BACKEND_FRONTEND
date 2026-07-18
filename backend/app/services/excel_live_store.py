"""
Excel Live — in-memory conversation state.

Process-local cache, same pattern as services/store.py's dataframe cache.
For multi-worker production, swap for Redis. Holds message history (capped)
and the per-turn tool-iteration counter used to enforce the 15-call safeguard.
"""

import time
import uuid

MAX_HISTORY_TURNS = 30

_CONVERSATIONS: dict[str, dict] = {}


class ConversationNotFoundError(KeyError):
    pass


def create_conversation(user_id: int, source_id: int) -> str:
    conv_id = uuid.uuid4().hex
    _CONVERSATIONS[conv_id] = {
        "user_id": user_id,
        "source_id": source_id,
        "messages": [],
        "iteration_count": 0,
        "created_at": time.time(),
    }
    return conv_id


def get_conversation(conv_id: str, user_id: int) -> dict:
    conv = _CONVERSATIONS.get(conv_id)
    if conv is None or conv["user_id"] != user_id:
        raise ConversationNotFoundError(f"Conversation {conv_id} not found")
    return conv


def append_message(conv_id: str, message: dict) -> None:
    conv = _CONVERSATIONS[conv_id]
    conv["messages"].append(message)
    _cap_history(conv)


def _cap_history(conv: dict) -> None:
    # Keep the last MAX_HISTORY_TURNS user/assistant exchanges (tool messages
    # attached to a turn count with it), dropping the oldest first.
    messages = conv["messages"]
    user_turn_indices = [i for i, m in enumerate(messages) if m.get("role") == "user"]
    if len(user_turn_indices) > MAX_HISTORY_TURNS:
        cutoff = user_turn_indices[-MAX_HISTORY_TURNS]
        conv["messages"] = messages[cutoff:]


def reset_iterations(conv_id: str) -> None:
    _CONVERSATIONS[conv_id]["iteration_count"] = 0


def increment_iterations(conv_id: str) -> int:
    conv = _CONVERSATIONS[conv_id]
    conv["iteration_count"] += 1
    return conv["iteration_count"]


def get_iteration_count(conv_id: str) -> int:
    return _CONVERSATIONS[conv_id]["iteration_count"]
