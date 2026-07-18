"""
Real RAG retrieval for Chat with PDF/DOCX/TXT.

Replaces plain keyword search with embedding-based semantic search: each
document chunk (page/paragraph/line) is turned into a vector, the question is
turned into a vector too, and the chunks whose vectors are closest to the
question's (cosine similarity) are the ones sent to the LLM. This finds
relevant content even when the question and the document use different words
for the same thing — keyword search can't do that.

No vector database (e.g. ChromaDB) — for the single-document sizes this app
handles, an in-memory numpy cosine-similarity index does exactly the same
math a vector DB would, with far less moving parts. Embeddings are cached
per source_id (process-local, like services/store.py's DataFrame cache) so
asking a second question about the same document doesn't re-embed it.

Falls back to returning None (caller uses keyword search instead) whenever
there's no OpenAI key configured or the embedding call fails for any reason
— semantic search is a strict upgrade when available, never a hard
requirement.
"""

import numpy as np

from app.config import settings

_CACHE: dict[int, tuple[list[dict], np.ndarray]] = {}


def _client():
    key = settings.OPENAI_API_KEY
    if not key or not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=30.0, max_retries=1)
    except Exception:
        return None


def _embed_texts(client, texts: list[str]) -> np.ndarray:
    response = client.embeddings.create(model=settings.OPENAI_EMBEDDING_MODEL, input=texts)
    vectors = [item.embedding for item in response.data]
    return np.array(vectors, dtype=np.float32)


def _get_or_build_embeddings(source_id: int, chunks: list[dict], client) -> np.ndarray | None:
    cached = _CACHE.get(source_id)
    if cached is not None and len(cached[0]) == len(chunks):
        return cached[1]
    try:
        matrix = _embed_texts(client, [c["content"] for c in chunks])
    except Exception:
        return None
    _CACHE[source_id] = (chunks, matrix)
    return matrix


def semantic_search(source_id: int, chunks: list[dict], question: str, top_k: int = 5) -> list[dict] | None:
    """Return the top_k chunks most semantically relevant to the question, or
    None if semantic search isn't available right now (no API key, or the
    embedding call failed) — the caller should fall back to keyword search."""
    if not chunks:
        return None
    client = _client()
    if not client:
        return None

    matrix = _get_or_build_embeddings(source_id, chunks, client)
    if matrix is None:
        return None

    try:
        query_vec = _embed_texts(client, [question])[0]
    except Exception:
        return None

    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return None
    chunk_norms = np.linalg.norm(matrix, axis=1)
    similarities = (matrix @ query_vec) / (chunk_norms * query_norm + 1e-8)

    top_indices = np.argsort(-similarities)[:top_k]
    return [chunks[i] for i in top_indices if similarities[i] > 0]


def drop_embeddings(source_id: int) -> None:
    _CACHE.pop(source_id, None)
