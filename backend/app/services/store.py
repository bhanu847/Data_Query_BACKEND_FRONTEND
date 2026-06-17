import pandas as pd
from sqlalchemy.orm import Session

from app.models.models import Source
from app.services.data_loader import load_dataframe

# Process-local cache. For multi-worker production, swap for Redis/parquet cache.
_CACHE: dict[int, pd.DataFrame] = {}


def get_frame(db: Session, source_id: int, owner_id: int) -> pd.DataFrame:
    """Return the DataFrame for a source the user owns, loading from disk if needed."""
    if source_id in _CACHE:
        return _CACHE[source_id]

    source = (
        db.query(Source)
        .filter(Source.id == source_id, Source.owner_id == owner_id)
        .first()
    )
    if source is None:
        raise KeyError("Source not found")
    if not source.file_path:
        raise ValueError("Source has no associated file")

    df = load_dataframe(source.file_path, source.kind)
    _CACHE[source_id] = df
    return df


def set_frame(source_id: int, df: pd.DataFrame) -> None:
    _CACHE[source_id] = df


def drop_frame(source_id: int) -> None:
    _CACHE.pop(source_id, None)
