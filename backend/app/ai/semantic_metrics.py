"""
PBM Semantic Metrics Layer.

Maps business terminology to dataset columns and defines domain-specific
validation rules, join logic, and intent classification for Pharmacy Benefit
Management analytics.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


# ---------------------------------------------------------------------------
#  Semantic Metric Mappings
#  Business term -> target column name in the dataset
# ---------------------------------------------------------------------------

SEMANTIC_METRICS: dict[str, str] = {
    # Spend / Cost
    "spend": "Paid_Amount",
    "drug spend": "Paid_Amount",
    "pharmacy spend": "Paid_Amount",
    "pbm cost": "Paid_Amount",
    "pbm spend": "Paid_Amount",
    "drug cost": "Paid_Amount",
    "cost": "Paid_Amount",
    "paid amount": "Paid_Amount",
    "paid": "Paid_Amount",
    "total spend": "Paid_Amount",
    "total cost": "Paid_Amount",
    "utilization cost": "Paid_Amount",
    "rx cost": "Paid_Amount",
    "prescription cost": "Paid_Amount",
    "medication cost": "Paid_Amount",
    "revenue": "Paid_Amount",
    # Copay
    "copay": "Member_Copay",
    "member copay": "Member_Copay",
    "copayment": "Member_Copay",
    "co-pay": "Member_Copay",
    "patient cost": "Member_Copay",
    "out of pocket": "Member_Copay",
    "oop": "Member_Copay",
    # Ingredient Cost
    "ingredient cost": "Ingredient_Cost",
    "ingredient": "Ingredient_Cost",
    "drug ingredient": "Ingredient_Cost",
    "awp": "Ingredient_Cost",
    # Claims / Utilization
    "claims": "Claim_ID",
    "claim count": "Claim_ID",
    "claim volume": "Claim_ID",
    "utilization": "Claim_ID",
    "rx count": "Claim_ID",
    "prescription count": "Claim_ID",
    "fills": "Claim_ID",
    "fill count": "Claim_ID",
    "prescriptions": "Claim_ID",
    # Members
    "members": "Member_ID",
    "member count": "Member_ID",
    "patients": "Member_ID",
    "patient count": "Member_ID",
    "lives": "Member_ID",
    "enrollment": "Member_ID",
    # Quantity / Supply
    "quantity": "Quantity",
    "units": "Quantity",
    "days supply": "Days_Supply",
    "day supply": "Days_Supply",
    "supply": "Days_Supply",
}

# Aggregation rules: how each metric target should be aggregated by default
METRIC_AGGREGATIONS: dict[str, tuple[str, str]] = {
    "Paid_Amount": ("sum", "SUM"),
    "Member_Copay": ("sum", "SUM"),
    "Ingredient_Cost": ("sum", "SUM"),
    "Claim_ID": ("count", "COUNT"),
    "Member_ID": ("nunique", "COUNT_DISTINCT"),
    "Quantity": ("sum", "SUM"),
    "Days_Supply": ("mean", "AVG"),
}


# ---------------------------------------------------------------------------
#  PBM Column Synonyms  (extend the base COLUMN_SYNONYMS)
# ---------------------------------------------------------------------------

PBM_COLUMN_SYNONYMS: dict[str, list[str]] = {
    # Drug identifiers
    "drug": ["drug_name", "drugname", "drug", "medication", "medicine",
             "rx", "prescription", "ndc", "drug_ndc"],
    "medication": ["drug_name", "drugname", "medication", "medicine", "drug"],
    "drug name": ["drug_name", "drugname"],
    "drug category": ["drug_category", "drugcategory", "therapeutic_class",
                       "drug_class", "drugclass", "category"],
    "drug type": ["drug_type", "drugtype", "brand_generic",
                   "generic_indicator"],
    "ndc": ["ndc", "drug_ndc", "ndc_code"],
    # Pharmacy
    "pharmacy": ["pharmacy_name", "pharmacyname", "pharmacy", "pharmacy_id",
                  "pharmacyid"],
    "pharmacy name": ["pharmacy_name", "pharmacyname"],
    # Prescriber
    "prescriber": ["prescriber", "prescriber_name", "prescribername",
                    "physician", "doctor", "provider", "npi",
                    "prescriber_id", "prescriberid"],
    "doctor": ["prescriber", "prescriber_name", "physician", "doctor",
               "provider"],
    # Member / Patient
    "member": ["member_id", "memberid", "member", "patient",
               "patient_id", "patientid", "enrollee"],
    "patient": ["member_id", "memberid", "patient", "patient_id",
                "patientid"],
    # Plan / Coverage
    "plan": ["plan_type", "plantype", "plan", "plan_name", "planname",
             "benefit_plan", "coverage"],
    "plan type": ["plan_type", "plantype"],
    "coverage": ["plan_type", "plantype", "coverage", "benefit_plan"],
    # Geographic
    "state": ["state", "member_state", "memberstate", "region"],
    "region": ["region", "state", "area", "territory", "zone"],
    "zip": ["zip", "zip_code", "zipcode", "postal_code"],
    # Demographics
    "age": ["age", "member_age", "memberage"],
    "gender": ["gender", "sex", "member_gender"],
    "age group": ["age_group", "agegroup", "age_band", "ageband",
                   "age_bucket"],
    # Clinical
    "condition": ["chronic_condition", "chroniccondition", "condition",
                   "diagnosis", "disease", "dx", "icd"],
    "chronic condition": ["chronic_condition", "chroniccondition"],
    "diagnosis": ["chronic_condition", "diagnosis", "dx", "icd",
                   "icd_code"],
    # Risk
    "risk": ["risk_score", "riskscore", "risk", "hcc_score", "raf_score"],
    "risk score": ["risk_score", "riskscore"],
    "high cost": ["high_cost_member", "highcostmember", "high_cost",
                   "highcost"],
    "high cost member": ["high_cost_member", "highcostmember"],
    # Financial
    "spend": ["paid_amount", "paidamount", "total_paid", "totalpaid",
              "amount_paid"],
    "cost": ["paid_amount", "paidamount", "ingredient_cost",
             "ingredientcost"],
    "paid amount": ["paid_amount", "paidamount"],
    "copay": ["member_copay", "membercopay", "copay", "copayment"],
    "ingredient cost": ["ingredient_cost", "ingredientcost"],
    # Formulary / Authorization
    "formulary": ["formulary_status", "formularystatus", "formulary",
                   "formulary_tier", "tier"],
    "formulary status": ["formulary_status", "formularystatus"],
    "prior auth": ["prior_auth", "priorauth", "prior_authorization",
                    "priorauthorization", "pa", "pa_required"],
    "prior authorization": ["prior_auth", "priorauth",
                             "prior_authorization", "priorauthorization"],
    "step therapy": ["step_therapy", "steptherapy", "step_required"],
    # Utilization
    "days supply": ["days_supply", "dayssupply", "day_supply"],
    "quantity": ["quantity", "qty", "units", "unit_count"],
    "fill date": ["fill_date", "filldate", "dispense_date",
                   "dispensed_date", "service_date", "date_of_service"],
    # Cost buckets
    "annual rx cost": ["annual_rx_cost", "annualrxcost", "rx_cost"],
    "annual medical cost": ["annual_medical_cost", "annualmedicalcost",
                             "medical_cost"],
    "medical cost": ["annual_medical_cost", "annualmedicalcost",
                      "medical_cost"],
}


# ---------------------------------------------------------------------------
#  PBM Domain Intent Classification
# ---------------------------------------------------------------------------

class PBMIntent:
    SPEND_ANALYSIS = "spend_analysis"
    UTILIZATION_ANALYSIS = "utilization_analysis"
    PRIOR_AUTH_ANALYSIS = "prior_auth_analysis"
    PHARMACY_ANALYSIS = "pharmacy_analysis"
    DRUG_ANALYSIS = "drug_analysis"
    MEMBER_ANALYSIS = "member_analysis"
    RISK_ANALYSIS = "risk_analysis"
    FORMULARY_ANALYSIS = "formulary_analysis"
    EXECUTIVE_SUMMARY = "executive_summary"
    GENERIC = "generic"


PBM_INTENT_PATTERNS: list[tuple[str, str]] = [
    # Executive summary
    (r"\b(executive\s+summary|exec\s+summary|overall\s+summary|pbm\s+summary|dashboard)\b",
     PBMIntent.EXECUTIVE_SUMMARY),
    # Prior authorization (specific, check early)
    (r"\b(prior\s+auth\w*|pa\s+rate|pa\s+approval|authorization\s+rate|step\s+therapy)\b",
     PBMIntent.PRIOR_AUTH_ANALYSIS),
    # Formulary
    (r"\b(formulary|tier|preferred\s+drug|non[- ]?preferred|formulary\s+status)\b",
     PBMIntent.FORMULARY_ANALYSIS),
    # Risk
    (r"\b(risk\s+score|risk\s+strat\w*|high[- ]?risk|low[- ]?risk|hcc|raf)\b",
     PBMIntent.RISK_ANALYSIS),
    # Utilization (check BEFORE drug/pharmacy — "claim count by drug" is utilization)
    (r"\b(utilization|claim\s+count|claim\s+volume|fills?\b|prescriptions?\s+count|rx\s+count|days\s+supply)\b",
     PBMIntent.UTILIZATION_ANALYSIS),
    # Pharmacy analysis
    (r"\b(pharmacy|pharmacies|retail|mail\s+order|specialty\s+pharmacy)\b",
     PBMIntent.PHARMACY_ANALYSIS),
    # Member analysis
    (r"\b(member|patient|enrollee|beneficiar|demographic|age\s+group|chronic\s+condition|high[- ]?cost\s+member)\b",
     PBMIntent.MEMBER_ANALYSIS),
    # Drug analysis (after utilization so "claim count by drug" doesn't become drug_analysis)
    (r"\b(drug|medication|brand|generic|specialty|ndc|therapeutic|drug\s+categor|drug\s+type)\b",
     PBMIntent.DRUG_ANALYSIS),
    # Spend (broadest — checked last)
    (r"\b(spend|cost|paid\s+amount|copay|ingredient\s+cost|drug\s+cost|pharmacy\s+spend|pbm\s+cost|rx\s+cost)\b",
     PBMIntent.SPEND_ANALYSIS),
]


def classify_pbm_intent(question: str) -> str:
    q = question.lower().strip()
    for pattern, intent in PBM_INTENT_PATTERNS:
        if re.search(pattern, q):
            return intent
    return PBMIntent.GENERIC


# ---------------------------------------------------------------------------
#  Dataset Role Detection — Claims vs. Enrollment
# ---------------------------------------------------------------------------

CLAIMS_MARKERS = {
    "claim_id", "claimid", "drug_name", "drugname", "pharmacy_name",
    "pharmacyname", "paid_amount", "paidamount", "ingredient_cost",
    "ingredientcost", "member_copay", "membercopay", "prior_auth",
    "priorauth", "formulary_status", "formularystatus", "fill_date",
    "filldate", "days_supply", "dayssupply", "quantity", "drug_category",
    "drugcategory", "drug_type", "drugtype", "ndc",
}

ENROLLMENT_MARKERS = {
    "plan_type", "plantype", "chronic_condition", "chroniccondition",
    "risk_score", "riskscore", "high_cost_member", "highcostmember",
    "annual_rx_cost", "annualrxcost", "annual_medical_cost",
    "annualmedicalcost", "state", "gender", "age",
}

# Dimensions that live in Enrollment
ENROLLMENT_DIMENSIONS = {
    "state", "age", "gender", "plan_type", "plantype", "risk_score",
    "riskscore", "chronic_condition", "chroniccondition", "high_cost_member",
    "highcostmember", "annual_rx_cost", "annualrxcost",
    "annual_medical_cost", "annualmedicalcost",
}

# Metrics that live in Claims
CLAIMS_METRICS = {
    "paid_amount", "paidamount", "ingredient_cost", "ingredientcost",
    "member_copay", "membercopay", "quantity", "days_supply", "dayssupply",
    "claim_id", "claimid", "drug_name", "drugname", "pharmacy_name",
    "pharmacyname", "prior_auth", "priorauth",
}


def detect_dataset_role(df: pd.DataFrame) -> str:
    cols_lower = {c.lower() for c in df.columns}
    claims_hits = len(cols_lower & CLAIMS_MARKERS)
    enrollment_hits = len(cols_lower & ENROLLMENT_MARKERS)
    if claims_hits > enrollment_hits:
        return "claims"
    if enrollment_hits > claims_hits:
        return "enrollment"
    return "unknown"


def needs_join(question: str, df: pd.DataFrame) -> bool:
    """Check if the question references both claims metrics and enrollment dimensions."""
    q = question.lower()
    cols_lower = {c.lower() for c in df.columns}

    has_enrollment_dim = any(
        re.search(rf"\b{re.escape(dim)}\b", q)
        for dim in ("state", "age", "gender", "plan type", "plan_type",
                     "risk score", "risk_score", "chronic condition",
                     "chronic_condition", "high cost member")
    )
    has_claims_metric = any(
        term in q
        for term in ("spend", "cost", "paid", "claim", "drug", "pharmacy",
                      "copay", "utilization", "prescription", "fill",
                      "ingredient")
    )

    enrollment_cols_present = bool(cols_lower & ENROLLMENT_DIMENSIONS)
    claims_cols_present = bool(cols_lower & CLAIMS_METRICS)

    if has_enrollment_dim and has_claims_metric:
        if enrollment_cols_present and claims_cols_present:
            return False  # already joined
        return True

    return False


def find_join_key(df1: pd.DataFrame, df2: pd.DataFrame) -> str | None:
    """Find the best join key between two DataFrames."""
    cols1 = {c.lower(): c for c in df1.columns}
    cols2 = {c.lower(): c for c in df2.columns}
    for candidate in ("member_id", "memberid", "patient_id", "patientid",
                       "enrollee_id", "enrolleeid", "id"):
        if candidate in cols1 and candidate in cols2:
            return cols1[candidate]
    shared = set(cols1.keys()) & set(cols2.keys())
    id_keys = [k for k in shared
               if any(w in k for w in ("id", "key", "code"))]
    if id_keys:
        return cols1[id_keys[0]]
    return None


# ---------------------------------------------------------------------------
#  Metric Validation — forbidden metric / context combinations
# ---------------------------------------------------------------------------

COST_TERMS = frozenset({
    "spend", "cost", "drug cost", "paid amount", "revenue", "copay",
    "ingredient cost", "utilization cost", "pharmacy spend", "pbm cost",
    "drug spend", "total spend", "rx cost", "prescription cost",
})

FORBIDDEN_METRICS_FOR_COST = frozenset({
    "age", "risk_score", "riskscore", "days_supply", "dayssupply",
    "zip", "zip_code", "zipcode",
})


def validate_metric(question: str, metric_col: str | None) -> bool:
    """Return False if the chosen metric is invalid for the question context."""
    if metric_col is None:
        return True
    q = question.lower()
    metric_lower = metric_col.lower()

    if any(term in q for term in COST_TERMS):
        if metric_lower in FORBIDDEN_METRICS_FOR_COST:
            return False
    return True


def resolve_semantic_metric(
    question: str,
    columns: list[str],
) -> tuple[str | None, str | None, list[str]]:
    """
    Resolve the best metric column from the question using semantic mappings.

    Returns:
        (matched_column, aggregation, reasoning_steps)
    """
    q = question.lower().strip()
    col_lower_map = {c.lower(): c for c in columns}
    col_compact_map = {re.sub(r"[^a-z0-9]", "", c.lower()): c for c in columns}
    reasoning: list[str] = []

    # Try longest semantic keys first for best match
    sorted_keys = sorted(SEMANTIC_METRICS.keys(), key=len, reverse=True)
    for term in sorted_keys:
        if term in q:
            target = SEMANTIC_METRICS[term]
            target_lower = target.lower()
            target_compact = re.sub(r"[^a-z0-9]", "", target_lower)

            # Direct match
            if target_lower in col_lower_map:
                agg_info = METRIC_AGGREGATIONS.get(target, ("sum", "SUM"))
                reasoning.append(f"Mapped '{term}' -> {col_lower_map[target_lower]}")
                reasoning.append(f"Default aggregation: {agg_info[1]}")
                return col_lower_map[target_lower], agg_info[0], reasoning

            # Compact match
            if target_compact in col_compact_map:
                agg_info = METRIC_AGGREGATIONS.get(target, ("sum", "SUM"))
                reasoning.append(
                    f"Mapped '{term}' -> {col_compact_map[target_compact]}"
                )
                reasoning.append(f"Default aggregation: {agg_info[1]}")
                return col_compact_map[target_compact], agg_info[0], reasoning

            reasoning.append(
                f"Semantic match '{term}' -> {target} (column not in dataset)"
            )

    return None, None, reasoning


# Terms that are metrics, not dimensions — skip these during dimension resolution
_METRIC_SYNONYM_KEYS = frozenset({
    "spend", "cost", "paid amount", "copay", "member copay",
    "ingredient cost", "annual rx cost", "annual medical cost",
    "medical cost",
})


def resolve_semantic_dimension(
    question: str,
    columns: list[str],
) -> tuple[str | None, list[str]]:
    """
    Resolve the best grouping dimension from the question using PBM synonyms.

    Returns:
        (matched_column, reasoning_steps)
    """
    q = question.lower().strip()
    col_lower_map = {c.lower(): c for c in columns}
    col_compact_map = {re.sub(r"[^a-z0-9]", "", c.lower()): c for c in columns}
    reasoning: list[str] = []

    # Pass 0: "which <dimension> has/generates/..." pattern
    which_match = re.search(
        r"\bwhich\s+(\w[\w\s]*?)\s+(?:has|have|generates?|produces?|gets?|shows?|is|are|does)\b",
        q,
    )
    if which_match:
        which_term = which_match.group(1).strip()
        # Exact match first, then substring
        for exact_first in (True, False):
            sorted_keys = sorted(PBM_COLUMN_SYNONYMS.keys(), key=len, reverse=True)
            for term in sorted_keys:
                if term in _METRIC_SYNONYM_KEYS:
                    continue
                if exact_first:
                    if term != which_term:
                        continue
                else:
                    if not (term in which_term or which_term in term):
                        continue
                    if term == which_term:
                        continue  # already tried
                for syn in PBM_COLUMN_SYNONYMS[term]:
                    syn_compact = re.sub(r"[^a-z0-9]", "", syn.lower())
                    if syn.lower() in col_lower_map:
                        reasoning.append(
                            f"Mapped 'which {which_term}' -> {col_lower_map[syn.lower()]}"
                        )
                        return col_lower_map[syn.lower()], reasoning
                    if syn_compact in col_compact_map:
                        reasoning.append(
                            f"Mapped 'which {which_term}' -> {col_compact_map[syn_compact]}"
                        )
                        return col_compact_map[syn_compact], reasoning

    # First pass: look for explicit "by <dimension>" patterns — highest confidence
    by_match = re.search(
        r"\b(?:by|per|for\s+each|group\s*by|grouped\s+by|across)\s+(\w[\w\s]*?)(?:\?|$|,|\.|and\b)",
        q,
    )
    if by_match:
        by_term = by_match.group(1).strip()
        for exact_first in (True, False):
            sorted_keys = sorted(PBM_COLUMN_SYNONYMS.keys(), key=len, reverse=True)
            for term in sorted_keys:
                if term in _METRIC_SYNONYM_KEYS:
                    continue
                if exact_first:
                    if term != by_term:
                        continue
                else:
                    if not (term in by_term or by_term in term):
                        continue
                    if term == by_term:
                        continue
                for syn in PBM_COLUMN_SYNONYMS[term]:
                    syn_compact = re.sub(r"[^a-z0-9]", "", syn.lower())
                    if syn.lower() in col_lower_map:
                        reasoning.append(
                            f"Mapped 'by {by_term}' -> {col_lower_map[syn.lower()]}"
                        )
                        return col_lower_map[syn.lower()], reasoning
                    if syn_compact in col_compact_map:
                        reasoning.append(
                            f"Mapped 'by {by_term}' -> {col_compact_map[syn_compact]}"
                        )
                        return col_compact_map[syn_compact], reasoning

    # Second pass: general term matching (longest first)
    sorted_keys = sorted(PBM_COLUMN_SYNONYMS.keys(), key=len, reverse=True)
    for term in sorted_keys:
        if term in _METRIC_SYNONYM_KEYS:
            continue
        if term in q:
            for syn in PBM_COLUMN_SYNONYMS[term]:
                syn_compact = re.sub(r"[^a-z0-9]", "", syn.lower())
                if syn.lower() in col_lower_map:
                    reasoning.append(
                        f"Mapped dimension '{term}' -> {col_lower_map[syn.lower()]}"
                    )
                    return col_lower_map[syn.lower()], reasoning
                if syn_compact in col_compact_map:
                    reasoning.append(
                        f"Mapped dimension '{term}' -> {col_compact_map[syn_compact]}"
                    )
                    return col_compact_map[syn_compact], reasoning
    return None, reasoning


# ---------------------------------------------------------------------------
#  PBM-aware LLM System Prompt
# ---------------------------------------------------------------------------

PBM_CODE_GEN_SYSTEM = """You are an expert Business Analytics Copilot specializing in PBM (Pharmacy Benefit Management).

You think like a Senior PBM Data Analyst — you understand BUSINESS INTENT, not just data manipulation.

IMPORTANT: You do NOT generate SQL. You operate directly on Pandas DataFrames.

## PBM Domain Knowledge

You understand:
- Pharmacy Claims, Members, Prescribers, Pharmacies
- Drug Utilization, Formulary Management, Prior Authorization, Step Therapy
- Specialty Drugs, Generic Substitution, Drug Spend, Cost Containment
- Medicare Advantage, Commercial Plans, Risk Stratification

## Dataset Relationships

Claims Dataset (Key: Member_ID):
  Metrics: Paid_Amount, Ingredient_Cost, Member_Copay, Quantity, Days_Supply
  Dimensions: Drug_Name, Drug_Category, Pharmacy_Name, Prior_Auth, Formulary_Status, Drug_Type, Fill_Date

Enrollment Dataset (Key: Member_ID):
  Metrics: Annual_Medical_Cost, Annual_Rx_Cost, Risk_Score, Age
  Dimensions: State, Gender, Plan_Type, Chronic_Condition, High_Cost_Member

## MANDATORY Metric Mappings

"spend" / "drug cost" / "pharmacy spend" / "cost"  ->  df["Paid_Amount"].sum()
"ingredient cost"  ->  df["Ingredient_Cost"].sum()
"copay"  ->  df["Member_Copay"].sum()
"average claim cost"  ->  df["Paid_Amount"].mean()
"claim count" / "utilization"  ->  df["Claim_ID"].count()
"members"  ->  df["Member_ID"].nunique()

## CRITICAL ERROR PREVENTION

NEVER use Age as a metric unless the user explicitly asks about age.
If the question mentions spend/cost/drug/claim/pharmacy/copay/utilization:
  The metric MUST be Paid_Amount, NOT Age, Risk_Score, or Days_Supply.

## Calculation Patterns (Pandas, NOT SQL)

Prior Auth Rate:
  rate = df.groupby(dim).apply(lambda g: (g["Prior_Auth"]=="Yes").mean())

Percentage of Spend:
  filtered.sum() / total.sum() * 100

Pareto:
  sort desc, cumsum, find cutoff at threshold %

Age Groups:
  pd.cut(df["Age"], bins=[0,40,60,80,120], labels=["Under 40","40-59","60-79","80+"])

## Code Generation Rules

Return ONLY valid JSON:
{
  "answer": "Clear 2-5 sentence answer with specific numbers, business insight, and recommendation",
  "code": "Python pandas code string (no SQL, no imports)",
  "chart_type": "bar|line|pie|scatter|heatmap|none",
  "chart_x": "column_name_or_null",
  "chart_y": "column_name_or_null",
  "chart_title": "Title for the chart",
  "insights": ["insight1", "insight2", "insight3"],
  "metric_used": "column_name used as primary metric",
  "aggregation": "SUM|AVG|COUNT|COUNT_DISTINCT|PERCENTAGE|RATE",
  "group_by": "column_name or null",
  "recommendation": "One actionable business recommendation"
}

CODE RULES:
- The DataFrame is already loaded as `df`. Do NOT redefine it.
- Available: pandas as `pd`, numpy as `np`, scipy.stats as `stats`
- Store the main result table in `result_df` (must be a pd.DataFrame)
- Store key numeric findings in `findings` (a dict)
- Do NOT generate SQL. Use Pandas operations only.
- Do NOT use: print, import, open, exec, eval, __import__, os, sys, subprocess
- Do NOT modify the original `df` — use df.copy() if needed
- Handle NaN/missing values gracefully
- Round floats to 2 decimal places

## Response Format

Every answer MUST include:
1. Direct answer with specific numbers
2. Supporting metrics (top 5 breakdown if applicable)
3. Business insight (what it means for the organization)
4. Recommendation (what action to take)

If required columns do not exist, say "Insufficient data available" — never invent numbers."""


# ---------------------------------------------------------------------------
#  Confidence scoring for PBM queries
# ---------------------------------------------------------------------------

def pbm_confidence(
    pbm_intent: str,
    metric_resolved: bool,
    dimension_resolved: bool,
    validation_passed: bool,
) -> float:
    base = 0.5
    if pbm_intent != PBMIntent.GENERIC:
        base += 0.15
    if metric_resolved:
        base += 0.15
    if dimension_resolved:
        base += 0.1
    if validation_passed:
        base += 0.05
    return min(base, 0.98)
