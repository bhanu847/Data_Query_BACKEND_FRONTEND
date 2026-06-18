"""
Production-grade AI Analytics Query Engine.

Handles natural-language questions over tabular DataFrames by:
1. Semantic column mapping (synonyms + fuzzy matching)
2. Intent classification (aggregation, comparison, ranking, trend, ...)
3. Multi-step plan execution (group-by, filter, sort, aggregate)
4. Auto chart selection
5. Auto insight generation
6. Confidence scoring
"""

import json
import math
import re
from difflib import SequenceMatcher
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings

# ---------------------------------------------------------------------------
#  Column synonym map: user language -> likely column names
# ---------------------------------------------------------------------------
COLUMN_SYNONYMS: dict[str, list[str]] = {
    "revenue":        ["totalprice", "total_price", "revenue", "sales", "amount", "total_amount", "totalrevenue", "total_revenue", "totalsales", "total_sales", "price"],
    "sales":          ["totalprice", "total_price", "revenue", "sales", "amount", "totalsales", "total_sales"],
    "income":         ["totalprice", "total_price", "revenue", "income", "amount"],
    "cost":           ["cost", "totalcost", "total_cost", "shippingcost", "shipping_cost", "expense", "expenses"],
    "shipping cost":  ["shippingcost", "shipping_cost", "shipping", "deliverycharge", "delivery_charge"],
    "shipping":       ["shippingcost", "shipping_cost", "shipping", "shippingmethod", "shipping_method"],
    "profit":         ["profit", "net_profit", "netprofit", "margin", "grossprofit", "gross_profit"],
    "price":          ["unitprice", "unit_price", "price", "totalprice", "total_price", "saleprice", "sale_price"],
    "unit price":     ["unitprice", "unit_price", "price", "itemprice", "item_price"],
    "quantity":       ["quantity", "qty", "units", "unitssold", "units_sold", "count", "volume", "items"],
    "units sold":     ["quantity", "qty", "unitssold", "units_sold"],
    "units":          ["quantity", "qty", "units", "unitssold", "units_sold"],
    "discount":       ["discount", "discountpercent", "discount_percent", "discountamount", "discount_amount"],
    "orders":         ["orderid", "order_id", "orders", "ordercount", "order_count"],
    "order":          ["orderid", "order_id"],
    "date":           ["date", "orderdate", "order_date", "transactiondate", "transaction_date", "created", "createdat", "created_at", "purchasedate", "purchase_date"],
    "payment method": ["paymentmethod", "payment_method", "paymenttype", "payment_type", "paymode", "pay_mode"],
    "payment":        ["paymentmethod", "payment_method", "paymenttype", "payment_type"],
    "region":         ["region", "area", "territory", "zone", "district", "location", "state", "country", "city"],
    "product":        ["product", "productname", "product_name", "item", "itemname", "item_name", "productcategory", "product_category", "sku"],
    "category":       ["category", "productcategory", "product_category", "type", "group", "segment"],
    "customer":       ["customer", "customername", "customer_name", "customerid", "customer_id", "client", "buyer"],
    "customer type":  ["customertype", "customer_type", "customersegment", "customer_segment", "customergroup", "customer_group"],
    "returned":       ["returned", "return", "isreturned", "is_returned", "returnstatus", "return_status", "refund", "refunded"],
    "returns":        ["returned", "return", "isreturned", "is_returned", "returnstatus", "return_status"],
    "status":         ["status", "orderstatus", "order_status", "state", "deliverystatus", "delivery_status"],
    "salesperson":    ["salesperson", "sales_person", "salesrep", "sales_rep", "representative", "agent", "rep"],
    "promotion":      ["promotion", "promo", "campaign", "offer", "deal", "coupon"],
    "channel":        ["channel", "saleschannel", "sales_channel", "source", "medium"],
    "gender":         ["gender", "sex"],
    "age":            ["age", "customerage", "customer_age"],
    "rating":         ["rating", "score", "satisfaction", "review", "stars"],
    "email":          ["email", "emailaddress", "email_address"],
    "phone":          ["phone", "phonenumber", "phone_number", "mobile", "contact"],
    "name":           ["name", "fullname", "full_name", "firstname", "first_name"],
}

# Business concept patterns: maps question phrases to analysis intent
INTENT_PATTERNS: list[tuple[str, str, dict[str, Any]]] = [
    # Ranking
    (r"\b(most popular|most common|most frequent|most used)\b", "ranking_count", {"sort": "desc"}),
    (r"\b(least popular|least common|least frequent|least used)\b", "ranking_count", {"sort": "asc"}),
    (r"\b(highest|largest|biggest|maximum|max|most|top|best|leading|greatest)\b", "ranking_metric", {"sort": "desc"}),
    (r"\b(lowest|smallest|minimum|min|least|bottom|worst|fewest)\b", "ranking_metric", {"sort": "asc"}),
    (r"\btop\s+(\d+)\b", "top_n", {"sort": "desc"}),
    (r"\bbottom\s+(\d+)\b", "top_n", {"sort": "asc"}),

    # Aggregation
    (r"\b(total|sum of|sum|overall)\b", "aggregate", {"agg": "sum"}),
    (r"\b(average|avg|mean)\b", "aggregate", {"agg": "mean"}),
    (r"\b(median)\b", "aggregate", {"agg": "median"}),
    (r"\b(count|how many|number of|total number)\b", "count", {}),

    # Comparison
    (r"\b(compare|comparison|versus|vs\.?|difference between|against)\b", "comparison", {}),

    # Trend
    (r"\b(trend|over time|monthly|weekly|daily|yearly|by month|by year|by week|by day|time series|growth)\b", "trend", {}),

    # Distribution / Breakdown
    (r"\b(distribution|breakdown|split|composition|proportion|share|percentage)\b", "breakdown", {}),
    (r"\b(by|per|for each|group by|grouped by|across)\b", "group_analysis", {}),

    # Correlation
    (r"\b(correlation|relationship between|relate|correlated|scatter)\b", "correlation", {}),

    # Filtering
    (r"\b(where|filter|only|excluding|include only|greater than|less than|between|equal to)\b", "filter", {}),

    # Summary
    (r"\b(summary|summarize|overview|executive summary|report|describe|tell me about)\b", "summary", {}),

    # Schema
    (r"\b(columns|fields|schema|data types|structure|what data)\b", "schema", {}),
]


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def _records(df: pd.DataFrame) -> list[dict[str, Any]]:
    clean = df.replace([np.inf, -np.inf], np.nan)
    clean = clean.where(pd.notnull(clean), None)
    recs = clean.to_dict(orient="records")
    return [{k: _json_safe(v) for k, v in r.items()} for r in recs]


def _json_safe(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if math.isnan(float(value)) or math.isinf(float(value)):
            return None
        return round(float(value), 4)
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
    return [c for c in df.columns if c not in excluded and df[c].nunique() <= 200]


def _boolean_cols(df: pd.DataFrame) -> list[str]:
    result = []
    for c in df.columns:
        if df[c].dtype == bool:
            result.append(c)
            continue
        if pd.api.types.is_string_dtype(df[c]) or df[c].dtype == "object":
            try:
                unique = set(df[c].dropna().astype(str).str.lower().unique())
            except Exception:
                continue
            if unique and unique <= {"yes", "no", "true", "false", "1", "0", "y", "n"}:
                result.append(c)
    return result


def _format_number(val: Any) -> str:
    if val is None:
        return "N/A"
    if isinstance(val, float):
        if abs(val) >= 1_000_000:
            return f"{val / 1_000_000:,.1f}M"
        if abs(val) >= 1_000:
            return f"{val / 1_000:,.1f}K"
        return f"{val:,.2f}"
    return f"{val:,}" if isinstance(val, int) else str(val)


# ---------------------------------------------------------------------------
#  Normalize DataFrame on first load
# ---------------------------------------------------------------------------

def _normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = [str(c).strip() for c in normalized.columns]

    for col in normalized.columns:
        if normalized[col].dtype == "object":
            as_number = pd.to_numeric(normalized[col], errors="coerce")
            if as_number.notna().sum() >= max(3, int(normalized[col].notna().sum() * 0.8)):
                normalized[col] = as_number
                continue
            if any(w in col.lower() for w in ("date", "time", "created", "updated", "day", "month", "year")):
                as_date = pd.to_datetime(normalized[col], errors="coerce", dayfirst=False)
                if as_date.notna().sum() >= max(3, int(normalized[col].notna().sum() * 0.7)):
                    normalized[col] = as_date
    return normalized


# ---------------------------------------------------------------------------
#  Semantic Column Matching
# ---------------------------------------------------------------------------

def _fuzzy_score(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def _semantic_match_column(term: str, columns: list[str]) -> tuple[str | None, float]:
    """Match a user term to the best dataset column using synonyms + fuzzy matching."""
    term_lower = term.lower().strip()
    term_compact = re.sub(r"[^a-z0-9]", "", term_lower)
    col_lower_map = {c.lower(): c for c in columns}
    col_compact_map = {re.sub(r"[^a-z0-9]", "", c.lower()): c for c in columns}

    # 1. Exact match
    if term_lower in col_lower_map:
        return col_lower_map[term_lower], 1.0
    if term_compact in col_compact_map:
        return col_compact_map[term_compact], 1.0

    # 2. Synonym lookup
    if term_lower in COLUMN_SYNONYMS:
        for syn in COLUMN_SYNONYMS[term_lower]:
            syn_compact = re.sub(r"[^a-z0-9]", "", syn)
            if syn_compact in col_compact_map:
                return col_compact_map[syn_compact], 0.95

    # Multi-word synonym keys
    for key, syns in COLUMN_SYNONYMS.items():
        if key in term_lower or term_lower in key:
            for syn in syns:
                syn_compact = re.sub(r"[^a-z0-9]", "", syn)
                if syn_compact in col_compact_map:
                    return col_compact_map[syn_compact], 0.9

    # 3. Substring match
    for col in columns:
        cl = col.lower()
        if term_compact in re.sub(r"[^a-z0-9]", "", cl):
            return col, 0.85
        if re.sub(r"[^a-z0-9]", "", cl) in term_compact and len(cl) >= 3:
            return col, 0.8

    # 4. Fuzzy match
    best_score, best_col = 0.0, None
    for col in columns:
        score = _fuzzy_score(term_compact, re.sub(r"[^a-z0-9]", "", col.lower()))
        if score > best_score:
            best_score, best_col = score, col
    if best_score >= 0.65:
        return best_col, best_score

    return None, 0.0


def _extract_columns_from_question(question: str, columns: list[str]) -> dict[str, tuple[str, float]]:
    """Extract all column references from a question with confidence scores."""
    found: dict[str, tuple[str, float]] = {}
    q_lower = question.lower()

    # Try matching each column name directly
    for col in columns:
        patterns = [
            col.lower(),
            re.sub(r"([a-z])([A-Z])", r"\1 \2", col).lower(),  # camelCase -> "camel case"
            col.lower().replace("_", " "),
        ]
        for pat in patterns:
            if pat in q_lower and len(pat) >= 3:
                found[col] = (col, 0.95)
                break

    # Try matching synonym-based terms
    words = re.findall(r'\b[\w]+(?:\s+[\w]+)?\b', q_lower)
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
    candidates = bigrams + words

    for cand in candidates:
        if cand in {"the", "and", "for", "are", "was", "what", "which", "how", "show",
                     "tell", "give", "find", "get", "me", "all", "each", "every", "this",
                     "that", "from", "with", "have", "has", "been", "does", "most", "least",
                     "many", "much", "more", "less", "than", "between", "total", "average",
                     "sum", "count", "top", "bottom", "by", "per", "is", "in", "on", "to",
                     "of", "a", "an", "it", "do", "not", "no", "or", "be", "at"}:
            continue
        col, score = _semantic_match_column(cand, columns)
        if col and score > 0.6 and col not in found:
            found[col] = (col, score)

    return found


# ---------------------------------------------------------------------------
#  Intent Classification
# ---------------------------------------------------------------------------

def _classify_intent(question: str, df: pd.DataFrame) -> dict[str, Any]:
    """Classify user question into analysis intent."""
    q_lower = question.lower().strip()
    columns = list(df.columns)
    col_refs = _extract_columns_from_question(question, columns)
    numeric = _numeric_cols(df)
    categorical = _categorical_cols(df)
    boolean = _boolean_cols(df)
    date = _date_cols(df)

    intent = {
        "type": "unknown",
        "metric_cols": [],
        "group_cols": [],
        "filter_cols": [],
        "sort_direction": "desc",
        "aggregation": "sum",
        "limit": None,
        "confidence": 0.5,
        "params": {},
    }

    # Determine which referenced columns are numeric vs categorical
    for col, (_, score) in col_refs.items():
        if col in numeric:
            intent["metric_cols"].append(col)
        elif col in categorical or col in boolean:
            intent["group_cols"].append(col)

    # Match against intent patterns (first specific match wins for count vs metric)
    for pattern, intent_type, params in INTENT_PATTERNS:
        match = re.search(pattern, q_lower)
        if match:
            # ranking_count is more specific than ranking_metric — don't let
            # a generic "most" override an already-matched "most popular"
            if intent["type"] == "ranking_count" and intent_type == "ranking_metric":
                continue
            if intent["type"] == "unknown" or intent_type in ("ranking_count", "ranking_metric", "top_n", "comparison", "trend"):
                intent["type"] = intent_type
                intent["confidence"] = 0.85
                intent["params"].update(params)
                if "sort" in params:
                    intent["sort_direction"] = params["sort"]
                if "agg" in params:
                    intent["aggregation"] = params["agg"]
                if intent_type == "top_n":
                    intent["limit"] = int(match.group(1))

    # "What is the return rate?" — boolean rate question
    rate_match = re.search(r"\b(rate|percentage|percent|ratio|proportion)\b", q_lower)
    if rate_match and intent["type"] not in ("trend", "correlation"):
        for col in boolean:
            col_lower = col.lower()
            variants = {col_lower}
            if col_lower.endswith("ed"):
                variants.add(col_lower[:-2])
            variants.add(col_lower + "s")
            if any(v in q_lower for v in variants if len(v) >= 3):
                intent["type"] = "count"
                intent["filter_cols"] = [col]
                intent["confidence"] = 0.9
                break
        if not intent["filter_cols"]:
            for syn_key, syns in COLUMN_SYNONYMS.items():
                if syn_key in q_lower:
                    for s in syns:
                        compact = re.sub(r"[^a-z0-9]", "", s)
                        for col in boolean:
                            if re.sub(r"[^a-z0-9]", "", col.lower()) == compact:
                                intent["type"] = "count"
                                intent["filter_cols"] = [col]
                                intent["confidence"] = 0.85
                                break

    # "How many orders were returned?" — count with filter on boolean
    if intent["type"] == "count":
        for col in boolean:
            col_lower = col.lower()
            # Generate variants: "Returned" -> ["returned", "return", "returns"]
            variants = {col_lower}
            if col_lower.endswith("ed"):
                variants.add(col_lower[:-2])    # "returned" -> "return"
                variants.add(col_lower[:-1])    # "returned" -> "returne" (unlikely but safe)
                variants.add(col_lower[:-2] + "s")  # "returned" -> "returns"
            if col_lower.endswith("s"):
                variants.add(col_lower[:-1])    # "returns" -> "return"
            variants.add(col_lower + "s")       # "return" -> "returns"
            variants.add(col_lower + "ed")      # "return" -> "returned"

            if any(term in q_lower for term in variants if len(term) >= 3):
                intent["filter_cols"].append(col)
                intent["confidence"] = 0.9
                break
        if not intent["filter_cols"]:
            for syn_key, syns in COLUMN_SYNONYMS.items():
                if syn_key in q_lower:
                    for s in syns:
                        compact = re.sub(r"[^a-z0-9]", "", s)
                        for col in boolean:
                            if re.sub(r"[^a-z0-9]", "", col.lower()) == compact:
                                intent["filter_cols"].append(col)
                                intent["confidence"] = 0.85
                                break
                        if intent["filter_cols"]:
                            break

    # Auto-infer group and metric columns when not explicitly mentioned
    if intent["type"] in ("ranking_count", "breakdown") and not intent["group_cols"]:
        subject = _find_subject(q_lower, categorical, df)
        if subject:
            intent["group_cols"] = [subject]
            intent["confidence"] = max(intent["confidence"], 0.8)

    if intent["type"] in ("ranking_metric", "aggregate", "trend") and not intent["metric_cols"]:
        metric = _infer_metric(q_lower, numeric)
        if metric:
            intent["metric_cols"] = [metric]
            intent["confidence"] = max(intent["confidence"], 0.8)

    if intent["type"] in ("ranking_metric",) and not intent["group_cols"]:
        subject = _find_subject(q_lower, categorical, df)
        if subject:
            intent["group_cols"] = [subject]

    # "Which X has the most orders/items/entries" — if metric_col is an ID column
    # or the word "orders"/"items"/"entries" suggests counting, switch to count
    if intent["type"] == "ranking_metric" and intent["group_cols"]:
        count_words = {"orders", "items", "entries", "records", "transactions", "purchases", "sales"}
        q_words = set(re.findall(r'\b\w+\b', q_lower))
        if count_words & q_words:
            if not intent["metric_cols"] or (
                intent["metric_cols"] and any(w in intent["metric_cols"][0].lower() for w in ("id", "index", "key"))
            ):
                intent["type"] = "ranking_count"
                intent["metric_cols"] = []
                intent["confidence"] = 0.85

    if intent["type"] == "group_analysis":
        if not intent["metric_cols"] and numeric:
            metric = _infer_metric(q_lower, numeric)
            intent["metric_cols"] = [metric] if metric else [numeric[0]]
        if not intent["group_cols"]:
            subject = _find_subject(q_lower, categorical, df)
            if subject:
                intent["group_cols"] = [subject]

    # Trend needs a date column
    if intent["type"] == "trend":
        if date:
            intent["params"]["date_col"] = date[0]
        else:
            for col in df.columns:
                if any(w in col.lower() for w in ("date", "time", "created", "day", "month", "year")):
                    try:
                        df[col] = pd.to_datetime(df[col], errors="raise")
                        intent["params"]["date_col"] = col
                        break
                    except Exception:
                        continue

    # Comparison: extract the values being compared
    if intent["type"] == "comparison":
        intent["params"]["compare_values"] = _extract_comparison_values(q_lower, df, categorical)
        if not intent["group_cols"] and intent["params"]["compare_values"]:
            for col in categorical:
                vals_lower = set(df[col].dropna().astype(str).str.lower().unique())
                matches = sum(1 for v in intent["params"]["compare_values"] if v.lower() in vals_lower)
                if matches >= 2:
                    intent["group_cols"] = [col]
                    intent["confidence"] = 0.9
                    break

    # If still unknown, try smart defaults
    if intent["type"] == "unknown":
        if intent["metric_cols"] and intent["group_cols"]:
            intent["type"] = "group_analysis"
            intent["confidence"] = 0.75
        elif intent["metric_cols"]:
            intent["type"] = "aggregate"
            intent["confidence"] = 0.7
        elif intent["group_cols"]:
            intent["type"] = "ranking_count"
            intent["confidence"] = 0.7
        else:
            intent["type"] = "summary"
            intent["confidence"] = 0.5

    return intent


def _find_subject(question: str, categorical: list[str], df: pd.DataFrame) -> str | None:
    """Find which categorical column the question is asking about."""
    # Check for column name references
    for col in categorical:
        col_lower = col.lower()
        col_spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", col).lower()
        col_under = col.lower().replace("_", " ")
        if any(p in question for p in [col_lower, col_spaced, col_under] if len(p) >= 3):
            return col

    # Check synonyms
    for syn_key, syns in COLUMN_SYNONYMS.items():
        if syn_key in question:
            for s in syns:
                compact = re.sub(r"[^a-z0-9]", "", s)
                for col in categorical:
                    if re.sub(r"[^a-z0-9]", "", col.lower()) == compact:
                        return col

    # Check if any column VALUES appear in the question
    for col in categorical:
        if df[col].nunique() <= 20:
            vals = df[col].dropna().astype(str).str.lower().unique()
            for v in vals:
                if len(v) >= 3 and v in question:
                    return col

    return None


def _infer_metric(question: str, numeric: list[str]) -> str | None:
    """Infer which numeric column the question refers to."""
    for col in numeric:
        col_lower = col.lower()
        col_spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", col).lower()
        col_under = col.lower().replace("_", " ")
        if any(p in question for p in [col_lower, col_spaced, col_under] if len(p) >= 3):
            return col

    # Check synonyms
    for syn_key, syns in COLUMN_SYNONYMS.items():
        if syn_key in question:
            for s in syns:
                compact = re.sub(r"[^a-z0-9]", "", s)
                for col in numeric:
                    if re.sub(r"[^a-z0-9]", "", col.lower()) == compact:
                        return col

    # For revenue-related queries, find the best revenue column
    revenue_words = {"revenue", "sales", "income", "earned", "generated", "money", "amount"}
    if revenue_words & set(question.split()):
        for col in numeric:
            cl = col.lower()
            if any(w in cl for w in ("price", "revenue", "sales", "amount", "total")):
                return col

    return None


def _extract_comparison_values(question: str, df: pd.DataFrame, categorical: list[str]) -> list[str]:
    """Extract specific values being compared in the question."""
    values = []
    for col in categorical:
        if df[col].nunique() <= 50:
            col_vals = df[col].dropna().astype(str).unique()
            for v in col_vals:
                if v.lower() in question and len(v) >= 2:
                    values.append(v)
    return values


# ---------------------------------------------------------------------------
#  Chart Selection
# ---------------------------------------------------------------------------

def _select_chart(intent_type: str, group_col: str | None, metric_col: str | None,
                  result_df: pd.DataFrame, date_col: str | None = None) -> dict[str, Any] | None:
    if result_df.empty:
        return None

    n_rows = len(result_df)

    if intent_type == "trend" and date_col:
        return {"type": "line", "title": f"{metric_col or 'Value'} Over Time",
                "x": date_col, "y": metric_col, "data": _records(result_df.head(100))}

    if intent_type == "correlation":
        cols = _numeric_cols(result_df)
        if len(cols) >= 2:
            return {"type": "scatter", "title": f"{cols[0]} vs {cols[1]}",
                    "x": cols[0], "y": cols[1], "data": _records(result_df.head(200))}

    if group_col and metric_col:
        if n_rows <= 6:
            return {"type": "pie", "title": f"{metric_col} by {group_col}",
                    "x": group_col, "y": metric_col, "data": _records(result_df)}
        return {"type": "bar", "title": f"{metric_col} by {group_col}",
                "x": group_col, "y": metric_col, "data": _records(result_df.head(20))}

    if group_col and "count" in result_df.columns:
        y_col = "count"
        if n_rows <= 6:
            return {"type": "pie", "title": f"Count by {group_col}",
                    "x": group_col, "y": y_col, "data": _records(result_df)}
        return {"type": "bar", "title": f"Count by {group_col}",
                "x": group_col, "y": y_col, "data": _records(result_df.head(20))}

    return None


# ---------------------------------------------------------------------------
#  Insight Generation
# ---------------------------------------------------------------------------

def _generate_insights(result_df: pd.DataFrame, intent: dict, df_full: pd.DataFrame) -> list[str]:
    insights = []
    group_col = intent["group_cols"][0] if intent["group_cols"] else None
    metric_col = intent["metric_cols"][0] if intent["metric_cols"] else None

    if group_col and not result_df.empty:
        value_col = metric_col or ("count" if "count" in result_df.columns else None)
        if value_col and value_col in result_df.columns:
            sorted_df = result_df.sort_values(value_col, ascending=False)
            if len(sorted_df) >= 1:
                top_row = sorted_df.iloc[0]
                insights.append(
                    f"Top {group_col}: {top_row[group_col]} with {_format_number(top_row[value_col])} {value_col}."
                )
            if len(sorted_df) >= 2:
                bottom_row = sorted_df.iloc[-1]
                insights.append(
                    f"Lowest {group_col}: {bottom_row[group_col]} with {_format_number(bottom_row[value_col])} {value_col}."
                )
            if len(sorted_df) >= 2 and pd.api.types.is_numeric_dtype(sorted_df[value_col]):
                total = sorted_df[value_col].sum()
                if total > 0:
                    top_pct = (sorted_df.iloc[0][value_col] / total) * 100
                    insights.append(f"{sorted_df.iloc[0][group_col]} accounts for {top_pct:.1f}% of total {value_col}.")

    # Add return rate insight if relevant
    boolean = _boolean_cols(df_full)
    if boolean and any("return" in b.lower() for b in boolean):
        ret_col = next(b for b in boolean if "return" in b.lower())
        series = df_full[ret_col]
        if pd.api.types.is_string_dtype(series) or series.dtype == "object":
            true_count = series.astype(str).str.lower().isin(["yes", "true", "1", "y"]).sum()
        else:
            true_count = series.sum()
        total = len(df_full)
        if total > 0:
            rate = (true_count / total) * 100
            insights.append(f"Overall return rate: {rate:.1f}% ({int(true_count)} of {total} orders).")

    return insights


# ---------------------------------------------------------------------------
#  SQL Generation (descriptive, not executed)
# ---------------------------------------------------------------------------

def _generate_sql(intent: dict, table_name: str = "data") -> str | None:
    itype = intent["type"]
    group_col = intent["group_cols"][0] if intent["group_cols"] else None
    metric_col = intent["metric_cols"][0] if intent["metric_cols"] else None
    agg = intent["aggregation"]
    limit = intent.get("limit")
    direction = "DESC" if intent["sort_direction"] == "desc" else "ASC"

    if itype in ("ranking_count", "breakdown") and group_col:
        sql = f'SELECT "{group_col}", COUNT(*) AS count FROM {table_name} GROUP BY "{group_col}" ORDER BY count {direction}'
        if limit:
            sql += f" LIMIT {limit}"
        return sql

    if itype in ("ranking_metric", "group_analysis", "top_n") and group_col and metric_col:
        sql = f'SELECT "{group_col}", {agg.upper()}("{metric_col}") AS {agg}_{metric_col} FROM {table_name} GROUP BY "{group_col}" ORDER BY {agg}_{metric_col} {direction}'
        if limit:
            sql += f" LIMIT {limit}"
        return sql

    if itype == "aggregate" and metric_col:
        return f'SELECT {agg.upper()}("{metric_col}") AS result FROM {table_name}'

    if itype == "count":
        if intent["filter_cols"]:
            fc = intent["filter_cols"][0]
            return f'SELECT COUNT(*) FROM {table_name} WHERE "{fc}" = TRUE'
        return f"SELECT COUNT(*) FROM {table_name}"

    if itype == "comparison" and group_col:
        vals = intent["params"].get("compare_values", [])
        where = ""
        if vals:
            val_list = ", ".join(f"'{v}'" for v in vals)
            where = f' WHERE "{group_col}" IN ({val_list})'
        metrics = f'COUNT(*) AS count'
        if metric_col:
            metrics += f', SUM("{metric_col}") AS total_{metric_col}, AVG("{metric_col}") AS avg_{metric_col}'
        return f'SELECT "{group_col}", {metrics} FROM {table_name}{where} GROUP BY "{group_col}"'

    return None


# ---------------------------------------------------------------------------
#  Plan Execution
# ---------------------------------------------------------------------------

def _execute_intent(df: pd.DataFrame, intent: dict) -> dict[str, Any]:
    itype = intent["type"]
    group_col = intent["group_cols"][0] if intent["group_cols"] else None
    metric_col = intent["metric_cols"][0] if intent["metric_cols"] else None
    agg = intent["aggregation"]
    limit = intent.get("limit") or 10
    direction = intent["sort_direction"] == "desc"

    # -- Schema --
    if itype == "schema":
        result = pd.DataFrame({
            "column": df.columns,
            "dtype": [str(df[c].dtype) for c in df.columns],
            "non_null": [int(df[c].notna().sum()) for c in df.columns],
            "unique": [int(df[c].nunique(dropna=True)) for c in df.columns],
            "sample": [str(df[c].dropna().iloc[0]) if df[c].notna().any() else "" for c in df.columns],
        })
        return _build_response(
            f"The dataset has {len(df):,} rows and {len(df.columns)} columns.",
            result, intent, df
        )

    # -- Summary --
    if itype == "summary":
        numeric = _numeric_cols(df)
        categorical = _categorical_cols(df)
        parts = [f"Dataset: {len(df):,} rows, {len(df.columns)} columns."]
        for col in numeric[:5]:
            parts.append(f"  {col}: sum={_format_number(df[col].sum())}, avg={_format_number(df[col].mean())}, min={_format_number(df[col].min())}, max={_format_number(df[col].max())}")
        for col in categorical[:3]:
            top_val = df[col].value_counts().index[0] if not df[col].value_counts().empty else "N/A"
            parts.append(f"  {col}: {df[col].nunique()} unique values, most common: {top_val}")
        desc = df.describe(include="all").reset_index().fillna("")
        return _build_response("\n".join(parts), desc, intent, df)

    # -- Count (with optional boolean filter) --
    if itype == "count":
        if intent["filter_cols"]:
            fc = intent["filter_cols"][0]
            series = df[fc]
            if pd.api.types.is_string_dtype(series) or series.dtype == "object":
                count = int(series.astype(str).str.lower().isin(["yes", "true", "1", "y"]).sum())
            elif series.dtype == bool:
                count = int(series.sum())
            else:
                count = int((series > 0).sum())
            total = len(df)
            rate = (count / total * 100) if total else 0
            result_df = pd.DataFrame([{"metric": f"{fc} count", "value": count, "total": total, "rate_pct": round(rate, 1)}])
            return _build_response(
                f"{count:,} out of {total:,} records have {fc} = Yes ({rate:.1f}%).",
                result_df, intent, df
            )
        else:
            return _build_response(
                f"The dataset has {len(df):,} rows.",
                pd.DataFrame([{"count": len(df)}]), intent, df
            )

    # -- Ranking by count (most popular, etc.) --
    if itype == "ranking_count" and group_col:
        counts = df[group_col].value_counts(dropna=False).reset_index()
        counts.columns = [group_col, "count"]
        if not direction:
            counts = counts.sort_values("count", ascending=True)
        result = counts.head(limit)
        top = result.iloc[0]
        return _build_response(
            f"The most {'popular' if direction else 'rare'} {group_col} is \"{top[group_col]}\" with {top['count']:,} occurrences.",
            result, intent, df, chart=_select_chart(itype, group_col, None, result)
        )

    # -- Ranking by metric (highest revenue, etc.) --
    if itype == "ranking_metric" and group_col:
        if not metric_col:
            numeric = _numeric_cols(df)
            metric_col = _infer_metric(intent.get("_question", ""), numeric) or (numeric[0] if numeric else None)
            if metric_col:
                intent["metric_cols"] = [metric_col]
        if not metric_col:
            return _ambiguous_response(df, intent, "I need a numeric column to rank by. Which metric did you mean?")

        grouped = df.groupby(group_col, dropna=False)[metric_col].agg(agg).reset_index()
        grouped.columns = [group_col, metric_col]
        grouped = grouped.sort_values(metric_col, ascending=not direction).head(limit)
        top = grouped.iloc[0]
        return _build_response(
            f"The {group_col} with the {'highest' if direction else 'lowest'} {agg} {metric_col} is \"{top[group_col]}\" at {_format_number(top[metric_col])}.",
            grouped, intent, df, chart=_select_chart(itype, group_col, metric_col, grouped)
        )

    # -- Top/Bottom N --
    if itype == "top_n":
        n = intent.get("limit") or 10
        if group_col and metric_col:
            grouped = df.groupby(group_col, dropna=False)[metric_col].agg(agg).reset_index()
            grouped.columns = [group_col, metric_col]
            grouped = grouped.sort_values(metric_col, ascending=not direction).head(n)
            return _build_response(
                f"{'Top' if direction else 'Bottom'} {n} {group_col} by {agg} {metric_col}:",
                grouped, intent, df, chart=_select_chart(itype, group_col, metric_col, grouped)
            )
        elif group_col:
            counts = df[group_col].value_counts().head(n).reset_index()
            counts.columns = [group_col, "count"]
            if not direction:
                counts = counts.sort_values("count", ascending=True).head(n)
            return _build_response(
                f"{'Top' if direction else 'Bottom'} {n} {group_col} by count:",
                counts, intent, df, chart=_select_chart(itype, group_col, None, counts)
            )
        elif metric_col:
            sorted_df = df.sort_values(metric_col, ascending=not direction).head(n)
            return _build_response(
                f"{'Top' if direction else 'Bottom'} {n} rows by {metric_col}:",
                sorted_df, intent, df
            )

    # -- Aggregate (total, average, etc.) --
    if itype == "aggregate":
        if not metric_col:
            return _ambiguous_response(df, intent, f"Which column should I calculate the {agg} of? Available numeric columns: {', '.join(_numeric_cols(df))}")
        if group_col:
            grouped = df.groupby(group_col, dropna=False)[metric_col].agg(agg).reset_index()
            grouped.columns = [group_col, metric_col]
            grouped = grouped.sort_values(metric_col, ascending=False)
            return _build_response(
                f"{agg.title()} of {metric_col} by {group_col}:",
                grouped, intent, df, chart=_select_chart(itype, group_col, metric_col, grouped)
            )
        else:
            value = getattr(df[metric_col], agg)()
            return _build_response(
                f"The {agg} of {metric_col} is {_format_number(value)}.",
                pd.DataFrame([{"metric": f"{agg}_{metric_col}", "value": _json_safe(value)}]),
                intent, df
            )

    # -- Group Analysis --
    if itype == "group_analysis" and group_col:
        if metric_col:
            grouped = df.groupby(group_col, dropna=False)[metric_col].agg(agg).reset_index()
            grouped.columns = [group_col, metric_col]
            grouped = grouped.sort_values(metric_col, ascending=False)
        else:
            grouped = df[group_col].value_counts(dropna=False).reset_index()
            grouped.columns = [group_col, "count"]
        return _build_response(
            f"{'Breakdown' if not metric_col else f'{agg.title()} of {metric_col}'} by {group_col}:",
            grouped, intent, df, chart=_select_chart(itype, group_col, metric_col or "count", grouped)
        )

    # -- Breakdown --
    if itype == "breakdown" and group_col:
        if metric_col:
            grouped = df.groupby(group_col, dropna=False)[metric_col].agg(agg).reset_index()
            grouped.columns = [group_col, metric_col]
            total = grouped[metric_col].sum()
            if total > 0:
                grouped["percentage"] = (grouped[metric_col] / total * 100).round(1)
            grouped = grouped.sort_values(metric_col, ascending=False)
        else:
            grouped = df[group_col].value_counts(dropna=False).reset_index()
            grouped.columns = [group_col, "count"]
            total = grouped["count"].sum()
            if total > 0:
                grouped["percentage"] = (grouped["count"] / total * 100).round(1)
        return _build_response(
            f"Distribution breakdown by {group_col}:",
            grouped, intent, df, chart=_select_chart(itype, group_col, metric_col or "count", grouped)
        )

    # -- Comparison --
    if itype == "comparison" and group_col:
        compare_vals = intent["params"].get("compare_values", [])
        working = df
        if compare_vals:
            working = df[df[group_col].astype(str).str.lower().isin([v.lower() for v in compare_vals])]

        numeric = _numeric_cols(working)
        agg_dict = {}
        for nc in numeric[:5]:
            agg_dict[nc] = ["sum", "mean", "count"]

        if agg_dict:
            comp = working.groupby(group_col).agg(agg_dict)
            comp.columns = [f"{agg}_{col}" for col, agg in comp.columns]
            comp = comp.reset_index()
        else:
            comp = working[group_col].value_counts().reset_index()
            comp.columns = [group_col, "count"]

        return _build_response(
            f"Comparison across {group_col} values{(' (' + ', '.join(compare_vals) + ')') if compare_vals else ''}:",
            comp, intent, df, chart=_select_chart(itype, group_col, metric_col, comp) if metric_col else None
        )

    # -- Trend --
    if itype == "trend":
        date_col = intent["params"].get("date_col")
        if not date_col:
            return _ambiguous_response(df, intent, "No date/time column found for trend analysis.")
        if not metric_col:
            numeric = _numeric_cols(df)
            metric_col = numeric[0] if numeric else None
        if not metric_col:
            return _ambiguous_response(df, intent, "No numeric column found for trend analysis.")

        trend = df[[date_col, metric_col]].dropna().sort_values(date_col)
        trend["period"] = trend[date_col].dt.to_period("M").astype(str)
        trend_agg = trend.groupby("period")[metric_col].sum().reset_index()
        trend_agg.columns = ["period", metric_col]

        chart = {"type": "line", "title": f"{metric_col} Over Time",
                 "x": "period", "y": metric_col, "data": _records(trend_agg)}

        parts = [f"{metric_col} trend over {len(trend_agg)} periods."]
        if len(trend_agg) >= 2:
            first, last = trend_agg[metric_col].iloc[0], trend_agg[metric_col].iloc[-1]
            if first and first != 0:
                pct = (last - first) / abs(first) * 100
                parts.append(f"Change from first to last period: {pct:+.1f}%.")

        return _build_response("\n".join(parts), trend_agg, intent, df, chart=chart)

    # -- Correlation --
    if itype == "correlation":
        numeric = _numeric_cols(df)
        if len(intent["metric_cols"]) >= 2:
            x, y = intent["metric_cols"][0], intent["metric_cols"][1]
        elif len(numeric) >= 2:
            x, y = numeric[0], numeric[1]
        else:
            return _ambiguous_response(df, intent, "Need at least 2 numeric columns for correlation analysis.")

        corr = df[[x, y]].corr().iloc[0, 1]
        strength = "strong" if abs(corr) > 0.6 else "moderate" if abs(corr) > 0.3 else "weak"
        sample = df[[x, y]].dropna().head(200)
        chart = {"type": "scatter", "title": f"{x} vs {y}", "x": x, "y": y, "data": _records(sample)}
        return _build_response(
            f"{x} and {y} have a {strength} correlation (r={corr:.3f}).",
            df[numeric].corr().reset_index().rename(columns={"index": "column"}),
            intent, df, chart=chart
        )

    # -- Filter --
    if itype == "filter":
        return _build_response(
            f"Showing filtered data ({len(df):,} rows).",
            df.head(100), intent, df
        )

    # -- Fallback: try LLM --
    return _llm_fallback(df, intent)


# ---------------------------------------------------------------------------
#  Response builders
# ---------------------------------------------------------------------------

def _build_response(answer: str, table: pd.DataFrame, intent: dict, df_full: pd.DataFrame,
                    chart: dict | None = None) -> dict[str, Any]:
    charts = [chart] if chart else []
    insights = _generate_insights(table, intent, df_full)
    sql = _generate_sql(intent)

    return {
        "answer": answer,
        "table": _records(table.head(200)),
        "columns": list(table.columns),
        "charts": charts,
        "insights": insights,
        "sql": sql,
        "confidence": intent.get("confidence", 0.5),
    }


def _ambiguous_response(df: pd.DataFrame, intent: dict, message: str) -> dict[str, Any]:
    numeric = _numeric_cols(df)
    categorical = _categorical_cols(df)
    suggestions = []
    if numeric:
        suggestions.append(f"Numeric columns: {', '.join(numeric[:8])}")
    if categorical:
        suggestions.append(f"Categorical columns: {', '.join(categorical[:8])}")

    return {
        "answer": f"{message}\n\n{chr(10).join(suggestions)}",
        "table": [],
        "columns": [],
        "charts": [],
        "insights": [],
        "sql": None,
        "confidence": 0.3,
    }


# ---------------------------------------------------------------------------
#  LLM fallback
# ---------------------------------------------------------------------------

def _client():
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=12.0, max_retries=0)
    except Exception:
        return None


def _dataset_profile(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "row_count": int(len(df)),
        "columns": list(df.columns),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "numeric_columns": _numeric_cols(df),
        "categorical_columns": _categorical_cols(df),
        "date_columns": _date_cols(df),
        "sample": _records(df.head(5)),
    }


def _llm_fallback(df: pd.DataFrame, intent: dict) -> dict[str, Any]:
    client = _client()
    if not client:
        return _ambiguous_response(df, intent,
            "I couldn't determine how to answer this question. Try being more specific about which columns to analyze.")

    question = intent.get("_question", "Analyze this data")
    profile = _dataset_profile(df)

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": (
                "You are a data analyst. Answer the question using ONLY the provided dataset profile and sample. "
                "Be specific and quantitative. If you can't answer from the data, say so."
            )},
            {"role": "user", "content": (
                f"Dataset profile:\n{json.dumps(profile, default=str)}\n\nQuestion: {question}"
            )},
        ],
        temperature=0.2,
        max_tokens=500,
    )
    answer = (response.choices[0].message.content or "").strip()
    return {
        "answer": answer,
        "table": _records(df.head(20)),
        "columns": list(df.columns),
        "charts": [],
        "insights": [answer],
        "sql": None,
        "confidence": 0.6,
    }


# ---------------------------------------------------------------------------
#  Main entry point
# ---------------------------------------------------------------------------

def run_query(df: pd.DataFrame, question: str) -> dict[str, Any]:
    normalized = _normalize_dataframe(df)
    intent = _classify_intent(question, normalized)
    intent["_question"] = question

    try:
        result = _execute_intent(normalized, intent)
        result.setdefault("confidence", intent.get("confidence", 0.5))
        return result
    except Exception as exc:
        return {
            "answer": f"Error analyzing data: {exc}",
            "table": _records(normalized.head(10)),
            "columns": list(normalized.columns),
            "charts": [],
            "insights": [],
            "sql": None,
            "confidence": 0.1,
        }
