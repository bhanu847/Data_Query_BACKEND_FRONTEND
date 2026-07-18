"""
Excel Live — OpenAI tool-calling loop.

Unlike the deterministic pandas engine used by the other tools, Excel Live
has no dataframe to compute against: the model must request tool calls
which the Office Add-in task pane executes against the live workbook via
Office.js. This module only runs a single "turn" (one call to the model) —
the router drives the multi-turn loop across /chat and /tool-results calls.
"""

import json
import logging

from openai import OpenAI

from app.ai.excel_tools import EXCEL_LIVE_SYSTEM_PROMPT, TOOL_DEFINITIONS
from app.config import settings

logger = logging.getLogger("excel_live")

_OPENAI_CALL_TIMEOUT = 60  # seconds — generous ceiling for the model round-trip itself


class EngineNotConfiguredError(RuntimeError):
    pass


def _client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise EngineNotConfiguredError(
            "Excel Live requires OPENAI_API_KEY to be configured on the server."
        )
    return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=_OPENAI_CALL_TIMEOUT)


def run_turn(messages: list[dict]) -> dict:
    """Run one model turn given the full conversation history.

    `messages` must already include the system prompt as the first entry.
    Returns either:
      {"type": "tool_calls", "calls": [{"id", "name", "input"}], "raw_assistant_message": {...}}
      {"type": "message", "text": "..."}
    """
    client = _client()

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        tools=TOOL_DEFINITIONS,
        tool_choice="auto",
    )

    choice = response.choices[0]
    msg = choice.message

    if msg.tool_calls:
        calls = []
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            calls.append({"id": tc.id, "name": tc.function.name, "input": args})
            logger.info("excel_live tool_call name=%s range=%s", tc.function.name, args.get("range"))

        return {
            "type": "tool_calls",
            "calls": calls,
            "raw_assistant_message": {
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in msg.tool_calls
                ],
            },
        }

    return {"type": "message", "text": msg.content or ""}


def build_initial_messages(history: list[dict]) -> list[dict]:
    return [{"role": "system", "content": EXCEL_LIVE_SYSTEM_PROMPT}, *history]
