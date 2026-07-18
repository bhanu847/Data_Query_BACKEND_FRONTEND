"""
Semantic column/metric matching for Chat with Data and Dashboards.

The existing resolution chain (semantic_metrics.py's SEMANTIC_METRICS /
PBM_COLUMN_SYNONYMS, plus query_engine.py's COLUMN_SYNONYMS + fuzzy string
matching) is a hand-maintained dictionary — it only works for phrasings
someone thought to add. This module is the same technique used for PDF RAG
(embeddings_store.py), pointed at a dataset's columns instead of a
document's paragraphs: embed every column once (name + a few sample values
for context), embed the user's term, and match by cosine similarity. That
generalizes to phrasing nobody wrote a synonym for — e.g. "how much money
did we make" finding a column named `total_amt` with no shared words at all.

This is always the LAST fallback, tried only after the existing dictionary
lookups fail — cheap, deterministic matches stay deterministic. Returns None
whenever semantic matching isn't available (no OpenAI key, embedding call
failed) so callers fall through to their existing behavior unchanged.
"""

import re

import numpy as np
import pandas as pd

from app.config import settings

# Process-local cache, same pattern as services/store.py and
# services/embeddings_store.py. Keyed by (source_id, columns) rather than
# just source_id — callers ask about different column subsets for the same
# source (e.g. "all columns" for metric resolution vs "categorical only"
# for dimension resolution), and a single slot per source_id would have
# those calls repeatedly evict and re-embed each other's cache entry.
_CACHE: dict[tuple[int, tuple[str, ...]], np.ndarray] = {}


def _client():
    key = settings.OPENAI_API_KEY
    if not key or not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=15.0, max_retries=1)
    except Exception:
        return None


def _humanize(col: str) -> str:
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", col)
    return spaced.replace("_", " ").replace("-", " ").strip()


def _describe_column(col: str, series: pd.Series | None) -> str:
    """Build the text that gets embedded for a column — its humanized name,
    plus a few example values for extra semantic context when it's not
    purely numeric (e.g. "Drug Type (examples: Generic, Brand, Specialty)"
    matches "generic drugs" far better than "Drug Type" alone would)."""
    label = _humanize(col)
    if series is None:
        return label
    try:
        if pd.api.types.is_numeric_dtype(series) or pd.api.types.is_datetime64_any_dtype(series):
            return label
        samples = [s for s in series.dropna().astype(str).unique()[:5] if s.strip()]
        if not samples:
            return label
        return f"{label} (examples: {', '.join(samples)})"
    except Exception:
        return label


def _embed_texts(client, texts: list[str]) -> np.ndarray:
    response = client.embeddings.create(model=settings.OPENAI_EMBEDDING_MODEL, input=texts)
    return np.array([item.embedding for item in response.data], dtype=np.float32)


def _get_or_build_column_embeddings(
    source_id: int, columns: list[str], df: pd.DataFrame | None, client
) -> np.ndarray | None:
    key = (source_id, tuple(columns))
    cached = _CACHE.get(key)
    if cached is not None:
        return cached
    descriptions = [_describe_column(c, df[c] if df is not None and c in df.columns else None) for c in columns]
    try:
        matrix = _embed_texts(client, descriptions)
    except Exception:
        return None
    _CACHE[key] = matrix
    return matrix


def match_column_semantic(
    source_id: int,
    columns: list[str],
    term: str,
    df: pd.DataFrame | None = None,
    top_k: int = 1,
    min_similarity: float = 0.3,
) -> list[tuple[str, float]] | None:
    """Return up to top_k (column, similarity) pairs for `term`, best first.

    Returns None if semantic matching isn't available right now (no API key,
    embedding call failed) — the caller should keep using its existing
    dictionary/fuzzy matching in that case. Returns an empty list if
    matching ran but nothing scored above min_similarity.
    """
    if not columns or not term.strip():
        return None
    client = _client()
    if not client:
        return None

    matrix = _get_or_build_column_embeddings(source_id, columns, df, client)
    if matrix is None:
        return None

    try:
        term_vec = _embed_texts(client, [term])[0]
    except Exception:
        return None

    term_norm = np.linalg.norm(term_vec)
    if term_norm == 0:
        return None
    col_norms = np.linalg.norm(matrix, axis=1)
    similarities = (matrix @ term_vec) / (col_norms * term_norm + 1e-8)

    ranked_idx = np.argsort(-similarities)[:top_k]
    return [(columns[i], float(similarities[i])) for i in ranked_idx if similarities[i] >= min_similarity]


def drop_column_embeddings(source_id: int) -> None:
    for key in [k for k in _CACHE if k[0] == source_id]:
        del _CACHE[key]
