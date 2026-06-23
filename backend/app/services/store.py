import pandas as pd
from sqlalchemy.orm import Session

from app.models.models import Source
from app.services.data_loader import load_dataframe
from app.ai.semantic_metrics import (
    detect_dataset_role,
    find_join_key,
    ENROLLMENT_DIMENSIONS,
    CLAIMS_METRICS,
)

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


def get_multi_frame(
    db: Session, source_ids: list[int], owner_id: int
) -> pd.DataFrame:
    """Load multiple sources and merge them into a single DataFrame."""
    frames: list[tuple[str, pd.DataFrame]] = []
    for sid in source_ids:
        source = (
            db.query(Source)
            .filter(Source.id == sid, Source.owner_id == owner_id)
            .first()
        )
        if source is None:
            raise KeyError(f"Source {sid} not found")
        df = get_frame(db, sid, owner_id)
        frames.append((source.name, df))

    if len(frames) == 1:
        return frames[0][1]

    # PBM-aware join: detect Claims + Enrollment datasets
    if len(frames) == 2:
        roles = [(name, df, detect_dataset_role(df)) for name, df in frames]
        role_set = {r[2] for r in roles}
        if {"claims", "enrollment"} == role_set:
            claims_df = next(df for _, df, role in roles if role == "claims")
            enrollment_df = next(df for _, df, role in roles if role == "enrollment")
            join_key = find_join_key(claims_df, enrollment_df)
            if join_key:
                merged = claims_df.merge(enrollment_df, on=join_key, how="left",
                                         suffixes=("", "_enrollment"))
                return merged

    # Detect column overlap to decide merge strategy
    all_col_sets = [set(df.columns) for _, df in frames]
    first_cols = all_col_sets[0]
    overlap_ratios = [
        len(first_cols & other) / max(len(first_cols | other), 1)
        for other in all_col_sets[1:]
    ]
    avg_overlap = sum(overlap_ratios) / len(overlap_ratios) if overlap_ratios else 0

    if avg_overlap >= 0.5:
        tagged = []
        for name, df in frames:
            copy = df.copy()
            copy["_source"] = name
            tagged.append(copy)
        return pd.concat(tagged, ignore_index=True)
    else:
        shared_keys = set.intersection(*all_col_sets) if all_col_sets else set()
        id_like = [
            k for k in shared_keys
            if any(w in k.lower() for w in ("id", "key", "code", "name"))
        ]
        if id_like:
            merged = frames[0][1].copy()
            merged["_source"] = frames[0][0]
            join_key = id_like[0]
            for name, df in frames[1:]:
                right = df.copy()
                right_cols = {
                    c: f"{c}_{name}" for c in right.columns
                    if c != join_key and c in merged.columns
                }
                right = right.rename(columns=right_cols)
                merged = merged.merge(right, on=join_key, how="outer")
            return merged
        else:
            tagged = []
            for name, df in frames:
                copy = df.copy()
                copy["_source"] = name
                tagged.append(copy)
            return pd.concat(tagged, ignore_index=True)


def set_frame(source_id: int, df: pd.DataFrame) -> None:
    _CACHE[source_id] = df


def drop_frame(source_id: int) -> None:
    _CACHE.pop(source_id, None)
