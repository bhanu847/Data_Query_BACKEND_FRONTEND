"""
Semantic column/metric matching — tests column_embeddings.py's cosine
similarity matcher directly, and its integration as the LAST-resort fallback
in query_engine.py's _infer_metric/_find_subject (only reached once every
dictionary/synonym/keyword heuristic has already failed). A fake embeddings
client is used throughout — no real OpenAI calls happen in this suite.
"""

import pandas as pd
import pytest

from app.ai.dashboard_engine import _find_revenue_col
from app.ai.query_engine import _find_subject, _infer_metric
from app.services import column_embeddings

pytestmark = pytest.mark.filterwarnings("ignore")


class _FakeEmbeddingItem:
    def __init__(self, embedding):
        self.embedding = embedding


class _FakeEmbeddingResponse:
    def __init__(self, vectors):
        self.data = [_FakeEmbeddingItem(v) for v in vectors]


class _FakeEmbeddingsAPI:
    def __init__(self, vector_by_text):
        self._vector_by_text = vector_by_text

    def create(self, model, input):
        vectors = [self._vector_by_text[text] for text in input]
        return _FakeEmbeddingResponse(vectors)


class _FakeClient:
    def __init__(self, vector_by_text):
        self.embeddings = _FakeEmbeddingsAPI(vector_by_text)


@pytest.fixture(autouse=True)
def clear_column_embeddings_cache():
    column_embeddings._CACHE.clear()
    yield
    column_embeddings._CACHE.clear()


# --------------------------------------------------------------------------- #
#  column_embeddings.match_column_semantic
# --------------------------------------------------------------------------- #

def test_match_column_semantic_returns_none_without_client(monkeypatch):
    monkeypatch.setattr(column_embeddings, "_client", lambda: None)
    assert column_embeddings.match_column_semantic(1, ["total_amt"], "revenue") is None


def test_match_column_semantic_returns_none_for_empty_columns(monkeypatch):
    monkeypatch.setattr(column_embeddings, "_client", lambda: object())
    assert column_embeddings.match_column_semantic(1, [], "revenue") is None


def test_match_column_semantic_ranks_by_cosine_similarity(monkeypatch):
    vector_by_text = {
        "total amt": [0.0, 1.0],
        "Region": [1.0, 0.0],
        "how much money did we make": [0.1, 0.9],
    }
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    results = column_embeddings.match_column_semantic(
        1, ["total_amt", "Region"], "how much money did we make"
    )

    assert results is not None
    assert results[0][0] == "total_amt"


def test_match_column_semantic_respects_min_similarity(monkeypatch):
    vector_by_text = {
        "total amt": [1.0, 0.0],
        "unrelated question": [0.0, 1.0],  # orthogonal -> similarity 0
    }
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    results = column_embeddings.match_column_semantic(
        1, ["total_amt"], "unrelated question", min_similarity=0.3
    )
    assert results == []


def test_match_column_semantic_caches_per_column_subset(monkeypatch):
    call_count = {"n": 0}

    class _CountingEmbeddingsAPI:
        def create(self, model, input):
            call_count["n"] += 1
            return _FakeEmbeddingResponse([[1.0, 0.0]] * len(input))

    class _CountingClient:
        embeddings = _CountingEmbeddingsAPI()

    monkeypatch.setattr(column_embeddings, "_client", lambda: _CountingClient())

    # Same source_id, two DIFFERENT column subsets (mirrors metric resolution
    # seeing all columns vs dimension resolution seeing categorical-only) —
    # neither call should evict the other's cached embeddings.
    column_embeddings.match_column_semantic(5, ["A", "B"], "q1")
    column_embeddings.match_column_semantic(5, ["A", "B"], "q2")  # reuses cached A/B embeddings
    column_embeddings.match_column_semantic(5, ["C"], "q3")  # different subset, own cache entry

    # Calls: embed [A,B] (1) + embed q1 (2) + embed q2 (3) + embed [C] (4) + embed q3 (5).
    assert call_count["n"] == 5


def test_drop_column_embeddings_clears_all_subsets_for_source(monkeypatch):
    vector_by_text = {"a": [1.0], "b": [1.0], "q": [1.0]}
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    column_embeddings.match_column_semantic(9, ["a"], "q")
    column_embeddings.match_column_semantic(9, ["b"], "q")
    assert any(k[0] == 9 for k in column_embeddings._CACHE)

    column_embeddings.drop_column_embeddings(9)
    assert not any(k[0] == 9 for k in column_embeddings._CACHE)


# --------------------------------------------------------------------------- #
#  Integration: _infer_metric / _find_subject fallback ordering
# --------------------------------------------------------------------------- #

def test_infer_metric_falls_back_to_embeddings_when_nothing_else_matches(monkeypatch):
    # A deliberately nonsense column/question pair — guaranteed not to match
    # any dictionary, synonym, or keyword heuristic in the existing chain.
    numeric = ["xyzzy_metric_foo"]
    vector_by_text = {
        "xyzzy metric foo": [0.0, 1.0],
        "tell me about the mystery number": [0.1, 0.9],
    }
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    result = _infer_metric("tell me about the mystery number", numeric, source_id=42)

    assert result == "xyzzy_metric_foo"


def test_infer_metric_returns_none_without_source_id(monkeypatch):
    # Same nonsense pair, but no source_id — must behave exactly as before
    # (no embedding fallback attempted), proving the change is backward
    # compatible when the feature isn't opted into.
    numeric = ["xyzzy_metric_foo"]
    result = _infer_metric("tell me about the mystery number", numeric)
    assert result is None


def test_infer_metric_prefers_deterministic_match_over_embeddings(monkeypatch):
    # "revenue" is a known COLUMN_SYNONYMS/cost-heuristic term that should
    # resolve deterministically — the embedding client is never even called,
    # so if it somehow were, this fake client would raise (wrong text).
    class _ExplodingClient:
        class embeddings:
            @staticmethod
            def create(model, input):
                raise AssertionError("Embedding fallback should not run when a deterministic match exists")

    monkeypatch.setattr(column_embeddings, "_client", lambda: _ExplodingClient())

    numeric = ["total_revenue"]
    result = _infer_metric("what is our total revenue", numeric, source_id=7)

    assert result == "total_revenue"


def test_find_subject_falls_back_to_embeddings_when_nothing_else_matches(monkeypatch):
    df = pd.DataFrame({"weird_col_zzq": ["A", "B", "A"]})
    categorical = ["weird_col_zzq"]
    vector_by_text = {
        "weird col zzq (examples: A, B)": [0.0, 1.0],
        "break it down by the mystery grouping": [0.1, 0.9],
    }
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    result = _find_subject("break it down by the mystery grouping", categorical, df, source_id=3)

    assert result == "weird_col_zzq"


def test_find_subject_returns_none_without_source_id():
    df = pd.DataFrame({"weird_col_zzq": ["A", "B", "A"]})
    result = _find_subject("break it down by the mystery grouping", ["weird_col_zzq"], df)
    assert result is None


# --------------------------------------------------------------------------- #
#  Integration: dashboard_engine's revenue-column detection
# --------------------------------------------------------------------------- #

def test_find_revenue_col_prefers_keyword_match_over_embeddings():
    # "total_cost" matches the keyword heuristic directly — no source_id or
    # client needed at all, confirming the cheap path still wins first.
    assert _find_revenue_col(["age", "total_cost"]) == "total_cost"


def test_find_revenue_col_falls_back_to_semantic_match_over_first_column(monkeypatch):
    # Neither column name matches the keyword heuristic. Without semantic
    # matching, this would arbitrarily return "age" (numeric[0]) — wrong.
    numeric = ["age", "qty_shipped_units"]
    vector_by_text = {
        "age": [1.0, 0.0],
        "qty shipped units": [0.0, 1.0],
        "total revenue, sales, or monetary amount": [0.05, 0.95],
    }
    monkeypatch.setattr(column_embeddings, "_client", lambda: _FakeClient(vector_by_text))

    result = _find_revenue_col(numeric, source_id=11)

    assert result == "qty_shipped_units"


def test_find_revenue_col_falls_back_to_first_column_without_source_id():
    # Same ambiguous case, but no source_id given — must behave exactly as
    # before (arbitrary first-numeric-column fallback), proving this is a
    # backward-compatible opt-in, not a behavior change by default.
    assert _find_revenue_col(["age", "qty_shipped_units"]) == "age"
