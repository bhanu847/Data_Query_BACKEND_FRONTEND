"""
Excel Live — test suite.

Covers: tool schema validation, the 15-iteration safeguard, tool-result
continuation of the chat loop, and workspace source-limit enforcement.
The OpenAI engine (`run_turn`) is monkeypatched — these tests never call
the real API.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.routers.excel_live as excel_live_router
from app.ai.excel_tools import MAX_ITERATIONS, ToolValidationError, validate_tool_call
from app.database.db import Base, get_db
from app.main import app
from app.models.models import Source

pytestmark = pytest.mark.filterwarnings("ignore")


# --------------------------------------------------------------------------- #
#  Tool schema validation (pure unit tests, no server needed)
# --------------------------------------------------------------------------- #

def test_validate_tool_call_accepts_valid_read_range():
    validate_tool_call("read_range", {"range": "A1:D10"})


def test_validate_tool_call_rejects_missing_required_field():
    with pytest.raises(ToolValidationError):
        validate_tool_call("read_range", {})


def test_validate_tool_call_rejects_unknown_tool():
    with pytest.raises(ToolValidationError):
        validate_tool_call("delete_everything", {"range": "A1"})


def test_validate_tool_call_rejects_malformed_write_range_values():
    with pytest.raises(ToolValidationError):
        validate_tool_call("write_range", {"range": "A1:A2", "values": "not-a-2d-array"})


def test_validate_tool_call_rejects_wrong_field_type():
    with pytest.raises(ToolValidationError):
        validate_tool_call("format_range", {"range": "A1:A2", "bold": "yes"})


def test_validate_tool_call_accepts_no_arg_overview():
    validate_tool_call("get_workbook_overview", {})


def test_validate_tool_call_accepts_delete_range_with_valid_shift():
    validate_tool_call("delete_range", {"range": "A1:D1", "shift": "up"})


def test_validate_tool_call_rejects_delete_range_bad_shift_enum():
    with pytest.raises(ToolValidationError):
        validate_tool_call("delete_range", {"range": "A1:D1", "shift": "sideways"})


def test_validate_tool_call_rejects_delete_range_missing_shift():
    with pytest.raises(ToolValidationError):
        validate_tool_call("delete_range", {"range": "A1:D1"})


def test_validate_tool_call_accepts_insert_range():
    validate_tool_call("insert_range", {"range": "A5:D5", "shift": "down"})


def test_validate_tool_call_accepts_clear_range_default_type():
    validate_tool_call("clear_range", {"range": "A1:D50"})


def test_validate_tool_call_rejects_clear_range_bad_enum():
    with pytest.raises(ToolValidationError):
        validate_tool_call("clear_range", {"range": "A1:D50", "clearType": "everything"})


def test_validate_tool_call_accepts_delete_worksheet():
    validate_tool_call("delete_worksheet", {"sheet": "Sheet2"})


def test_validate_tool_call_rejects_delete_worksheet_missing_sheet():
    with pytest.raises(ToolValidationError):
        validate_tool_call("delete_worksheet", {})


def test_validate_tool_call_accepts_analyze_range_minimal():
    validate_tool_call("analyze_range", {"range": "A1:K13"})


def test_validate_tool_call_accepts_analyze_range_with_group_by():
    validate_tool_call("analyze_range", {"range": "A1:K13", "groupBy": "Gender", "hasHeaders": True})


def test_validate_tool_call_rejects_analyze_range_missing_range():
    with pytest.raises(ToolValidationError):
        validate_tool_call("analyze_range", {})


def test_validate_tool_call_rejects_analyze_range_wrong_has_headers_type():
    with pytest.raises(ToolValidationError):
        validate_tool_call("analyze_range", {"range": "A1:K13", "hasHeaders": "yes"})


def test_validate_tool_call_accepts_create_chart():
    validate_tool_call("create_chart", {"dataRange": "A1:B11", "chartType": "bar"})


def test_validate_tool_call_rejects_create_chart_bad_type_enum():
    with pytest.raises(ToolValidationError):
        validate_tool_call("create_chart", {"dataRange": "A1:B11", "chartType": "donut"})


def test_validate_tool_call_rejects_create_chart_missing_data_range():
    with pytest.raises(ToolValidationError):
        validate_tool_call("create_chart", {"chartType": "bar"})


# --------------------------------------------------------------------------- #
#  API-level fixtures
# --------------------------------------------------------------------------- #

@pytest.fixture()
def db_session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def client(db_session_factory):
    return TestClient(app)


def _signup(client, email="excel-live-user@test.com"):
    res = client.post(
        "/auth/signup",
        json={"email": email, "password": "pw123456", "full_name": "Test User"},
    )
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _tool_calls_result(name="get_workbook_overview", tool_id="call_1"):
    return {
        "type": "tool_calls",
        "calls": [{"id": tool_id, "name": name, "input": {}}],
        "raw_assistant_message": {
            "role": "assistant", "content": None,
            "tool_calls": [{"id": tool_id, "type": "function",
                             "function": {"name": name, "arguments": "{}"}}],
        },
    }


def _message_result(text="Done."):
    return {"type": "message", "text": text}


# --------------------------------------------------------------------------- #
#  Iteration cap
# --------------------------------------------------------------------------- #

def test_iteration_cap_forces_stop_after_max_iterations(client, monkeypatch):
    headers = _signup(client)
    connect_res = client.post("/excel-live/connect", headers=headers)
    assert connect_res.status_code == 200

    monkeypatch.setattr(excel_live_router, "run_turn", lambda messages: _tool_calls_result())

    chat_res = client.post("/excel-live/chat", json={"message": "add a totals row"}, headers=headers)
    assert chat_res.status_code == 200
    body = chat_res.json()
    assert body["type"] == "tool_calls"
    conv_id = body["conversation_id"]

    seen_stop = False
    for _ in range(MAX_ITERATIONS + 2):
        res = client.post(
            "/excel-live/tool-results",
            json={"conversation_id": conv_id, "results": [{"tool_use_id": "call_1", "content": {"ok": True}}]},
            headers=headers,
        )
        assert res.status_code == 200
        body = res.json()
        if body["type"] == "message":
            seen_stop = True
            assert "step limit" in body["text"] or str(MAX_ITERATIONS) in body["text"]
            break

    assert seen_stop, "Expected the loop to force-stop after the iteration cap"


# --------------------------------------------------------------------------- #
#  Tool-result continuation
# --------------------------------------------------------------------------- #

def test_tool_result_continuation_resumes_the_loop(client, monkeypatch):
    headers = _signup(client, email="continuation@test.com")
    assert client.post("/excel-live/connect", headers=headers).status_code == 200

    call_sequence = [_tool_calls_result(), _message_result("Added a totals row in B10:D10.")]

    def fake_run_turn(messages):
        return call_sequence.pop(0)

    monkeypatch.setattr(excel_live_router, "run_turn", fake_run_turn)

    chat_res = client.post("/excel-live/chat", json={"message": "add a totals row"}, headers=headers)
    assert chat_res.status_code == 200
    chat_body = chat_res.json()
    assert chat_body["type"] == "tool_calls"
    conv_id = chat_body["conversation_id"]

    continue_res = client.post(
        "/excel-live/tool-results",
        json={"conversation_id": conv_id, "results": [{"tool_use_id": "call_1", "content": {"rows": 10}}]},
        headers=headers,
    )
    assert continue_res.status_code == 200
    continue_body = continue_res.json()
    assert continue_body["type"] == "message"
    assert continue_body["conversation_id"] == conv_id
    assert "totals row" in continue_body["text"]


def test_tool_results_reject_unknown_conversation(client, monkeypatch):
    headers = _signup(client, email="unknown-conv@test.com")
    res = client.post(
        "/excel-live/tool-results",
        json={"conversation_id": "does-not-exist", "results": [{"tool_use_id": "x", "content": {}}]},
        headers=headers,
    )
    assert res.status_code == 404


# --------------------------------------------------------------------------- #
#  Source-limit enforcement
# --------------------------------------------------------------------------- #

def test_connect_enforces_free_plan_source_limit(client, db_session_factory):
    headers = _signup(client, email="limited@test.com")
    me = client.get("/auth/me", headers=headers).json()

    db = db_session_factory()
    try:
        for i in range(5):  # free plan limit
            db.add(Source(owner_id=me["id"], name=f"Dataset {i}", kind="csv", row_count=10))
        db.commit()
    finally:
        db.close()

    res = client.post("/excel-live/connect", headers=headers)
    assert res.status_code == 403
    assert "plan" in res.json()["detail"].lower()


def test_connect_succeeds_when_under_source_limit(client):
    headers = _signup(client, email="under-limit@test.com")
    res = client.post("/excel-live/connect", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["connected"] is True

    # Reconnecting (e.g. re-opening the add-in) should not create a duplicate
    # source or double-count against the limit.
    res2 = client.post("/excel-live/connect", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["source_id"] == body["source_id"]
