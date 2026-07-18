"""
Real RAG retrieval for Chat with PDF/DOCX/TXT — tests the embedding-based
cosine-similarity semantic search in embeddings_store.py, its caching, and
its fallback to keyword search in text_query_engine.py. A fake embeddings
client is used throughout — no real OpenAI calls happen in this suite.
"""

import pytest

from app.ai import text_query_engine
from app.services import embeddings_store

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
def clear_embeddings_cache():
    embeddings_store._CACHE.clear()
    yield
    embeddings_store._CACHE.clear()


# --------------------------------------------------------------------------- #
#  embeddings_store.semantic_search
# --------------------------------------------------------------------------- #

def test_semantic_search_returns_none_without_client(monkeypatch):
    monkeypatch.setattr(embeddings_store, "_client", lambda: None)
    assert embeddings_store.semantic_search(1, [{"content": "some text"}], "a question") is None


def test_semantic_search_returns_none_for_empty_chunks(monkeypatch):
    monkeypatch.setattr(embeddings_store, "_client", lambda: object())
    assert embeddings_store.semantic_search(1, [], "a question") is None


def test_semantic_search_ranks_by_cosine_similarity(monkeypatch):
    chunks = [
        {"content": "The cat sat on the mat."},
        {"content": "Quarterly revenue increased by 12 percent."},
        {"content": "Kittens are small cats."},
    ]
    vector_by_text = {
        "The cat sat on the mat.": [1.0, 0.0, 0.0],
        "Quarterly revenue increased by 12 percent.": [0.0, 1.0, 0.0],
        "Kittens are small cats.": [0.8, 0.2, 0.0],
        "Tell me about revenue": [0.0, 0.9, 0.1],
    }
    monkeypatch.setattr(embeddings_store, "_client", lambda: _FakeClient(vector_by_text))

    results = embeddings_store.semantic_search(42, chunks, "Tell me about revenue", top_k=2)

    assert results is not None
    assert len(results) == 2
    assert results[0]["content"] == "Quarterly revenue increased by 12 percent."


def test_semantic_search_caches_chunk_embeddings_across_calls(monkeypatch):
    chunks = [{"content": "Alpha"}, {"content": "Beta"}]
    call_count = {"n": 0}

    class _CountingEmbeddingsAPI:
        def create(self, model, input):
            call_count["n"] += 1
            vectors = [
                [1.0, 0.0] if "Alpha" in t else [0.0, 1.0] if "Beta" in t else [0.5, 0.5]
                for t in input
            ]
            return _FakeEmbeddingResponse(vectors)

    class _CountingClient:
        embeddings = _CountingEmbeddingsAPI()

    monkeypatch.setattr(embeddings_store, "_client", lambda: _CountingClient())

    embeddings_store.semantic_search(7, chunks, "Alpha?")
    embeddings_store.semantic_search(7, chunks, "Beta?")

    # Call 1: embed the 2 chunks. Call 2: embed question 1. Call 3: embed
    # question 2 — chunk embeddings must NOT be recomputed the second time.
    assert call_count["n"] == 3


def test_drop_embeddings_clears_cache(monkeypatch):
    vector_by_text = {"hello": [1.0, 0.0], "q": [1.0, 0.0]}
    monkeypatch.setattr(embeddings_store, "_client", lambda: _FakeClient(vector_by_text))

    embeddings_store.semantic_search(99, [{"content": "hello"}], "q")
    assert 99 in embeddings_store._CACHE

    embeddings_store.drop_embeddings(99)
    assert 99 not in embeddings_store._CACHE


# --------------------------------------------------------------------------- #
#  text_query_engine.run_text_query — retrieval method selection
# --------------------------------------------------------------------------- #

def test_run_text_query_falls_back_to_keyword_without_source_id(tmp_path, monkeypatch):
    file_path = tmp_path / "doc.txt"
    file_path.write_text("Revenue grew significantly this quarter.\nCosts remained flat.\n")

    monkeypatch.setattr(text_query_engine, "_client", lambda: None)  # no LLM narrative call

    result = text_query_engine.run_text_query(str(file_path), "text", "What happened to revenue?")

    assert result["retrieval_method"] == "keyword"


def test_run_text_query_uses_semantic_search_when_available(tmp_path, monkeypatch):
    file_path = tmp_path / "doc.txt"
    file_path.write_text("Revenue grew significantly this quarter.\nCosts remained flat.\n")

    monkeypatch.setattr(text_query_engine, "_client", lambda: None)  # no LLM narrative call
    vector_by_text = {
        "Revenue grew significantly this quarter.": [1.0, 0.0],
        "Costs remained flat.": [0.0, 1.0],
        "What happened to revenue?": [0.9, 0.1],
    }
    monkeypatch.setattr(embeddings_store, "_client", lambda: _FakeClient(vector_by_text))

    result = text_query_engine.run_text_query(
        str(file_path), "text", "What happened to revenue?", source_id=123
    )

    assert result["retrieval_method"] == "semantic"


def test_run_text_query_falls_back_to_keyword_when_embeddings_unavailable(tmp_path, monkeypatch):
    file_path = tmp_path / "doc.txt"
    file_path.write_text("Revenue grew significantly this quarter.\nCosts remained flat.\n")

    monkeypatch.setattr(text_query_engine, "_client", lambda: None)
    monkeypatch.setattr(embeddings_store, "_client", lambda: None)  # simulates no API key

    result = text_query_engine.run_text_query(
        str(file_path), "text", "What happened to revenue?", source_id=123
    )

    assert result["retrieval_method"] == "keyword"
