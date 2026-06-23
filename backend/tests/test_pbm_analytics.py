"""
Business Analytics Copilot — test suite.

Validates semantic metric resolution, dimension mapping, filter detection,
calculation types, query planning, hallucination prevention, and end-to-end
query correctness. No SQL — pure Pandas operations.
"""

import numpy as np
import pandas as pd
import pytest

from app.ai.query_engine import (
    _classify_intent,
    _normalize_dataframe,
    run_query,
)
from app.ai.semantic_metrics import (
    PBMIntent,
    classify_pbm_intent,
    detect_dataset_role,
    find_join_key,
    needs_join,
    resolve_semantic_dimension,
    resolve_semantic_metric,
    validate_metric,
)
from app.ai.query_planner import (
    CalcType,
    QueryPlan,
    build_query_plan,
    detect_calculation_type,
    detect_filters,
    apply_filters,
    validate_plan,
)


# ---------------------------------------------------------------------------
#  Test fixtures — synthetic PBM datasets
# ---------------------------------------------------------------------------

@pytest.fixture
def claims_df():
    np.random.seed(42)
    n = 200
    return pd.DataFrame({
        "Claim_ID": range(1, n + 1),
        "Member_ID": np.random.randint(1, 51, n),
        "Drug_Name": np.random.choice(
            ["Lipitor", "Metformin", "Humira", "Eliquis", "Ozempic",
             "Trulicity", "Jardiance", "Xarelto"], n
        ),
        "Drug_Category": np.random.choice(
            ["Cholesterol", "Diabetes", "Autoimmune", "Blood Thinner",
             "Weight Loss"], n
        ),
        "Drug_Type": np.random.choice(["Brand", "Generic", "Specialty"], n),
        "Pharmacy_Name": np.random.choice(
            ["CVS", "Walgreens", "Rite Aid", "Express Scripts",
             "Optum Rx"], n
        ),
        "Paid_Amount": np.random.uniform(10, 5000, n).round(2),
        "Ingredient_Cost": np.random.uniform(5, 4000, n).round(2),
        "Member_Copay": np.random.uniform(0, 100, n).round(2),
        "Quantity": np.random.randint(1, 90, n),
        "Days_Supply": np.random.choice([30, 60, 90], n),
        "Prior_Auth": np.random.choice(["Yes", "No"], n, p=[0.3, 0.7]),
        "Formulary_Status": np.random.choice(
            ["Preferred", "Non-Preferred", "Excluded"], n
        ),
        "Fill_Date": pd.date_range("2024-01-01", periods=n, freq="D"),
    })


@pytest.fixture
def enrollment_df():
    np.random.seed(42)
    return pd.DataFrame({
        "Member_ID": range(1, 51),
        "State": np.random.choice(
            ["Texas", "California", "Florida", "New York", "Ohio"], 50
        ),
        "Gender": np.random.choice(["Male", "Female"], 50),
        "Age": np.random.randint(18, 90, 50),
        "Plan_Type": np.random.choice(
            ["Medicare Advantage", "Commercial", "Medicaid"], 50
        ),
        "Chronic_Condition": np.random.choice(
            ["Diabetes", "Heart Disease", "COPD", "Hypertension", "None"], 50
        ),
        "High_Cost_Member": np.random.choice(["Yes", "No"], 50, p=[0.2, 0.8]),
        "Risk_Score": np.random.uniform(0.5, 3.5, 50).round(2),
        "Annual_Rx_Cost": np.random.uniform(500, 50000, 50).round(2),
        "Annual_Medical_Cost": np.random.uniform(1000, 80000, 50).round(2),
    })


@pytest.fixture
def joined_df(claims_df, enrollment_df):
    return claims_df.merge(enrollment_df, on="Member_ID", how="left")


# ---------------------------------------------------------------------------
#  1. Semantic Metric Resolution
# ---------------------------------------------------------------------------

class TestSemanticMetricResolution:
    def test_spend_resolves_to_paid_amount(self, claims_df):
        col, agg, _ = resolve_semantic_metric(
            "Which state has the highest pharmacy spend?",
            list(claims_df.columns),
        )
        assert col == "Paid_Amount"
        assert agg == "sum"

    def test_drug_cost_resolves_to_paid_amount(self, claims_df):
        col, agg, _ = resolve_semantic_metric(
            "Which drug generates highest drug cost?",
            list(claims_df.columns),
        )
        assert col == "Paid_Amount"

    def test_copay_resolves_to_member_copay(self, claims_df):
        col, _, _ = resolve_semantic_metric(
            "Total copay by pharmacy",
            list(claims_df.columns),
        )
        assert col == "Member_Copay"

    def test_ingredient_cost_resolves(self, claims_df):
        col, _, _ = resolve_semantic_metric(
            "Average ingredient cost per drug",
            list(claims_df.columns),
        )
        assert col == "Ingredient_Cost"

    def test_claims_resolves_to_claim_id(self, claims_df):
        col, agg, _ = resolve_semantic_metric(
            "How many claims per pharmacy?",
            list(claims_df.columns),
        )
        assert col == "Claim_ID"
        assert agg == "count"

    def test_members_resolves_to_member_id(self, claims_df):
        col, agg, _ = resolve_semantic_metric(
            "How many members use each drug?",
            list(claims_df.columns),
        )
        assert col == "Member_ID"
        assert agg == "nunique"


# ---------------------------------------------------------------------------
#  2. Semantic Dimension Resolution
# ---------------------------------------------------------------------------

class TestSemanticDimensionResolution:
    def test_state_dimension(self, joined_df):
        col, _ = resolve_semantic_dimension(
            "spend by state", list(joined_df.columns)
        )
        assert col == "State"

    def test_drug_dimension(self, claims_df):
        col, _ = resolve_semantic_dimension(
            "which drug has highest spend", list(claims_df.columns)
        )
        assert col == "Drug_Name"

    def test_pharmacy_dimension(self, claims_df):
        col, _ = resolve_semantic_dimension(
            "pharmacy with most claims", list(claims_df.columns)
        )
        assert col == "Pharmacy_Name"

    def test_chronic_condition_dimension(self, joined_df):
        col, _ = resolve_semantic_dimension(
            "cost by chronic condition", list(joined_df.columns)
        )
        assert col == "Chronic_Condition"

    def test_plan_type_dimension(self, joined_df):
        col, _ = resolve_semantic_dimension(
            "compare spend by plan type", list(joined_df.columns)
        )
        assert col == "Plan_Type"

    def test_plan_type_from_values(self, joined_df):
        """Medicare/Commercial are values — resolved by _find_subject, not semantic layer."""
        norm = _normalize_dataframe(joined_df)
        intent = _classify_intent("Compare Medicare vs Commercial spend", norm)
        assert "Plan_Type" in intent["group_cols"]


# ---------------------------------------------------------------------------
#  3. Metric Validation
# ---------------------------------------------------------------------------

class TestMetricValidation:
    def test_age_rejected_for_spend_question(self):
        assert validate_metric("highest pharmacy spend by state", "Age") is False

    def test_risk_score_rejected_for_cost_question(self):
        assert validate_metric("total drug cost by condition", "Risk_Score") is False

    def test_paid_amount_accepted_for_spend(self):
        assert validate_metric("pharmacy spend by state", "Paid_Amount") is True

    def test_age_accepted_for_age_question(self):
        assert validate_metric("average age by plan type", "Age") is True

    def test_days_supply_rejected_for_cost(self):
        assert validate_metric("total cost by drug", "Days_Supply") is False


# ---------------------------------------------------------------------------
#  4. PBM Intent Classification
# ---------------------------------------------------------------------------

class TestPBMIntentClassification:
    def test_spend_analysis(self):
        assert classify_pbm_intent("Which state has highest spend?") == PBMIntent.SPEND_ANALYSIS

    def test_drug_analysis(self):
        assert classify_pbm_intent("Top drug by paid amount") == PBMIntent.DRUG_ANALYSIS

    def test_pharmacy_analysis(self):
        assert classify_pbm_intent("Which pharmacy has most claims?") == PBMIntent.PHARMACY_ANALYSIS

    def test_prior_auth_analysis(self):
        assert classify_pbm_intent("prior auth rate by pharmacy") == PBMIntent.PRIOR_AUTH_ANALYSIS

    def test_member_analysis(self):
        assert classify_pbm_intent("high cost member distribution") == PBMIntent.MEMBER_ANALYSIS

    def test_utilization_analysis(self):
        assert classify_pbm_intent("claim count by drug category") == PBMIntent.UTILIZATION_ANALYSIS

    def test_risk_analysis(self):
        assert classify_pbm_intent("risk score distribution") == PBMIntent.RISK_ANALYSIS

    def test_formulary_analysis(self):
        assert classify_pbm_intent("formulary status breakdown") == PBMIntent.FORMULARY_ANALYSIS


# ---------------------------------------------------------------------------
#  5. Dataset Role Detection
# ---------------------------------------------------------------------------

class TestDatasetRoleDetection:
    def test_claims_detected(self, claims_df):
        assert detect_dataset_role(claims_df) == "claims"

    def test_enrollment_detected(self, enrollment_df):
        assert detect_dataset_role(enrollment_df) == "enrollment"

    def test_join_needed(self, claims_df):
        assert needs_join("spend by state", claims_df) is True

    def test_join_not_needed_for_claims_only(self, claims_df):
        assert needs_join("spend by drug", claims_df) is False

    def test_find_join_key(self, claims_df, enrollment_df):
        key = find_join_key(claims_df, enrollment_df)
        assert key == "Member_ID"


# ---------------------------------------------------------------------------
#  6. Filter Detection
# ---------------------------------------------------------------------------

class TestFilterDetection:
    def test_generic_drug_filter(self, claims_df):
        filters = detect_filters("spend on generic drugs", list(claims_df.columns))
        assert any(f.column == "Drug_Type" and f.value == "Generic" for f in filters)

    def test_specialty_drug_filter(self, claims_df):
        filters = detect_filters("specialty drug spend", list(claims_df.columns))
        assert any(f.column == "Drug_Type" and f.value == "Specialty" for f in filters)

    def test_medicare_filter(self, joined_df):
        filters = detect_filters("medicare spend by state", list(joined_df.columns))
        assert any(f.column == "Plan_Type" and "Medicare" in str(f.value) for f in filters)

    def test_diabetic_filter(self, joined_df):
        filters = detect_filters("spend for diabetic members", list(joined_df.columns))
        assert any(f.column == "Chronic_Condition" for f in filters)

    def test_age_filter(self, joined_df):
        filters = detect_filters("members over age 65", list(joined_df.columns))
        assert any(f.column == "Age" and f.operator == ">" and f.value == 65.0 for f in filters)

    def test_state_filter(self, joined_df):
        filters = detect_filters("spend in texas", list(joined_df.columns))
        assert any(f.column == "State" for f in filters)

    def test_apply_filters(self, claims_df):
        from app.ai.query_planner import DetectedFilter
        filters = [DetectedFilter(column="Drug_Type", operator="==", value="Generic")]
        filtered = apply_filters(claims_df, filters)
        assert len(filtered) < len(claims_df)
        assert all(filtered["Drug_Type"].str.lower() == "generic")


# ---------------------------------------------------------------------------
#  7. Calculation Type Detection
# ---------------------------------------------------------------------------

class TestCalculationTypeDetection:
    def test_percentage(self):
        assert detect_calculation_type("What percentage of spend comes from specialty drugs?") == CalcType.PERCENTAGE

    def test_rate(self):
        assert detect_calculation_type("prior auth rate by pharmacy") == CalcType.RATE

    def test_pareto(self):
        assert detect_calculation_type("Which members account for 80% of spend?") == CalcType.PARETO

    def test_correlation(self):
        assert detect_calculation_type("correlation between age and spend") == CalcType.CORRELATION

    def test_trend(self):
        assert detect_calculation_type("monthly spend trend") == CalcType.TREND

    def test_outlier(self):
        assert detect_calculation_type("detect outliers in paid amount") == CalcType.OUTLIER

    def test_forecast(self):
        assert detect_calculation_type("forecast next month spend") == CalcType.FORECAST

    def test_distribution(self):
        assert detect_calculation_type("distribution of paid amount") == CalcType.DISTRIBUTION

    def test_default_sum(self):
        assert detect_calculation_type("total spend by drug") == CalcType.SUM


# ---------------------------------------------------------------------------
#  8. Query Planner
# ---------------------------------------------------------------------------

class TestQueryPlanner:
    def test_plan_has_metric(self, claims_df):
        plan = build_query_plan("total spend by drug", claims_df)
        assert plan.metric == "Paid_Amount"
        assert plan.dimension == "Drug_Name"

    def test_plan_has_filters(self, joined_df):
        plan = build_query_plan("spend for diabetic members by state", joined_df)
        assert any(f.column == "Chronic_Condition" for f in plan.filters)

    def test_plan_serializable(self, claims_df):
        plan = build_query_plan("total spend by pharmacy", claims_df)
        d = plan.to_dict()
        assert "intent" in d
        assert "metric" in d
        assert "reasoning" in d

    def test_hallucination_prevention(self, claims_df):
        plan = QueryPlan(requires_columns=["NonExistentColumn"])
        valid, error = validate_plan(plan, claims_df)
        assert valid is False
        assert "Insufficient data" in error

    def test_valid_plan_passes(self, claims_df):
        plan = QueryPlan(requires_columns=["Paid_Amount", "Drug_Name"])
        valid, error = validate_plan(plan, claims_df)
        assert valid is True


# ---------------------------------------------------------------------------
#  9. End-to-End Query Tests (critical PBM test cases)
# ---------------------------------------------------------------------------

class TestEndToEndPBMQueries:
    def test_state_highest_spend(self, joined_df):
        result = run_query(joined_df, "Which state has the highest pharmacy spend?")
        assert result["metric_used"] == "Paid_Amount"
        assert result["group_by"] == "State"
        assert result["confidence"] >= 0.7

    def test_chronic_condition_drug_cost(self, joined_df):
        result = run_query(joined_df, "Which chronic condition generates highest drug cost?")
        assert result["metric_used"] == "Paid_Amount"
        assert result["group_by"] == "Chronic_Condition"

    def test_drug_highest_spend(self, claims_df):
        result = run_query(claims_df, "Which drug generates highest spend?")
        assert result["metric_used"] == "Paid_Amount"
        assert result["group_by"] == "Drug_Name"

    def test_spend_never_uses_age(self, joined_df):
        result = run_query(joined_df, "Total pharmacy spend by state")
        assert result["metric_used"] != "Age"
        assert result["metric_used"] == "Paid_Amount"

    def test_cost_never_uses_age(self, joined_df):
        result = run_query(joined_df, "Drug cost by chronic condition")
        assert result["metric_used"] != "Age"

    def test_reasoning_is_populated(self, joined_df):
        result = run_query(joined_df, "Which state has the highest pharmacy spend?")
        assert isinstance(result["reasoning"], list)
        assert len(result["reasoning"]) > 0

    def test_no_sql_in_response(self, joined_df):
        result = run_query(joined_df, "Which state has highest spend?")
        assert "sql" not in result

    def test_planner_in_response(self, joined_df):
        result = run_query(joined_df, "Total spend by state")
        assert "planner" in result
        assert result["planner"]["metric"] == "Paid_Amount"

    def test_filter_applied_in_query(self, claims_df):
        result = run_query(claims_df, "Total spend on generic drugs by pharmacy")
        assert result["metric_used"] == "Paid_Amount"
        assert result["planner"] is not None


# ---------------------------------------------------------------------------
#  10. Intent Classification Integration Tests
# ---------------------------------------------------------------------------

class TestClassifyIntentPBM:
    def test_spend_by_state_intent(self, joined_df):
        norm = _normalize_dataframe(joined_df)
        intent = _classify_intent("Which state has highest pharmacy spend?", norm)
        assert "Paid_Amount" in intent["metric_cols"]
        assert "State" in intent["group_cols"]
        assert intent["metric_cols"][0] != "Age"

    def test_drug_cost_intent(self, claims_df):
        norm = _normalize_dataframe(claims_df)
        intent = _classify_intent("Which drug generates highest drug cost?", norm)
        assert "Paid_Amount" in intent["metric_cols"]
        assert "Drug_Name" in intent["group_cols"]

    def test_copay_by_pharmacy_intent(self, claims_df):
        norm = _normalize_dataframe(claims_df)
        intent = _classify_intent("Total copay by pharmacy", norm)
        assert "Member_Copay" in intent["metric_cols"]

    def test_pbm_intent_tagged(self, joined_df):
        norm = _normalize_dataframe(joined_df)
        intent = _classify_intent("Which state has highest spend?", norm)
        assert intent["pbm_intent"] == PBMIntent.SPEND_ANALYSIS
