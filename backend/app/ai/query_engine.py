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
    # Show data / sample rows (must be checked before generic patterns)
    (r"\b(first|show|display|list|view|print|give me|see)\b.*\b(\d+)\s*(rows?|records?|entries|items|lines|data points?)\b", "show_data", {}),
    (r"\b(\d+)\s*(rows?|records?|entries|items|lines)\b.*\b(first|show|display|data|of)\b", "show_data", {}),
    (r"\b(show|display|view|print|give me|see|list)\b.{0,12}\b(data|rows?|records?|table|all data|all rows|sample|head)\b", "show_data", {}),
    (r"\b(first|last|head|tail|sample|preview)\s+(\d+)?\s*(rows?|records?|entries|data)?\b", "show_data", {}),
    (r"\b(head|tail|sample|preview)\b", "show_data", {}),

    # Unique values
    (r"\b(unique|distinct|list all|all\s+(?:unique|distinct|different)|different)\b.*\b(values?|categories|types|kinds|options|names?)\b", "unique_values", {}),

    # Ranking
    (r"\b(most popular|most common|most frequent\w*|most ordered|most used)\b", "ranking_count", {"sort": "desc"}),
    (r"\b(least popular|least common|least frequent\w*|least ordered|least used)\b", "ranking_count", {"sort": "asc"}),
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

    # Time-of-day / day-of-week analysis (must be before trend and ranking)
    (r"\b(busiest|slowest|peak|quietest|least busy)\b.*\b(hour|time|period)\b", "time_analysis", {"granularity": "hour"}),
    (r"\b(busiest|slowest|peak|quietest|least busy)\b.*\b(day|weekday|day of week)\b", "time_analysis", {"granularity": "dayofweek"}),
    (r"\b(busiest|slowest|peak|quietest|least busy)\b.*\b(month)\b", "time_analysis", {"granularity": "month"}),
    (r"\border[s ]?\b.*\bby\s+(hour|time of day)\b", "time_analysis", {"granularity": "hour"}),
    (r"\border[s ]?\b.*\bby\s+(day of week|weekday|day)\b", "time_analysis", {"granularity": "dayofweek"}),
    (r"\b(hourly|per hour)\b.*(distribution|breakdown|trend|sales|orders?|volume|traffic)\b", "time_analysis", {"granularity": "hour"}),
    (r"\b(distribution|breakdown|trend|sales|orders?|volume|traffic)\b.*(hourly|per hour|by hour)\b", "time_analysis", {"granularity": "hour"}),
    (r"\bwhat\s+(hour|time)\b.*\b(most|busiest|peak|highest)\b", "time_analysis", {"granularity": "hour"}),
    (r"\b(most|busiest|peak|highest)\b.*\b(hour|time of day)\b", "time_analysis", {"granularity": "hour"}),
    (r"\bwhen\b.*\b(busiest|most|peak|highest|orders?|sales)\b", "time_analysis", {"granularity": "hour"}),
    (r"\bwhich\s+hour\b", "time_analysis", {"granularity": "hour"}),
    (r"\bwhich\s+(day|weekday)\b.*\b(most|busiest|highest)\b", "time_analysis", {"granularity": "dayofweek"}),
    (r"\bwhich\s+month\b.*\b(most|busiest|highest)\b", "time_analysis", {"granularity": "month"}),

    # Trend
    (r"\b(trend|over time|monthly|weekly|daily|yearly|by month|by year|by week|by day|time series|growth)\b", "trend", {}),

    # Distribution / Breakdown
    (r"\b(distribution|breakdown|split|composition|proportion|share)\b", "breakdown", {}),
    (r"\b(percentage|percent)\b.*\b(each|every|by|per|from|across)\b", "breakdown", {}),
    (r"\b(each|every)\b.*\b(percentage|percent|share|proportion)\b", "breakdown", {}),
    (r"\b(by|per|for each|group by|grouped by|across)\b", "group_analysis", {}),

    # Correlation
    (r"\b(corr?e?l[aei]?t\w*|core?l[aei]?t\w*|relationship between|relate|correlated|scatter|crosstab|cross.?tab|contingency|cram[eé]r|chi.?square?d?|association between)\b", "correlation", {}),
    (r"\bdoes\b.*\b(higher|lower|more|less|increase|decrease|reduce|affect|impact|influence)\b.*\b(price|cost|quantity|demand|sales|revenue|order)\b", "correlation", {}),

    # Filtering
    (r"\b(where|filter|only|excluding|include only|greater than|less than|between|equal to)\b", "filter", {}),

    # --- Advanced analysis (LLM code-generation) ---
    # Scenario / What-if / Simulate
    (r"\b(what if|if we|what would happen|simulat\w*|scenario|impact of)\b", "advanced_analysis", {}),
    (r"\b(increase|decrease|raise|reduce|discount|remove|discontinue\w*)\b.{0,30}\b(\d+\s*%|percent|price|revenue|cost)\b", "advanced_analysis", {}),
    # Hypothesis testing
    (r"\b(significan\w*\s+(different|affect|impact|more|less|higher|lower)|hypothesis|t[- ]?test|anova|p[- ]?value|chi[- ]?square|mann[- ]?whitney|kruskal)\b", "advanced_analysis", {}),
    # Pareto
    (r"\b(pareto|80.?20|eighty.?twenty)\b", "advanced_analysis", {}),
    (r"\bcontribute\w*\s+to\s+\d+\s*%", "advanced_analysis", {}),
    (r"\b\d+\s*%\s*of\s*\w+\s*(generate|produce|account|contribute|make)", "advanced_analysis", {}),
    # Market basket
    (r"\b(bought together|purchased together|frequently.{0,10}together|basket|co.?occur\w*|same order)\b", "advanced_analysis", {}),
    # Forecasting
    (r"\b(predict\w*|forecast\w*|estimate.{0,10}next|project\w*|next month|next quarter|next year|future)\b", "advanced_analysis", {}),
    # Elasticity / Volatility / Anomaly
    (r"\b(elasticit\w*|volatilit\w*|anomal\w*|outlier\w*|unusual|abnormal)\b", "advanced_analysis", {}),
    # Segmentation / Clustering
    (r"\b(segment\w*|cluster\w*|group.{0,8}into|categorize.{0,8}into|classify.{0,8}into|tier\w*)\b", "advanced_analysis", {}),
    # Revenue optimization / strategy / discontinue
    (r"\b(discontinue\w*|optimize\w*|maximiz\w*|minimiz\w*|bundle\w*|promot\w*.{0,10}(revenue|profit|sales))\b", "advanced_analysis", {}),
    # Underperforming / declining
    (r"\b(underperform\w*|overperform\w*|declining|declin\w*\s+trend|struggling)\b", "advanced_analysis", {}),
    # Weighted ranking / composite score
    (r"\b(ranking score|weighted\s+score|composite|scoring|index.*weight)\b", "advanced_analysis", {}),
    # Complex multi-step (among, within + which/find)
    (r"\b(among|priced above|priced below|contribute less|contribute more|high.{0,10}but.{0,10}low|low.{0,10}but.{0,10}high)\b", "advanced_analysis", {}),
    # Combination analysis
    (r"\bcombination\b.*\b(highest|lowest|best|worst|most|least)\b", "advanced_analysis", {}),
    (r"\b(highest|lowest|best|worst|most|least)\b.*\bcombination\b", "advanced_analysis", {}),
    # Weekday vs weekend
    (r"\bweekday\w*\s*(vs\.?|versus|compared?\s*to|against)\s*weekend\w*\b", "advanced_analysis", {}),
    (r"\bweekend\w*\s*(vs\.?|versus|compared?\s*to|against)\s*weekday\w*\b", "advanced_analysis", {}),

    # AI analysis — open-ended questions that need GPT reasoning
    (r"\b(why|recommend|strategy|suggest|advice|story|concern|concerning|takeaway|takeaways|insight|insights|explain why|root cause|opinion|think|should i|would you|improve|opportunity|opportunities|risk|weakness|strength|pros and cons|action items|actionable)\b", "ai_analysis", {}),

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
    result = []
    for c in df.columns:
        if c in excluded:
            continue
        try:
            if df[c].nunique() <= 200:
                result.append(c)
        except TypeError:
            pass
    return result


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

    # Convert columns containing unhashable types (lists, dicts) to strings
    for col in normalized.columns:
        if normalized[col].dtype == "object":
            sample = normalized[col].dropna().head(50)
            if sample.apply(lambda x: isinstance(x, (list, dict, set))).any():
                normalized[col] = normalized[col].apply(lambda x: str(x) if isinstance(x, (list, dict, set)) else x)

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
    for col, (_,  _score) in col_refs.items():
        if col in numeric:
            intent["metric_cols"].append(col)
        elif col in categorical or col in boolean:
            intent["group_cols"].append(col)

    # Match against intent patterns (first specific match wins for count vs metric)
    for pattern, intent_type, params in INTENT_PATTERNS:
        match = re.search(pattern, q_lower)
        if match:
            # show_data / unique_values / ai_analysis are high-priority — once matched, skip weaker patterns
            if intent["type"] in ("show_data", "unique_values", "ai_analysis", "time_analysis"):
                continue
            # ranking_count is more specific than ranking_metric — don't let
            # a generic "most" override an already-matched "most popular"
            if intent["type"] == "ranking_count" and intent_type == "ranking_metric":
                continue
            if intent["type"] == "unknown" or intent_type in ("show_data", "unique_values", "ai_analysis", "ranking_count", "ranking_metric", "top_n", "comparison", "trend", "correlation", "time_analysis", "advanced_analysis"):
                intent["type"] = intent_type
                intent["confidence"] = 0.85 if intent_type not in ("show_data", "unique_values", "ai_analysis") else 0.95
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
            intent["type"] = "advanced_analysis"
            intent["confidence"] = 0.6

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
#  Categorical Correlation (Chi-Square + Cramér's V + cross-tabulation)
# ---------------------------------------------------------------------------

def _chi_square_test(contingency_table: pd.DataFrame) -> dict[str, Any]:
    try:
        from scipy.stats import chi2_contingency
        chi2, p, dof, expected = chi2_contingency(contingency_table)
        return {"chi2": float(chi2), "p": float(p), "dof": int(dof),
                "expected": expected, "method": "scipy"}
    except ImportError:
        observed = contingency_table.values.astype(float)
        row_sums = observed.sum(axis=1, keepdims=True)
        col_sums = observed.sum(axis=0, keepdims=True)
        n = observed.sum()
        if n == 0:
            return {"chi2": 0.0, "p": 1.0, "dof": 0, "expected": observed, "method": "numpy"}
        expected = row_sums * col_sums / n
        dof = (observed.shape[0] - 1) * (observed.shape[1] - 1)
        with np.errstate(divide="ignore", invalid="ignore"):
            chi2 = float(np.nansum((observed - expected) ** 2 / np.where(expected == 0, 1, expected)))
        try:
            from scipy.stats import chi2 as chi2_dist
            p = float(1 - chi2_dist.cdf(chi2, dof)) if dof > 0 else 1.0
        except ImportError:
            p = 0.0 if chi2 > 20 else 1.0
        return {"chi2": chi2, "p": p, "dof": dof, "expected": expected, "method": "numpy"}


def _cramers_v_from_chi2(chi2: float, n: float, min_dim: int) -> float:
    if min_dim == 0 or n == 0:
        return 0.0
    return float(np.sqrt(chi2 / (n * min_dim)))


def _categorical_correlation(df: pd.DataFrame, col_a: str, col_b: str, intent: dict) -> dict[str, Any]:
    ct = pd.crosstab(df[col_a], df[col_b])
    n = int(ct.sum().sum())

    stats = _chi_square_test(ct)
    chi2, p_value, dof = stats["chi2"], stats["p"], stats["dof"]

    min_dim = min(ct.shape[0], ct.shape[1]) - 1
    v = _cramers_v_from_chi2(chi2, n, min_dim)
    strength = "strong" if v > 0.5 else "moderate" if v > 0.25 else "weak"

    significant = p_value < 0.05
    sig_text = "statistically significant" if significant else "not statistically significant"

    # -- Build answer text --
    answer_parts = [
        f"Relationship between {col_a} and {col_b}:",
        "",
        f"1. Chi-Square Test:",
        f"   Chi-Square statistic = {chi2:,.2f}",
        f"   Degrees of freedom = {dof}",
        f"   P-value = {p_value:.4f}" if p_value >= 0.0001 else f"   P-value < 0.0001",
        f"   Result: The relationship is {sig_text} (p {'<' if significant else '>'} 0.05).",
        "",
        f"2. Cramér's V (Association Strength):",
        f"   Cramér's V = {v:.3f} ({strength} association)",
        f"   Scale: 0 = no association, 1 = perfect association",
        "",
        f"3. Contingency Table:",
        f"   {ct.shape[0]} {col_a} values × {ct.shape[1]} {col_b} values across {n:,} records.",
    ]
    answer = "\n".join(answer_parts)

    # -- Cross-tab table for the response --
    ct_flat = ct.reset_index()
    ct_flat.columns.name = None

    # -- Stacked data for chart --
    stacked = ct.stack().reset_index()
    stacked.columns = [col_a, col_b, "count"]
    stacked = stacked.sort_values("count", ascending=False)

    chart = {
        "type": "bar",
        "title": f"{col_a} vs {col_b} Distribution",
        "x": col_a,
        "y": "count",
        "data": _records(stacked.head(50)),
    }

    # -- Insights --
    insights = []

    if significant:
        insights.append(
            f"Significant relationship found (p={p_value:.4f}): {col_a} and {col_b} are NOT independent."
        )
    else:
        insights.append(
            f"No significant relationship (p={p_value:.4f}): {col_a} and {col_b} appear to be independent."
        )

    insights.append(f"Cramér's V = {v:.3f} - {strength} association strength.")

    top_combo = stacked.iloc[0] if not stacked.empty else None
    if top_combo is not None:
        insights.append(
            f"Most common combination: {top_combo[col_a]} + {top_combo[col_b]} ({int(top_combo['count']):,} orders)."
        )

    least_combo = stacked.iloc[-1] if len(stacked) > 1 else None
    if least_combo is not None and int(least_combo["count"]) > 0:
        insights.append(
            f"Least common combination: {least_combo[col_a]} + {least_combo[col_b]} ({int(least_combo['count']):,} orders)."
        )

    # Size-specific insights: which category dominates each size
    for size_val in ct.index:
        row = ct.loc[size_val]
        top_cat = row.idxmax()
        top_count = int(row.max())
        total_for_size = int(row.sum())
        if total_for_size > 0:
            pct = top_count / total_for_size * 100
            insights.append(
                f"For {col_a}={size_val}: {top_cat} is most popular ({pct:.1f}%, {top_count:,} of {total_for_size:,})."
            )

    intent["confidence"] = 0.95
    return {
        "answer": answer,
        "table": _records(ct_flat),
        "columns": list(ct_flat.columns),
        "charts": [chart],
        "insights": insights,
        "sql": f'SELECT "{col_a}", "{col_b}", COUNT(*) AS count FROM data GROUP BY "{col_a}", "{col_b}" ORDER BY count DESC',
        "confidence": 0.95,
    }


# ---------------------------------------------------------------------------
#  Time column detection & extraction
# ---------------------------------------------------------------------------

def _find_time_column(df: pd.DataFrame) -> str | None:
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("time", "hour")):
            return col
    return None


def _find_date_column(df: pd.DataFrame) -> str | None:
    date = _date_cols(df)
    if date:
        return date[0]
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("date", "created", "updated", "day")):
            return col
    return None


DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTH_ORDER = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


def _extract_hour(series: pd.Series) -> pd.Series | None:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.hour

    as_dt = pd.to_datetime(series, errors="coerce", format="%H:%M:%S")
    if as_dt.notna().sum() >= len(series) * 0.5:
        return as_dt.dt.hour

    as_dt2 = pd.to_datetime(series, errors="coerce", infer_datetime_format=True)
    if as_dt2.notna().sum() >= len(series) * 0.5:
        return as_dt2.dt.hour

    hour_extracted = series.astype(str).str.extract(r'(\d{1,2}):\d{2}', expand=False)
    as_num = pd.to_numeric(hour_extracted, errors="coerce")
    if as_num.notna().sum() >= len(series) * 0.5:
        return as_num.astype("Int64")

    return None


def _extract_dayofweek(series: pd.Series) -> pd.Series | None:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.day_name()
    as_dt = pd.to_datetime(series, errors="coerce", dayfirst=False)
    if as_dt.notna().sum() >= len(series) * 0.5:
        return as_dt.dt.day_name()
    return None


def _extract_month(series: pd.Series) -> pd.Series | None:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.month_name()
    as_dt = pd.to_datetime(series, errors="coerce", dayfirst=False)
    if as_dt.notna().sum() >= len(series) * 0.5:
        return as_dt.dt.month_name()
    return None


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
#  Time Analysis Execution
# ---------------------------------------------------------------------------

def _execute_time_analysis(df: pd.DataFrame, intent: dict, metric_col: str | None) -> dict[str, Any]:
    granularity = intent["params"].get("granularity", "hour")
    q_lower = intent.get("_question", "").lower()
    is_ascending = any(w in q_lower for w in ("slowest", "quietest", "least busy"))

    if granularity == "hour":
        time_col = _find_time_column(df)
        if not time_col:
            date_col = _find_date_column(df)
            if date_col:
                time_col = date_col
        if not time_col:
            return _ambiguous_response(df, intent, "No time/hour column found in the dataset.")

        hours = _extract_hour(df[time_col])
        if hours is None:
            return _ambiguous_response(df, intent,
                f"Could not extract hours from column '{time_col}'. Expected time format like HH:MM:SS.")

        df_work = df.copy()
        df_work["_hour"] = hours
        label_col, label_name = "_hour", "hour"

    elif granularity == "dayofweek":
        date_col = _find_date_column(df)
        if not date_col:
            return _ambiguous_response(df, intent, "No date column found for day-of-week analysis.")
        days = _extract_dayofweek(df[date_col])
        if days is None:
            return _ambiguous_response(df, intent,
                f"Could not parse dates from column '{date_col}'.")
        df_work = df.copy()
        df_work["_dayofweek"] = days
        label_col, label_name = "_dayofweek", "day_of_week"

    elif granularity == "month":
        date_col = _find_date_column(df)
        if not date_col:
            return _ambiguous_response(df, intent, "No date column found for month analysis.")
        months = _extract_month(df[date_col])
        if months is None:
            return _ambiguous_response(df, intent,
                f"Could not parse dates from column '{date_col}'.")
        df_work = df.copy()
        df_work["_month"] = months
        label_col, label_name = "_month", "month"

    else:
        return _ambiguous_response(df, intent, f"Unsupported time granularity: {granularity}")

    # Build grouped result
    if metric_col and metric_col in df_work.columns:
        grouped = df_work.groupby(label_col, dropna=False).agg(
            order_count=(label_col, "size"),
            total_value=(metric_col, "sum"),
            avg_value=(metric_col, "mean"),
        ).reset_index()
        grouped.columns = [label_name, "order_count", f"total_{metric_col}", f"avg_{metric_col}"]
        grouped[f"avg_{metric_col}"] = grouped[f"avg_{metric_col}"].round(2)
        sort_col = "order_count"
    else:
        grouped = df_work.groupby(label_col, dropna=False).size().reset_index(name="order_count")
        grouped.columns = [label_name, "order_count"]
        sort_col = "order_count"

    # Apply correct sort order for the granularity
    if granularity == "hour":
        grouped = grouped.sort_values(label_name)
    elif granularity == "dayofweek":
        day_rank = {d: i for i, d in enumerate(DAY_ORDER)}
        grouped["_sort"] = grouped[label_name].map(day_rank)
        grouped = grouped.sort_values("_sort").drop(columns=["_sort"])
    elif granularity == "month":
        month_rank = {m: i for i, m in enumerate(MONTH_ORDER)}
        grouped["_sort"] = grouped[label_name].map(month_rank)
        grouped = grouped.sort_values("_sort").drop(columns=["_sort"])

    # Identify peak and slowest
    peak_row = grouped.loc[grouped[sort_col].idxmax()]
    slow_row = grouped.loc[grouped[sort_col].idxmin()]

    # Sorted version for ranking table
    ranked = grouped.sort_values(sort_col, ascending=not True)

    # Format the answer
    if granularity == "hour":
        peak_label = f"{int(peak_row[label_name]):02d}:00 - {int(peak_row[label_name]):02d}:59"
        slow_label = f"{int(slow_row[label_name]):02d}:00 - {int(slow_row[label_name]):02d}:59"
    else:
        peak_label = str(peak_row[label_name])
        slow_label = str(slow_row[label_name])

    total_orders = int(grouped[sort_col].sum())
    peak_count = int(peak_row[sort_col])
    slow_count = int(slow_row[sort_col])
    peak_pct = (peak_count / total_orders * 100) if total_orders > 0 else 0

    gran_label = {"hour": "Hour", "dayofweek": "Day of Week", "month": "Month"}[granularity]

    answer_parts = [
        f"Busiest {gran_label} Analysis ({total_orders:,} total orders):",
        "",
        f"Peak {gran_label}: {peak_label}",
        f"  Orders: {peak_count:,} ({peak_pct:.1f}% of total)",
    ]

    if metric_col and f"total_{metric_col}" in grouped.columns:
        peak_revenue = peak_row[f"total_{metric_col}"]
        answer_parts.append(f"  Total {metric_col}: {_format_number(peak_revenue)}")

    answer_parts += [
        "",
        f"Slowest {gran_label}: {slow_label}",
        f"  Orders: {slow_count:,}",
    ]

    # Top 3 busiest
    top3 = grouped.nlargest(3, sort_col)
    answer_parts.append("")
    answer_parts.append(f"Top 3 Busiest {gran_label}s:")
    for i, (_, row) in enumerate(top3.iterrows(), 1):
        if granularity == "hour":
            lbl = f"{int(row[label_name]):02d}:00"
        else:
            lbl = str(row[label_name])
        answer_parts.append(f"  {i}. {lbl} - {int(row[sort_col]):,} orders")

    answer = "\n".join(answer_parts)

    # Chart — line for hours (natural time order), bar for day/month
    chart_type = "line" if granularity == "hour" else "bar"
    chart_title = f"Orders by {gran_label}"
    if granularity == "hour":
        chart_x = grouped[label_name].apply(lambda h: f"{int(h):02d}:00")
        chart_df = grouped.copy()
        chart_df[label_name] = chart_x
    else:
        chart_df = grouped

    chart = {
        "type": chart_type,
        "title": chart_title,
        "x": label_name,
        "y": sort_col,
        "data": _records(chart_df),
    }

    # Insights
    insights = [
        f"The busiest {gran_label.lower()} is {peak_label} with {peak_count:,} orders ({peak_pct:.1f}% of total).",
        f"The slowest {gran_label.lower()} is {slow_label} with {slow_count:,} orders.",
    ]

    if granularity == "hour" and len(grouped) > 5:
        morning = grouped[(grouped[label_name] >= 6) & (grouped[label_name] < 12)][sort_col].sum()
        afternoon = grouped[(grouped[label_name] >= 12) & (grouped[label_name] < 17)][sort_col].sum()
        evening = grouped[(grouped[label_name] >= 17) & (grouped[label_name] < 22)][sort_col].sum()
        night = total_orders - morning - afternoon - evening
        insights.append(f"Morning (6-12): {int(morning):,} | Afternoon (12-17): {int(afternoon):,} | Evening (17-22): {int(evening):,} | Night: {int(night):,}")

    if len(grouped) >= 3:
        std = grouped[sort_col].std()
        mean = grouped[sort_col].mean()
        if mean > 0:
            cv = std / mean
            if cv > 0.5:
                insights.append(f"High variation in order volume across {gran_label.lower()}s (CV={cv:.2f}).")
            else:
                insights.append(f"Relatively even distribution across {gran_label.lower()}s (CV={cv:.2f}).")

    intent["confidence"] = 0.95
    return {
        "answer": answer,
        "table": _records(ranked),
        "columns": list(ranked.columns),
        "charts": [chart],
        "insights": insights,
        "sql": f'SELECT EXTRACT({"HOUR" if granularity == "hour" else "DOW" if granularity == "dayofweek" else "MONTH"} FROM "{_find_time_column(df) or _find_date_column(df) or "time_col"}") AS {label_name}, COUNT(*) AS order_count FROM data GROUP BY {label_name} ORDER BY order_count DESC',
        "confidence": 0.95,
    }


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

    # -- Time-of-day / Day-of-week / Month analysis --
    if itype == "time_analysis":
        return _execute_time_analysis(df, intent, metric_col)

    # -- Show Data (first N rows) --
    if itype == "show_data":
        q_lower = intent.get("_question", "").lower()
        n = 10
        num_match = re.search(r'\b(\d+)\b', q_lower)
        if num_match:
            n = min(int(num_match.group(1)), 200)

        is_last = bool(re.search(r'\b(last|tail|bottom|end)\b', q_lower))

        if is_last:
            result = df.tail(n)
            answer = f"Here are the last {len(result):,} rows of your dataset ({len(df):,} total rows, {len(df.columns)} columns)."
        else:
            result = df.head(n)
            answer = f"Here are the first {len(result):,} rows of your dataset ({len(df):,} total rows, {len(df.columns)} columns)."

        intent["confidence"] = 0.95
        return _build_response(answer, result, intent, df)

    # -- Unique Values --
    if itype == "unique_values":
        group_col = intent["group_cols"][0] if intent["group_cols"] else None
        if not group_col:
            categorical = _categorical_cols(df)
            if categorical:
                group_col = categorical[0]
        if group_col:
            vc = df[group_col].value_counts(dropna=False).reset_index()
            vc.columns = [group_col, "count"]
            answer = f'Found {len(vc):,} unique values in "{group_col}". Here are all values sorted by frequency:'
            intent["confidence"] = 0.9
            chart = _select_chart("ranking_count", group_col, None, vc.head(15))
            return _build_response(answer, vc, intent, df, chart=chart)
        return _ambiguous_response(df, intent, "Which column's unique values would you like to see?")

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
        date = _date_cols(df)

        parts = [f"Your dataset contains {len(df):,} records across {len(df.columns)} columns.\n"]

        if numeric:
            parts.append("Key Metrics:")
            for col in numeric[:6]:
                cl = col.lower()
                if any(w in cl for w in ("id", "index", "key", "code", "zip", "phone")):
                    continue
                parts.append(f"  • {col}: Total = {_format_number(df[col].sum())} | Avg = {_format_number(df[col].mean())} | Range: {_format_number(df[col].min())} – {_format_number(df[col].max())}")

        if categorical:
            parts.append("\nCategories:")
            for col in categorical[:4]:
                try:
                    vc = df[col].value_counts()
                    top_val = vc.index[0] if not vc.empty else "N/A"
                    parts.append(f"  • {col}: {df[col].nunique()} unique values (top: {top_val})")
                except TypeError:
                    parts.append(f"  • {col}: mixed data")

        if date:
            for d in date[:1]:
                parts.append(f"\nTime Range: {df[d].min()} to {df[d].max()}")

        # Build a clean summary table instead of describe()
        summary_rows = []
        for col in df.columns:
            try:
                unique_count = int(df[col].nunique())
            except TypeError:
                unique_count = 0
            row = {"Column": col, "Type": str(df[col].dtype), "Non-Null": int(df[col].notna().sum()), "Unique": unique_count}
            if pd.api.types.is_numeric_dtype(df[col]):
                row["Min"] = _format_number(df[col].min())
                row["Max"] = _format_number(df[col].max())
                row["Mean"] = _format_number(df[col].mean())
            else:
                try:
                    vc = df[col].value_counts()
                    top = vc.index[0] if not vc.empty else ""
                except TypeError:
                    top = ""
                row["Min"] = ""
                row["Max"] = ""
                row["Mean"] = str(top)[:30]
            summary_rows.append(row)
        summary_df = pd.DataFrame(summary_rows)

        # Auto-generate a chart for the summary
        chart = None
        if categorical and numeric:
            rev_col = None
            for n in numeric:
                nl = n.lower()
                if any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "profit")):
                    rev_col = n
                    break
            if not rev_col:
                rev_col = next((n for n in numeric if not any(w in n.lower() for w in ("id", "index", "key"))), None)
            if rev_col:
                chart = _select_chart("ranking_count", categorical[0], rev_col,
                                      df.groupby(categorical[0])[rev_col].sum().sort_values(ascending=False).reset_index().head(10))

        intent["confidence"] = 0.8
        return _build_response("\n".join(parts), summary_df, intent, df, chart=chart)

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
        categorical = _categorical_cols(df)
        group_cols = intent["group_cols"]
        metric_cols = intent["metric_cols"]

        # Case 1: Two categorical columns → Cramér's V + cross-tabulation
        if len(group_cols) >= 2:
            cat_x, cat_y = group_cols[0], group_cols[1]
            return _categorical_correlation(df, cat_x, cat_y, intent)

        # Case 2: One categorical mentioned + one numeric → grouped analysis
        if len(group_cols) == 1 and len(metric_cols) >= 1:
            cat_col, num_col = group_cols[0], metric_cols[0]
            grouped = df.groupby(cat_col, dropna=False)[num_col].agg(["mean", "median", "count"]).reset_index()
            grouped.columns = [cat_col, f"avg_{num_col}", f"median_{num_col}", "count"]
            grouped = grouped.sort_values(f"avg_{num_col}", ascending=False)
            chart = _select_chart("group_analysis", cat_col, f"avg_{num_col}", grouped)
            return _build_response(
                f"Relationship between {cat_col} and {num_col}:",
                grouped, intent, df, chart=chart
            )

        # Case 3: No metric cols detected but two categorical columns inferable
        if not metric_cols and len(group_cols) < 2 and len(categorical) >= 2:
            q_lower = intent.get("_question", "").lower()
            matched_cats = []
            for col in categorical:
                col_lower = col.lower()
                col_spaced = col.lower().replace("_", " ")
                if col_lower in q_lower or col_spaced in q_lower:
                    matched_cats.append(col)
            if len(matched_cats) >= 2:
                return _categorical_correlation(df, matched_cats[0], matched_cats[1], intent)

        # Case 4: Two numeric columns → Pearson correlation
        if len(metric_cols) >= 2:
            x, y = metric_cols[0], metric_cols[1]
        elif len(numeric) >= 2:
            x, y = numeric[0], numeric[1]
        else:
            return _ambiguous_response(df, intent, "Need at least 2 columns for correlation analysis.")

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
        return _llm_smart_analysis(df, intent)

    # -- AI Analysis / Advanced Analysis / Fallback --
    return _llm_smart_analysis(df, intent)


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
#  LLM Smart Analysis Engine (code generation + execution)
# ---------------------------------------------------------------------------

_CODE_GEN_SYSTEM = """You are an expert data analyst. Given a dataset profile and a user question, generate Python pandas code to answer it precisely.

Return ONLY valid JSON with these keys:
{
  "answer": "Clear 2-5 sentence answer with specific numbers and findings",
  "code": "Python code string",
  "chart_type": "bar|line|pie|scatter|heatmap|none",
  "chart_x": "column_name_or_null",
  "chart_y": "column_name_or_null",
  "chart_title": "Title for the chart",
  "insights": ["insight1", "insight2", "insight3"]
}

CODE RULES:
- The DataFrame is already loaded as `df`. Do NOT redefine it.
- Available: pandas as `pd`, numpy as `np`, scipy.stats as `stats`
- Store the main result table in `result_df` (must be a pd.DataFrame)
- Store key numeric findings in `findings` (a dict)
- Do NOT use: print, import, open, exec, eval, __import__, os, sys, subprocess
- Do NOT modify the original `df` — use df.copy() if needed
- Handle NaN/missing values gracefully
- Round floats to 2 decimal places
- For dates stored as strings, parse them with pd.to_datetime(errors='coerce')
- For time strings like "HH:MM:SS", extract hour with .str.split(':').str[0].astype(int)

ANALYSIS PATTERNS:
- Statistical tests: compute test statistic + p-value, interpret significance at alpha=0.05
- Scenario/what-if: show before vs after comparison with absolute and percentage change
- Pareto: sort descending, compute cumulative %, mark the 80% cutoff
- Market basket: group by order_id, find item co-occurrences, compute support/confidence
- Correlation: use .corr() for numeric, chi2_contingency for categorical
- Forecasting: use simple linear trend or moving average extrapolation
- Segmentation: use pd.qcut or pd.cut for quantile-based grouping
- Anomaly detection: use IQR method (Q1-1.5*IQR to Q3+1.5*IQR)
- Weighted scoring: normalize each metric 0-1, apply weights, compute composite score
- Weekday vs weekend: parse dates, use .dt.dayofweek (0=Mon, 5-6=weekend)

Always produce a result_df even for single-value answers (wrap in a DataFrame).
Always quantify: include counts, percentages, p-values, dollar amounts where applicable."""


def _client():
    key = settings.OPENAI_API_KEY
    if not key or not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=30.0, max_retries=1)
    except Exception:
        return None


def _build_detailed_profile(df: pd.DataFrame) -> dict[str, Any]:
    profile: dict[str, Any] = {"row_count": int(len(df)), "columns": {}}
    for col in df.columns:
        info: dict[str, Any] = {
            "dtype": str(df[col].dtype),
            "non_null": int(df[col].notna().sum()),
            "unique": int(df[col].nunique()),
        }
        if pd.api.types.is_numeric_dtype(df[col]):
            info["min"] = _json_safe(df[col].min())
            info["max"] = _json_safe(df[col].max())
            info["mean"] = _json_safe(round(float(df[col].mean()), 2))
            info["std"] = _json_safe(round(float(df[col].std()), 2))
        else:
            try:
                top = df[col].value_counts(dropna=True).head(8)
                info["top_values"] = {str(k): int(v) for k, v in top.items()}
            except TypeError:
                info["top_values"] = {}
        profile["columns"][col] = info
    profile["sample_rows"] = _records(df.head(5))
    return profile


_DANGEROUS = re.compile(
    r'\b(__import__|exec|eval|compile|globals|locals|getattr|setattr|delattr'
    r'|__subclasses__|__builtins__|__class__|__bases__'
    r'|os\.|sys\.|subprocess|shutil|pathlib|open\s*\(|socket|requests)\b'
)


def _safe_execute(code: str, df: pd.DataFrame) -> dict[str, Any]:
    if _DANGEROUS.search(code):
        return {"error": "Code contains disallowed operations."}

    safe_builtins = {
        "True": True, "False": False, "None": None,
        "abs": abs, "all": all, "any": any, "bool": bool,
        "dict": dict, "enumerate": enumerate, "filter": filter,
        "float": float, "frozenset": frozenset, "int": int,
        "isinstance": isinstance, "len": len, "list": list,
        "map": map, "max": max, "min": min, "print": lambda *a, **k: None,
        "range": range, "reversed": reversed, "round": round,
        "set": set, "slice": slice, "sorted": sorted, "str": str,
        "sum": sum, "tuple": tuple, "type": type, "zip": zip,
        "ValueError": ValueError, "TypeError": TypeError,
        "KeyError": KeyError, "IndexError": IndexError,
        "ZeroDivisionError": ZeroDivisionError,
        "Exception": Exception,
    }

    namespace: dict[str, Any] = {
        "__builtins__": safe_builtins,
        "pd": pd,
        "np": np,
        "df": df.copy(),
        "result_df": pd.DataFrame(),
        "findings": {},
    }

    try:
        from scipy import stats as scipy_stats
        namespace["stats"] = scipy_stats
    except ImportError:
        pass

    try:
        exec(code, namespace)
    except Exception as exc:
        return {"error": f"Code execution error: {exc}"}

    result_df = namespace.get("result_df", pd.DataFrame())
    if not isinstance(result_df, pd.DataFrame):
        try:
            result_df = pd.DataFrame(result_df) if result_df is not None else pd.DataFrame()
        except Exception:
            result_df = pd.DataFrame()

    return {
        "result_df": result_df,
        "findings": namespace.get("findings", {}),
    }


def _llm_smart_analysis(df: pd.DataFrame, intent: dict) -> dict[str, Any]:
    client = _client()
    if not client:
        return _no_answer_response(intent)

    question = intent.get("_question", "Analyze this data")
    profile = _build_detailed_profile(df)

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _CODE_GEN_SYSTEM},
                {"role": "user", "content": (
                    f"Dataset profile:\n{json.dumps(profile, default=str)}\n\n"
                    f"Question: {question}"
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2000,
        )
    except Exception as exc:
        return _no_answer_response(intent, f"LLM request failed: {exc}")

    raw = (response.choices[0].message.content or "").strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return _no_answer_response(intent, "Failed to parse LLM response.")

    llm_answer = parsed.get("answer", "")
    code = parsed.get("code", "")
    chart_type = parsed.get("chart_type", "none")
    chart_x = parsed.get("chart_x")
    chart_y = parsed.get("chart_y")
    chart_title = parsed.get("chart_title", "Analysis Result")
    llm_insights = parsed.get("insights", [])

    # Execute the generated code
    if code:
        exec_result = _safe_execute(code, df)
        if "error" in exec_result:
            # Retry with a simpler prompt
            try:
                retry = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": _CODE_GEN_SYSTEM},
                        {"role": "user", "content": (
                            f"Dataset profile:\n{json.dumps(profile, default=str)}\n\n"
                            f"Question: {question}\n\n"
                            f"Previous code failed with: {exec_result['error']}\n"
                            f"Generate simpler, more robust code. Use try/except for edge cases."
                        )},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=2000,
                )
                retry_parsed = json.loads(retry.choices[0].message.content or "{}")
                retry_code = retry_parsed.get("code", "")
                if retry_code:
                    exec_result = _safe_execute(retry_code, df)
                    if "error" not in exec_result:
                        llm_answer = retry_parsed.get("answer", llm_answer)
                        llm_insights = retry_parsed.get("insights", llm_insights)
                        chart_type = retry_parsed.get("chart_type", chart_type)
                        chart_x = retry_parsed.get("chart_x", chart_x)
                        chart_y = retry_parsed.get("chart_y", chart_y)
                        chart_title = retry_parsed.get("chart_title", chart_title)
            except Exception:
                pass

            if "error" in exec_result:
                return {
                    "answer": llm_answer or f"I analyzed your question but couldn't execute the computation. {exec_result.get('error', '')}",
                    "table": [],
                    "columns": [],
                    "charts": [],
                    "insights": llm_insights if llm_insights else [],
                    "sql": None,
                    "confidence": 0.5,
                }

        result_df = exec_result.get("result_df", pd.DataFrame())
        findings = exec_result.get("findings", {})

        # Enrich the answer with computed findings
        if findings and not llm_answer:
            parts = []
            for k, v in findings.items():
                if isinstance(v, float):
                    parts.append(f"{k}: {v:,.2f}")
                else:
                    parts.append(f"{k}: {v}")
            llm_answer = "Analysis Results:\n" + "\n".join(parts)

    else:
        result_df = pd.DataFrame()
        findings = {}

    # Build chart
    charts = []
    if chart_type and chart_type != "none" and not result_df.empty:
        chart_data = _records(result_df.head(50))
        if chart_x and chart_y:
            charts = [{
                "type": chart_type,
                "title": chart_title,
                "x": chart_x,
                "y": chart_y,
                "data": chart_data,
            }]
        elif chart_x and chart_type == "pie":
            y_candidates = [c for c in result_df.columns if c != chart_x]
            if y_candidates:
                charts = [{
                    "type": "pie",
                    "title": chart_title,
                    "x": chart_x,
                    "y": y_candidates[0],
                    "data": chart_data,
                }]

    table = _records(result_df.head(200)) if not result_df.empty else []
    columns = list(result_df.columns) if not result_df.empty else []

    intent["confidence"] = 0.85

    return {
        "answer": llm_answer,
        "table": table,
        "columns": columns,
        "charts": charts,
        "insights": llm_insights if isinstance(llm_insights, list) else [llm_insights],
        "sql": None,
        "confidence": 0.85,
    }


def _no_answer_response(intent: dict, detail: str = "") -> dict[str, Any]:
    question = intent.get("_question", "your question")
    msg = f"I couldn't analyze: \"{question}\""
    if detail:
        msg += f"\n\nReason: {detail}"
    msg += "\n\nPlease try rephrasing your question or being more specific about which columns to analyze."
    return {
        "answer": msg,
        "table": [],
        "columns": [],
        "charts": [],
        "insights": [],
        "sql": None,
        "confidence": 0.1,
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
