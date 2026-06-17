import json
import math
import re
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings


SUPPORTED_OPERATIONS = {
    "answer",
    "head",
    "tail",
    "sample",
    "schema",
    "summary",
    "missing",
    "count",
    "unique",
    "value_counts",
    "aggregate",
    "groupby",
    "top",
    "bottom",
    "filter",
    "sort",
    "correlation",
    "pivot",
}

AGGREGATIONS = {
    "sum",
    "mean",
    "median",
    "min",
    "max",
    "count",
    "nunique",
    "std",
    "var",
}

OPERATORS = {"==", "!=", ">", "<", ">=", "<=", "contains", "startswith", "endswith", "in", "not in"}


def _records(df: pd.DataFrame) -> list[dict[str, Any]]:
    clean = df.replace([np.inf, -np.inf], np.nan)
    clean = clean.where(pd.notnull(clean), None)
    return clean.to_dict(orient="records")


def _json_safe(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if math.isnan(float(value)) or math.isinf(float(value)):
            return None
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if pd.isna(value):
        return None
    return value


def _numeric_cols(df: pd.DataFrame) -> list[str]:
    return df.select_dtypes(include=[np.number]).columns.tolist()


def _date_cols(df: pd.DataFrame) -> list[str]:
    return df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns.tolist()


def _categorical_cols(df: pd.DataFrame) -> list[str]:
    excluded = set(_numeric_cols(df) + _date_cols(df))
    return [col for col in df.columns if col not in excluded]


def _normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = [str(col).strip() for col in normalized.columns]

    for col in normalized.columns:
        if normalized[col].dtype == "object":
            as_number = pd.to_numeric(normalized[col], errors="coerce")
            if as_number.notna().sum() >= max(3, int(normalized[col].notna().sum() * 0.8)):
                normalized[col] = as_number
                continue

            if any(word in col.lower() for word in ("date", "time", "created", "updated")):
                as_date = pd.to_datetime(normalized[col], errors="coerce")
                if as_date.notna().sum() >= max(3, int(normalized[col].notna().sum() * 0.7)):
                    normalized[col] = as_date

    return normalized


def _match_column(name: Any, columns: list[str]) -> str | None:
    if name is None:
        return None

    wanted = str(name).strip().lower()
    if not wanted:
        return None

    by_lower = {col.lower(): col for col in columns}
    if wanted in by_lower:
        return by_lower[wanted]

    compact = re.sub(r"[^a-z0-9]+", "", wanted)
    for col in columns:
        if re.sub(r"[^a-z0-9]+", "", col.lower()) == compact:
            return col

    for col in columns:
        lowered = col.lower()
        if wanted in lowered or lowered in wanted:
            return col

    return None


def _question_column(question: str, columns: list[str]) -> str | None:
    q = question.lower()
    matches = [col for col in columns if col.lower() in q]
    return max(matches, key=len) if matches else None


def _chart(chart_type: str, title: str, x: str | None, y: str | None, df: pd.DataFrame) -> dict[str, Any]:
    return {
        "type": chart_type,
        "title": title,
        "x": x,
        "y": y,
        "data": _records(df.head(100)),
    }


def _response(
    answer: str,
    table: pd.DataFrame | None = None,
    charts: list[dict[str, Any]] | None = None,
    insights: list[str] | None = None,
) -> dict[str, Any]:
    table = table if table is not None else pd.DataFrame()
    return {
        "answer": answer,
        "table": _records(table),
        "columns": list(table.columns),
        "charts": charts or [],
        "insights": insights or [],
        "sql": None,
    }


def _client():
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI

        return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=8.0, max_retries=0)
    except Exception:
        return None


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.S)
        if not match:
            raise
        return json.loads(match.group(0))


def _dataset_profile(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "row_count": int(len(df)),
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "numeric_columns": _numeric_cols(df),
        "categorical_columns": _categorical_cols(df),
        "date_columns": _date_cols(df),
        "sample": _records(df.head(8)),
    }


def generate_plan(df: pd.DataFrame, question: str) -> dict[str, Any] | None:
    client = _client()
    if client is None:
        return None

    prompt = {
        "role": "user",
        "content": (
            "Return only valid JSON. Choose the safest pandas-style operation needed to answer the question.\n"
            "Never invent columns. Use only columns listed in the profile.\n"
            f"Supported operations: {sorted(SUPPORTED_OPERATIONS)}\n"
            "Plan fields may include: operation, columns, column, metric, metrics, group_by, aggregation, "
            "aggregations, filters, operator, value, ascending, limit, index, values, chart, answer.\n"
            "Use operation='answer' for conceptual questions, explanations, recommendations, or questions "
            "that need a prose answer from the visible data sample/profile instead of a table operation.\n"
            f"Dataset profile:\n{json.dumps(_dataset_profile(df), default=str)}\n"
            f"Question: {question}"
        ),
    }

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a careful data-query planner. Output JSON only."},
            prompt,
        ],
        temperature=0,
        max_tokens=500,
    )
    plan = _extract_json(response.choices[0].message.content or "{}")
    if plan.get("operation") not in SUPPORTED_OPERATIONS:
        return None
    return plan


def _coerce_value(series: pd.Series, value: Any) -> Any:
    if value is None:
        return None
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(value, errors="coerce")
    if pd.api.types.is_datetime64_any_dtype(series):
        return pd.to_datetime(value, errors="coerce")
    return str(value)


def _apply_filters(df: pd.DataFrame, filters: list[dict[str, Any]] | dict[str, Any] | None) -> pd.DataFrame:
    if not filters:
        return df
    if isinstance(filters, dict):
        filters = [filters]

    result = df
    for item in filters:
        column = _match_column(item.get("column"), list(result.columns))
        operator = str(item.get("operator", "==")).lower()
        if column is None or operator not in OPERATORS:
            continue

        series = result[column]
        raw_value = item.get("value")
        value = _coerce_value(series, raw_value)

        if operator == "==":
            mask = series == value
        elif operator == "!=":
            mask = series != value
        elif operator == ">":
            mask = series > value
        elif operator == "<":
            mask = series < value
        elif operator == ">=":
            mask = series >= value
        elif operator == "<=":
            mask = series <= value
        elif operator == "contains":
            mask = series.astype(str).str.contains(str(raw_value), case=False, na=False)
        elif operator == "startswith":
            mask = series.astype(str).str.startswith(str(raw_value), na=False)
        elif operator == "endswith":
            mask = series.astype(str).str.endswith(str(raw_value), na=False)
        elif operator in {"in", "not in"}:
            values = raw_value if isinstance(raw_value, list) else [raw_value]
            mask = series.isin([_coerce_value(series, val) for val in values])
            if operator == "not in":
                mask = ~mask
        else:
            continue

        result = result[mask]

    return result


def _single_value_frame(label: str, value: Any) -> pd.DataFrame:
    return pd.DataFrame([{"metric": label, "value": _json_safe(value)}])


def execute_plan(df: pd.DataFrame, plan: dict[str, Any], question: str) -> dict[str, Any]:
    op = plan.get("operation")
    working = _apply_filters(df, plan.get("filters"))

    if op == "answer":
        return _answer_from_llm(working, question, plan.get("answer"))

    if op == "head":
        n = int(plan.get("rows") or plan.get("limit") or 10)
        result = working.head(max(1, min(n, 500)))
        return _response(f"Showing the first {len(result)} rows.", result)

    if op == "tail":
        n = int(plan.get("rows") or plan.get("limit") or 10)
        result = working.tail(max(1, min(n, 500)))
        return _response(f"Showing the last {len(result)} rows.", result)

    if op == "sample":
        n = int(plan.get("rows") or plan.get("limit") or 10)
        result = working.sample(min(max(1, n), len(working))) if len(working) else working
        return _response(f"Showing a sample of {len(result)} rows.", result)

    if op == "schema":
        result = pd.DataFrame(
            {
                "column": working.columns,
                "dtype": [str(working[col].dtype) for col in working.columns],
                "non_null": [int(working[col].notna().sum()) for col in working.columns],
                "unique": [int(working[col].nunique(dropna=True)) for col in working.columns],
            }
        )
        return _response("Here are the dataset columns and data types.", result)

    if op == "summary":
        result = working.describe(include="all").reset_index().fillna("")
        return _response("Here is a statistical summary of the dataset.", result)

    if op == "missing":
        result = pd.DataFrame(
            {
                "column": working.columns,
                "missing": [int(working[col].isna().sum()) for col in working.columns],
                "missing_percent": [round(float(working[col].isna().mean() * 100), 2) for col in working.columns],
            }
        ).sort_values("missing", ascending=False)
        return _response("Here is the missing-value profile.", result)

    if op == "count":
        return _response(f"The dataset has {len(working):,} matching rows.", _single_value_frame("row_count", len(working)))

    if op == "unique":
        column = _match_column(plan.get("column"), list(working.columns)) or _question_column(question, list(working.columns))
        if not column:
            return _fallback(working, question)
        values = working[column].dropna().drop_duplicates().head(500).to_frame(name=column)
        return _response(f"{column} has {working[column].nunique(dropna=True):,} unique values.", values)

    if op == "value_counts":
        column = _match_column(plan.get("column"), list(working.columns)) or _question_column(question, _categorical_cols(working))
        if not column:
            return _fallback(working, question)
        result = working[column].value_counts(dropna=False).head(int(plan.get("limit") or 50)).reset_index()
        result.columns = [column, "count"]
        chart = _chart("bar", f"Count by {column}", column, "count", result)
        return _response(f"Most common values in {column}.", result, [chart])

    if op == "aggregate":
        metric = _match_column(plan.get("metric") or plan.get("column"), list(working.columns))
        agg = str(plan.get("aggregation", "sum")).lower()
        if metric is None or agg not in AGGREGATIONS:
            return _fallback(working, question)
        value = getattr(working[metric], agg)()
        result = _single_value_frame(f"{agg} {metric}", value)
        return _response(f"{agg.title()} of {metric} is {_json_safe(value)}.", result)

    if op in {"groupby", "top", "bottom"}:
        group = _match_column(plan.get("group_by"), list(working.columns)) or _question_column(question, _categorical_cols(working))
        metric = _match_column(plan.get("metric"), list(working.columns)) or (_numeric_cols(working)[0] if _numeric_cols(working) else None)
        agg = str(plan.get("aggregation", "sum")).lower()
        if group is None or metric is None or agg not in AGGREGATIONS:
            return _fallback(working, question)

        result = working.groupby(group, dropna=False)[metric].agg(agg).reset_index()
        ascending = op == "bottom"
        result = result.sort_values(metric, ascending=ascending)
        if op in {"top", "bottom"}:
            result = result.head(int(plan.get("limit") or 10))
        chart_type = plan.get("chart") or ("pie" if len(result) <= 6 else "bar")
        title = f"{agg} {metric} by {group}"
        return _response(title, result, [_chart(chart_type, title, group, metric, result)])

    if op == "filter":
        if "column" in plan:
            working = _apply_filters(df, plan)
        result = working.head(int(plan.get("limit") or 200))
        return _response(f"Found {len(working):,} matching rows.", result)

    if op == "sort":
        column = _match_column(plan.get("column"), list(working.columns)) or _question_column(question, list(working.columns))
        if column is None:
            return _fallback(working, question)
        ascending = bool(plan.get("ascending", False))
        result = working.sort_values(column, ascending=ascending).head(int(plan.get("limit") or 200))
        return _response(f"Sorted by {column}.", result)

    if op == "correlation":
        numeric = _numeric_cols(working)
        if len(numeric) < 2:
            return _response("Correlation needs at least two numeric columns.", pd.DataFrame())
        result = working[numeric].corr(numeric_only=True).reset_index().rename(columns={"index": "column"})
        return _response("Here is the correlation matrix for numeric columns.", result)

    if op == "pivot":
        index = _match_column(plan.get("index"), list(working.columns))
        columns = _match_column(plan.get("columns"), list(working.columns))
        values = _match_column(plan.get("values") or plan.get("metric"), list(working.columns))
        agg = str(plan.get("aggregation", "sum")).lower()
        if not index or not columns or not values or agg not in AGGREGATIONS:
            return _fallback(working, question)
        result = pd.pivot_table(working, index=index, columns=columns, values=values, aggfunc=agg).reset_index()
        result.columns = [str(col) for col in result.columns]
        return _response(f"Pivot of {values} by {index} and {columns}.", result.head(200))

    return _fallback(working, question)


def _answer_from_llm(df: pd.DataFrame, question: str, fallback_answer: str | None = None) -> dict[str, Any]:
    client = _client()
    if client is None:
        return _fallback(df, question, fallback_answer)

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "Answer as a concise data analyst. Use only the provided dataset profile and sample.",
            },
            {
                "role": "user",
                "content": f"Dataset profile:\n{json.dumps(_dataset_profile(df), default=str)}\n\nQuestion: {question}",
            },
        ],
        temperature=0.2,
        max_tokens=300,
    )
    answer = (response.choices[0].message.content or "").strip() or fallback_answer or "I could not produce an answer."
    return _response(answer, df.head(20), insights=[answer])


def _infer_plan(df: pd.DataFrame, question: str) -> dict[str, Any]:
    q = question.lower()
    numeric = _numeric_cols(df)
    categorical = _categorical_cols(df)

    if any(word in q for word in ("columns", "schema", "fields", "data type", "datatype")):
        return {"operation": "schema"}
    if any(word in q for word in ("missing", "null", "blank", "empty")):
        return {"operation": "missing"}
    if any(word in q for word in ("summary", "describe", "overview", "statistics", "stats")):
        return {"operation": "summary"}
    if any(word in q for word in ("correlation", "relationship between")):
        return {"operation": "correlation"}
    if re.search(r"\b(first|head|preview)\b", q):
        return {"operation": "head", "limit": _number_from_question(q, 10)}
    if re.search(r"\b(last|tail)\b", q):
        return {"operation": "tail", "limit": _number_from_question(q, 10)}
    if "unique" in q or "distinct" in q:
        return {"operation": "unique", "column": _question_column(question, list(df.columns))}
    if "count by" in q or "frequency" in q:
        return {"operation": "value_counts", "column": _question_column(question, categorical)}
    if "top" in q or "highest" in q:
        return {
            "operation": "top",
            "limit": _number_from_question(q, 10),
            "group_by": _question_column(question, categorical),
            "metric": _question_column(question, numeric),
        }
    if "bottom" in q or "lowest" in q:
        return {
            "operation": "bottom",
            "limit": _number_from_question(q, 10),
            "group_by": _question_column(question, categorical),
            "metric": _question_column(question, numeric),
        }
    if " by " in q and numeric and categorical:
        return {
            "operation": "groupby",
            "group_by": _question_column(question, categorical),
            "metric": _question_column(question, numeric),
            "aggregation": _aggregation_from_question(q),
        }
    if any(word in q for word in ("total", "sum", "average", "mean", "median", "minimum", "maximum", "max", "min", "count")):
        return {
            "operation": "aggregate",
            "metric": _question_column(question, numeric) or (numeric[0] if numeric else None),
            "aggregation": _aggregation_from_question(q),
        }
    return {"operation": "answer"}


def _number_from_question(question: str, default: int) -> int:
    match = re.search(r"\b(\d{1,4})\b", question)
    return int(match.group(1)) if match else default


def _aggregation_from_question(question: str) -> str:
    if "average" in question or "mean" in question:
        return "mean"
    if "median" in question:
        return "median"
    if "minimum" in question or "lowest" in question or " min" in question:
        return "min"
    if "maximum" in question or "highest" in question or " max" in question:
        return "max"
    if "unique" in question or "distinct" in question:
        return "nunique"
    if "count" in question:
        return "count"
    return "sum"


def _fallback(df: pd.DataFrame, question: str, answer: str | None = None) -> dict[str, Any]:
    if answer:
        return _response(answer, df.head(20), insights=[answer])

    if len(df) == 0:
        return _response("No rows match that question.", pd.DataFrame(columns=df.columns))

    profile = _dataset_profile(df)
    text = (
        f"I can answer questions over this dataset with {profile['row_count']:,} rows and "
        f"{len(profile['columns'])} columns. Ask for summaries, filters, rankings, totals, "
        "grouped breakdowns, missing values, unique values, correlations, pivots, or rows."
    )
    summary = pd.DataFrame(
        [
            {"property": "rows", "value": profile["row_count"]},
            {"property": "columns", "value": len(profile["columns"])},
            {"property": "numeric_columns", "value": ", ".join(profile["numeric_columns"]) or "none"},
            {"property": "categorical_columns", "value": ", ".join(profile["categorical_columns"]) or "none"},
            {"property": "date_columns", "value": ", ".join(profile["date_columns"]) or "none"},
        ]
    )
    return _response(text, summary, insights=[text])


def run_query(df: pd.DataFrame, question: str) -> dict[str, Any]:
    normalized = _normalize_dataframe(df)

    try:
        plan = generate_plan(normalized, question) or _infer_plan(normalized, question)
        return execute_plan(normalized, plan, question)
    except Exception as exc:
        try:
            return execute_plan(normalized, _infer_plan(normalized, question), question)
        except Exception:
            return _response(f"I could not answer that query yet: {exc}", normalized.head(20))
