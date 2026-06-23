"""
Business Analytics Query Planner.

Translates natural-language questions into structured analytical plans
that drive DataFrame operations. No SQL generation — pure Pandas execution.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

from app.ai.semantic_metrics import (
    PBMIntent,
    classify_pbm_intent,
    resolve_semantic_dimension,
    resolve_semantic_metric,
    validate_metric,
    pbm_confidence,
    SEMANTIC_METRICS,
    PBM_COLUMN_SYNONYMS,
)


# ---------------------------------------------------------------------------
#  Calculation Types
# ---------------------------------------------------------------------------

class CalcType:
    SUM = "SUM"
    AVG = "AVG"
    COUNT = "COUNT"
    COUNT_DISTINCT = "COUNT_DISTINCT"
    PERCENTAGE = "PERCENTAGE"
    RATE = "RATE"
    PARETO = "PARETO"
    CORRELATION = "CORRELATION"
    TREND = "TREND"
    DISTRIBUTION = "DISTRIBUTION"
    OUTLIER = "OUTLIER"
    FORECAST = "FORECAST"


# ---------------------------------------------------------------------------
#  Filter Detection
# ---------------------------------------------------------------------------

FILTER_PATTERNS: list[tuple[str, str, str, Any]] = [
    # Drug type filters
    (r"\bgeneric\s+drugs?\b", "Drug_Type", "==", "Generic"),
    (r"\bbrand\s+drugs?\b", "Drug_Type", "==", "Brand"),
    (r"\bspecialty\s+drugs?\b", "Drug_Type", "==", "Specialty"),
    (r"\bgeneric\b(?!\s+(?:substitut|equival|map|sav))", "Drug_Type", "==", "Generic"),
    (r"\bspecialty\b(?!\s+(?:pharmacy|pharmacies))", "Drug_Type", "==", "Specialty"),
    # Plan type filters
    (r"\bmedicare\b", "Plan_Type", "contains", "Medicare"),
    (r"\bcommercial\b", "Plan_Type", "contains", "Commercial"),
    (r"\bmedicaid\b", "Plan_Type", "contains", "Medicaid"),
    # Clinical filters
    (r"\bdiabeti[cs]\b", "Chronic_Condition", "contains", "Diabetes"),
    (r"\bheart\s+disease\b", "Chronic_Condition", "contains", "Heart"),
    (r"\bcopd\b", "Chronic_Condition", "==", "COPD"),
    (r"\bhypertension\b", "Chronic_Condition", "contains", "Hypertension"),
    # Prior auth
    (r"\bprior\s+auth(?:orize)?d\b", "Prior_Auth", "==", "Yes"),
    (r"\bnon[- ]?formulary\b", "Formulary_Status", "==", "Non-Preferred"),
    (r"\bformulary\s+excluded\b", "Formulary_Status", "==", "Excluded"),
    (r"\bpreferred\b(?!\s+(?:drug|pharmacy))", "Formulary_Status", "==", "Preferred"),
    # Gender
    (r"\bmale\s+members?\b", "Gender", "==", "Male"),
    (r"\bfemale\s+members?\b", "Gender", "==", "Female"),
    # High cost
    (r"\bhigh[- ]?cost\s+members?\b", "High_Cost_Member", "==", "Yes"),
]

# Numeric comparison filters
NUMERIC_FILTER_PATTERNS: list[tuple[str, str, str]] = [
    (r"\b(?:over|above|greater\s+than|more\s+than|exceeding|>\s*)\s*(?:age\s+)?(\d+)\s*(?:years?\s+old)?",
     "Age", ">"),
    (r"\b(?:under|below|less\s+than|younger\s+than|<\s*)\s*(?:age\s+)?(\d+)",
     "Age", "<"),
    (r"\bage\s+(\d+)\s*(?:to|-)\s*(\d+)", "Age", "between"),
    (r"\brisk\s+score\s*(?:above|over|greater\s+than|>)\s*(\d+\.?\d*)", "Risk_Score", ">"),
    (r"\brisk\s+score\s*(?:below|under|less\s+than|<)\s*(\d+\.?\d*)", "Risk_Score", "<"),
    (r"\bpaid\s+(?:amount\s+)?(?:above|over|greater\s+than|>)\s*\$?(\d[\d,]*\.?\d*)", "Paid_Amount", ">"),
]

# State name filter (detected by matching against column values)
STATE_NAMES = {
    "texas", "california", "florida", "new york", "ohio", "illinois",
    "pennsylvania", "georgia", "michigan", "north carolina", "new jersey",
    "virginia", "washington", "arizona", "massachusetts", "tennessee",
    "indiana", "missouri", "maryland", "wisconsin", "colorado", "minnesota",
    "south carolina", "alabama", "louisiana", "kentucky", "oregon",
    "oklahoma", "connecticut", "utah", "iowa", "nevada", "arkansas",
    "mississippi", "kansas", "nebraska",
}


@dataclass
class DetectedFilter:
    column: str
    operator: str  # ==, !=, >, <, >=, <=, contains, between
    value: Any
    raw_match: str = ""

    def to_dict(self) -> dict:
        if self.operator == "==":
            return {"column": self.column, "filter": f"{self.column}={self.value}"}
        if self.operator == "contains":
            return {"column": self.column, "filter": f"{self.column} contains '{self.value}'"}
        if self.operator == "between":
            return {"column": self.column, "filter": f"{self.column} between {self.value[0]} and {self.value[1]}"}
        return {"column": self.column, "filter": f"{self.column} {self.operator} {self.value}"}


def detect_filters(question: str, columns: list[str]) -> list[DetectedFilter]:
    """Detect implicit and explicit filters from the question."""
    q = question.lower().strip()
    cols_lower = {c.lower(): c for c in columns}
    filters: list[DetectedFilter] = []
    seen_cols: set[str] = set()

    # Categorical filters
    for pattern, col_name, operator, value in FILTER_PATTERNS:
        if re.search(pattern, q):
            # Find actual column name
            actual_col = cols_lower.get(col_name.lower())
            if not actual_col:
                for c_lower, c_orig in cols_lower.items():
                    if col_name.lower().replace("_", "") in c_lower.replace("_", ""):
                        actual_col = c_orig
                        break
            if actual_col and actual_col not in seen_cols:
                m = re.search(pattern, q)
                filters.append(DetectedFilter(
                    column=actual_col,
                    operator=operator,
                    value=value,
                    raw_match=m.group(0) if m else "",
                ))
                seen_cols.add(actual_col)

    # Numeric comparison filters
    for pattern, col_name, operator in NUMERIC_FILTER_PATTERNS:
        m = re.search(pattern, q)
        if m:
            actual_col = cols_lower.get(col_name.lower())
            if not actual_col:
                for c_lower, c_orig in cols_lower.items():
                    if col_name.lower().replace("_", "") in c_lower.replace("_", ""):
                        actual_col = c_orig
                        break
            if actual_col and actual_col not in seen_cols:
                if operator == "between":
                    val = (float(m.group(1)), float(m.group(2)))
                else:
                    raw = m.group(1).replace(",", "")
                    val = float(raw)
                filters.append(DetectedFilter(
                    column=actual_col,
                    operator=operator,
                    value=val,
                    raw_match=m.group(0),
                ))
                seen_cols.add(actual_col)

    # State name detection (match against known state names in the question)
    if "state" in cols_lower or "member_state" in cols_lower:
        state_col = cols_lower.get("state") or cols_lower.get("member_state")
        if state_col and state_col not in seen_cols:
            for state in STATE_NAMES:
                if state in q:
                    filters.append(DetectedFilter(
                        column=state_col,
                        operator="contains",
                        value=state.title(),
                        raw_match=state,
                    ))
                    seen_cols.add(state_col)
                    break

    return filters


def apply_filters(df: pd.DataFrame, filters: list[DetectedFilter]) -> pd.DataFrame:
    """Apply detected filters to a DataFrame."""
    result = df.copy()
    for f in filters:
        if f.column not in result.columns:
            continue
        series = result[f.column]
        if f.operator == "==":
            if pd.api.types.is_string_dtype(series) or series.dtype == "object":
                result = result[series.astype(str).str.lower() == str(f.value).lower()]
            else:
                result = result[series == f.value]
        elif f.operator == "contains":
            result = result[series.astype(str).str.contains(str(f.value), case=False, na=False)]
        elif f.operator == ">":
            result = result[pd.to_numeric(series, errors="coerce") > float(f.value)]
        elif f.operator == "<":
            result = result[pd.to_numeric(series, errors="coerce") < float(f.value)]
        elif f.operator == ">=":
            result = result[pd.to_numeric(series, errors="coerce") >= float(f.value)]
        elif f.operator == "<=":
            result = result[pd.to_numeric(series, errors="coerce") <= float(f.value)]
        elif f.operator == "between":
            lo, hi = f.value
            num = pd.to_numeric(series, errors="coerce")
            result = result[(num >= lo) & (num <= hi)]
    return result


# ---------------------------------------------------------------------------
#  Calculation Type Detection
# ---------------------------------------------------------------------------

CALC_PATTERNS: list[tuple[str, str]] = [
    (r"\bpareto\b|80.?20|\b\d+\s*%\s*of\s*(spend|cost|claims)|\baccount\s+for\b",
     CalcType.PARETO),
    (r"\b(percent|percentage|%|share|proportion)\b.*\b(of|from|comes?\s+from)\b",
     CalcType.PERCENTAGE),
    (r"\b(of|from|comes?\s+from)\b.*\b(percent|percentage|%)\b",
     CalcType.PERCENTAGE),
    (r"\b(rate|ratio)\b",
     CalcType.RATE),
    (r"\b(corr?e?l[aei]?t\w*|relationship\s+between|scatter)\b",
     CalcType.CORRELATION),
    (r"\b(trend|over\s+time|monthly|weekly|daily|yearly|growth|by\s+month|by\s+year)\b",
     CalcType.TREND),
    (r"\b(distribution|histogram|spread|breakdown|split)\b",
     CalcType.DISTRIBUTION),
    (r"\b(outliers?|anomal\w*|unusual|abnormal)\b",
     CalcType.OUTLIER),
    (r"\b(forecast|predict|project|estimate\s+next|next\s+(month|quarter|year)|future)\b",
     CalcType.FORECAST),
    (r"\b(average|avg|mean)\b",
     CalcType.AVG),
    (r"\b(count|how\s+many|number\s+of|total\s+number)\b",
     CalcType.COUNT),
    (r"\b(distinct|unique)\b.*\b(count|number|how\s+many)\b",
     CalcType.COUNT_DISTINCT),
    (r"\b(total|sum)\b",
     CalcType.SUM),
]


def detect_calculation_type(question: str) -> str:
    q = question.lower().strip()
    for pattern, calc_type in CALC_PATTERNS:
        if re.search(pattern, q):
            return calc_type
    return CalcType.SUM


# ---------------------------------------------------------------------------
#  Query Plan
# ---------------------------------------------------------------------------

@dataclass
class QueryPlan:
    intent: str = ""
    metric: str | None = None
    metric_aggregation: str = "sum"
    dimension: str | None = None
    filters: list[DetectedFilter] = field(default_factory=list)
    calculation_type: str = CalcType.SUM
    sort: str = "desc"
    limit: int | None = None
    confidence: float = 0.5
    reasoning: list[str] = field(default_factory=list)
    pbm_intent: str = PBMIntent.GENERIC
    requires_columns: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "intent": self.intent,
            "metric": self.metric,
            "dimension": self.dimension,
            "filters": [f.to_dict()["filter"] for f in self.filters],
            "calculation_type": self.calculation_type,
            "aggregation": self.metric_aggregation.upper(),
            "sort": self.sort,
            "limit": self.limit,
            "confidence": round(self.confidence, 2),
            "reasoning": self.reasoning,
        }


# ---------------------------------------------------------------------------
#  Main Planner
# ---------------------------------------------------------------------------

def build_query_plan(question: str, df: pd.DataFrame) -> QueryPlan:
    """
    Build a structured query plan from a natural-language question.

    Priority chain for metric selection:
    1. Explicit column name in question
    2. Semantic metric mapping (business term -> column)
    3. Domain-specific inference
    4. None (ask user for clarification — never guess)
    """
    columns = list(df.columns)
    plan = QueryPlan()
    reasoning = plan.reasoning

    # 1. PBM domain intent
    plan.pbm_intent = classify_pbm_intent(question)
    if plan.pbm_intent != PBMIntent.GENERIC:
        reasoning.append(f"Detected domain intent: {plan.pbm_intent}")

    # 2. Calculation type detection
    plan.calculation_type = detect_calculation_type(question)
    reasoning.append(f"Calculation type: {plan.calculation_type}")

    # 3. Semantic metric resolution
    sem_metric, sem_agg, sem_reasoning = resolve_semantic_metric(question, columns)
    reasoning.extend(sem_reasoning)
    if sem_metric:
        plan.metric = sem_metric
        plan.metric_aggregation = sem_agg or "sum"

    # Override aggregation based on calculation type
    if plan.calculation_type == CalcType.AVG:
        plan.metric_aggregation = "mean"
    elif plan.calculation_type == CalcType.COUNT:
        plan.metric_aggregation = "count"
    elif plan.calculation_type == CalcType.COUNT_DISTINCT:
        plan.metric_aggregation = "nunique"

    # 4. Semantic dimension resolution
    sem_dim, dim_reasoning = resolve_semantic_dimension(question, columns)
    reasoning.extend(dim_reasoning)
    if sem_dim:
        plan.dimension = sem_dim

    # 5. Filter detection
    plan.filters = detect_filters(question, columns)
    if plan.filters:
        filter_strs = [f.to_dict()["filter"] for f in plan.filters]
        reasoning.append(f"Detected filters: {', '.join(filter_strs)}")

    # 6. Sort and limit detection
    q_lower = question.lower()
    if re.search(r"\b(lowest|smallest|minimum|min|least|bottom|worst|fewest)\b", q_lower):
        plan.sort = "asc"
    top_match = re.search(r"\btop\s+(\d+)\b", q_lower)
    bottom_match = re.search(r"\bbottom\s+(\d+)\b", q_lower)
    if top_match:
        plan.limit = int(top_match.group(1))
    elif bottom_match:
        plan.limit = int(bottom_match.group(1))
        plan.sort = "asc"

    # 7. Metric validation
    if plan.metric and not validate_metric(question, plan.metric):
        reasoning.append(f"VALIDATION: Rejected metric '{plan.metric}' for this context")
        plan.metric = None
        # Re-resolve
        sem_metric, sem_agg, _ = resolve_semantic_metric(question, columns)
        if sem_metric and validate_metric(question, sem_metric):
            plan.metric = sem_metric
            plan.metric_aggregation = sem_agg or "sum"

    # 8. Map intent from PBM intent + calculation type
    plan.intent = _map_intent(plan)

    # 9. Determine required columns for hallucination prevention
    if plan.metric:
        plan.requires_columns.append(plan.metric)
    if plan.dimension:
        plan.requires_columns.append(plan.dimension)
    for f in plan.filters:
        plan.requires_columns.append(f.column)

    # 10. Confidence scoring
    plan.confidence = pbm_confidence(
        plan.pbm_intent,
        metric_resolved=plan.metric is not None,
        dimension_resolved=plan.dimension is not None,
        validation_passed=validate_metric(question, plan.metric),
    )

    return plan


def _map_intent(plan: QueryPlan) -> str:
    """Map PBM intent + calculation type to a unified intent string."""
    calc = plan.calculation_type
    if calc in (CalcType.PERCENTAGE, CalcType.RATE, CalcType.PARETO,
                CalcType.CORRELATION, CalcType.TREND, CalcType.DISTRIBUTION,
                CalcType.OUTLIER, CalcType.FORECAST):
        return calc.lower()

    pbm = plan.pbm_intent
    intent_map = {
        PBMIntent.SPEND_ANALYSIS: "spend_analysis",
        PBMIntent.UTILIZATION_ANALYSIS: "utilization_analysis",
        PBMIntent.PRIOR_AUTH_ANALYSIS: "prior_auth_analysis",
        PBMIntent.PHARMACY_ANALYSIS: "pharmacy_analysis",
        PBMIntent.DRUG_ANALYSIS: "drug_analysis",
        PBMIntent.MEMBER_ANALYSIS: "member_analysis",
        PBMIntent.RISK_ANALYSIS: "risk_analysis",
        PBMIntent.FORMULARY_ANALYSIS: "formulary_analysis",
        PBMIntent.EXECUTIVE_SUMMARY: "executive_summary",
    }
    return intent_map.get(pbm, "general_analysis")


def validate_plan(plan: QueryPlan, df: pd.DataFrame) -> tuple[bool, str]:
    """
    Hallucination prevention — verify the plan can be executed against
    the actual DataFrame before running any operations.
    """
    missing = [c for c in plan.requires_columns if c not in df.columns]
    if missing:
        return False, f"Insufficient data available. Missing columns: {', '.join(missing)}"
    return True, ""
