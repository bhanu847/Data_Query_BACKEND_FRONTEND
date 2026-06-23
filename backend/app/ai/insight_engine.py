"""
GenAI Business Insight Engine.

Transforms raw analytical results into executive-grade narratives:
  - Key Findings (patterns, concentrations, outliers, comparisons)
  - Business Impact (why it matters)
  - Recommendations (actionable next steps)
  - Executive Summary
  - Visualization Narrative (chart commentary)
  - Confidence Explanation

Works with or without an LLM — falls back to rule-based generation.
"""

from __future__ import annotations

import json
import math
from typing import Any

import numpy as np
import pandas as pd

from app.config import settings


# ---------------------------------------------------------------------------
#  Formatting helpers
# ---------------------------------------------------------------------------

def _fmt(val: Any) -> str:
    if val is None:
        return "N/A"
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return "N/A"
        if abs(val) >= 1_000_000:
            return f"${val / 1_000_000:,.1f}M"
        if abs(val) >= 1_000:
            return f"${val / 1_000:,.1f}K"
        return f"${val:,.2f}"
    if isinstance(val, (int, np.integer)):
        if abs(val) >= 1_000_000:
            return f"${int(val) / 1_000_000:,.1f}M"
        if abs(val) >= 1_000:
            return f"${int(val) / 1_000:,.1f}K"
        return f"${int(val):,}"
    return str(val)


def _fmt_plain(val: Any) -> str:
    """Format without $ prefix for non-monetary values."""
    if val is None:
        return "N/A"
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return "N/A"
        if abs(val) >= 1_000_000:
            return f"{val / 1_000_000:,.1f}M"
        if abs(val) >= 1_000:
            return f"{val / 1_000:,.1f}K"
        return f"{val:,.2f}"
    if isinstance(val, (int, np.integer)):
        return f"{int(val):,}"
    return str(val)


def _label(col: str) -> str:
    return col.replace("_", " ").replace("-", " ").title()


# ---------------------------------------------------------------------------
#  Rule-based insight generation (no LLM needed)
# ---------------------------------------------------------------------------

def generate_key_findings(
    result_df: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
    df_full: pd.DataFrame,
) -> list[str]:
    """Generate key findings from the analytical result."""
    findings: list[str] = []
    if result_df.empty or not group_col:
        return findings

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    if not value_col or value_col not in result_df.columns:
        return findings

    sorted_df = result_df.sort_values(value_col, ascending=False)
    n = len(sorted_df)
    if n == 0:
        return findings

    top = sorted_df.iloc[0]
    top_val = top[value_col]
    total = sorted_df[value_col].sum() if pd.api.types.is_numeric_dtype(sorted_df[value_col]) else 0

    # 1. Top contributor with context
    if total > 0:
        pct = (top_val / total) * 100
        findings.append(
            f"{top[group_col]} is the largest contributor to {_label(value_col)}, "
            f"accounting for {pct:.1f}% of the total ({_fmt(top_val)})."
        )
    else:
        findings.append(f"{top[group_col]} leads in {_label(value_col)} with {_fmt(top_val)}.")

    # 2. Concentration analysis
    if n >= 3 and total > 0:
        top3_sum = sorted_df.head(3)[value_col].sum()
        top3_pct = (top3_sum / total) * 100
        if top3_pct > 60:
            top3_names = ", ".join(str(sorted_df.iloc[i][group_col]) for i in range(min(3, n)))
            findings.append(
                f"High concentration: The top 3 {_label(group_col)}s ({top3_names}) "
                f"represent {top3_pct:.1f}% of total {_label(value_col)}, "
                f"indicating significant concentration risk."
            )

    # 3. Top vs bottom comparison
    if n >= 2:
        bottom = sorted_df.iloc[-1]
        bottom_val = bottom[value_col]
        if bottom_val > 0:
            ratio = top_val / bottom_val
            if ratio >= 2:
                findings.append(
                    f"{top[group_col]} spends {ratio:.1f}x more than {bottom[group_col]}, "
                    f"revealing significant disparity across {_label(group_col)}s."
                )

    # 4. Distribution skewness
    if n >= 5 and pd.api.types.is_numeric_dtype(sorted_df[value_col]):
        mean_val = sorted_df[value_col].mean()
        median_val = sorted_df[value_col].median()
        if mean_val > 0 and abs(mean_val - median_val) / mean_val > 0.2:
            skew = "right" if mean_val > median_val else "left"
            findings.append(
                f"The {_label(value_col)} distribution is {skew}-skewed "
                f"(mean {_fmt(mean_val)} vs median {_fmt(median_val)}), "
                f"suggesting a small number of {_label(group_col)}s drive disproportionate volume."
            )

    return findings


def generate_business_impact(
    metric_col: str | None,
    group_col: str | None,
    result_df: pd.DataFrame,
    question: str,
) -> str:
    """Generate a business impact statement."""
    if result_df.empty or not group_col:
        return ""

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    if not value_col or value_col not in result_df.columns:
        return ""

    sorted_df = result_df.sort_values(value_col, ascending=False)
    top = sorted_df.iloc[0]
    total = sorted_df[value_col].sum() if pd.api.types.is_numeric_dtype(sorted_df[value_col]) else 0
    top_pct = (top[value_col] / total * 100) if total > 0 else 0
    n = len(sorted_df)

    ml = (metric_col or "").lower()
    is_cost = any(w in ml for w in ("paid", "cost", "amount", "spend", "copay", "ingredient"))

    if is_cost and top_pct > 30:
        return (
            f"High concentration of {_label(value_col)} in {top[group_col]} "
            f"({top_pct:.0f}% of total) suggests elevated financial exposure. "
            f"This warrants targeted utilization management and cost containment strategies."
        )
    if is_cost:
        return (
            f"The distribution of {_label(value_col)} across {n} {_label(group_col)}s "
            f"reveals opportunities for cost optimization and resource reallocation."
        )

    return (
        f"The analysis across {n} {_label(group_col)}s provides actionable intelligence "
        f"for strategic decision-making and performance optimization."
    )


def generate_recommendations(
    result_df: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
    question: str,
    df_full: pd.DataFrame,
) -> list[str]:
    """Generate actionable recommendations based on findings."""
    recs: list[str] = []
    if result_df.empty or not group_col:
        return recs

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    if not value_col or value_col not in result_df.columns:
        return recs

    sorted_df = result_df.sort_values(value_col, ascending=False)
    total = sorted_df[value_col].sum() if pd.api.types.is_numeric_dtype(sorted_df[value_col]) else 0
    n = len(sorted_df)
    ml = (metric_col or "").lower()
    is_cost = any(w in ml for w in ("paid", "cost", "amount", "spend", "copay", "ingredient"))

    # Concentration recommendations
    if n >= 3 and total > 0:
        top_pct = (sorted_df.iloc[0][value_col] / total) * 100
        if top_pct > 50:
            recs.append(
                f"Review concentration risk: {sorted_df.iloc[0][group_col]} accounts for "
                f"{top_pct:.0f}% of {_label(value_col)}. Evaluate cost containment and "
                f"diversification strategies."
            )
        elif top_pct > 30:
            recs.append(
                f"Monitor {sorted_df.iloc[0][group_col]} closely — it drives {top_pct:.0f}% of "
                f"{_label(value_col)} and represents the primary financial exposure."
            )

    # Specialty drug recommendation
    gl = group_col.lower()
    if "drug_type" in gl or "drugtype" in gl:
        for _, row in sorted_df.iterrows():
            if "specialty" in str(row[group_col]).lower() and total > 0:
                spec_pct = (row[value_col] / total) * 100
                if spec_pct > 40:
                    recs.append(
                        f"Specialty drugs represent {spec_pct:.0f}% of {_label(value_col)}. "
                        f"Analyze specialty drug utilization patterns and rebate opportunities."
                    )
                break

    # Bottom performer recommendation
    if n >= 3 and is_cost:
        bottom = sorted_df.iloc[-1]
        recs.append(
            f"Investigate low-volume {_label(group_col)}s like {bottom[group_col]} "
            f"for potential consolidation or efficiency improvements."
        )

    # General strategic recommendation
    if is_cost:
        recs.append(
            f"Implement periodic {_label(group_col)}-level spend reviews to "
            f"identify emerging cost trends and intervention opportunities."
        )

    return recs[:4]


def generate_executive_summary(
    answer: str,
    findings: list[str],
    impact: str,
    recommendations: list[str],
    metric_col: str | None,
    group_col: str | None,
    confidence: float,
) -> str:
    """Generate a concise executive summary."""
    parts: list[str] = []

    if findings:
        parts.append(findings[0])

    if impact:
        parts.append(impact)

    if recommendations:
        parts.append(f"Recommended action: {recommendations[0]}")

    if not parts:
        return answer

    return " ".join(parts)


def generate_chart_narrative(
    chart: dict | None,
    result_df: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
) -> str:
    """Generate AI commentary for the visualization."""
    if not chart or result_df.empty or not group_col:
        return ""

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    if not value_col or value_col not in result_df.columns:
        return ""

    sorted_df = result_df.sort_values(value_col, ascending=False)
    n = len(sorted_df)

    chart_type = chart.get("type", "bar")
    if chart_type == "pie":
        return (
            f"The pie chart illustrates the relative distribution of {_label(value_col)} "
            f"across {n} {_label(group_col)} segments, highlighting where spend is concentrated."
        )
    if chart_type == "line":
        return (
            f"The trend line reveals the trajectory of {_label(value_col)} over time, "
            f"enabling identification of growth patterns and seasonal variations."
        )
    if chart_type == "scatter":
        return (
            f"The scatter plot reveals the relationship between the selected variables, "
            f"with each point representing a data observation."
        )

    # Bar chart (default)
    if n >= 3:
        top_val = sorted_df.iloc[0][value_col]
        second_val = sorted_df.iloc[1][value_col] if n >= 2 else 0
        if second_val > 0:
            gap_pct = ((top_val - second_val) / second_val) * 100
            if gap_pct > 20:
                return (
                    f"The visualization highlights a notable gap between {sorted_df.iloc[0][group_col]} "
                    f"and the next {_label(group_col)}, with a {gap_pct:.0f}% difference — "
                    f"indicating {_label(value_col)} is heavily concentrated at the top."
                )
        return (
            f"The chart shows a clear drop-off in {_label(value_col)} across {_label(group_col)}s, "
            f"suggesting that targeted strategies for the top performers would have the greatest impact."
        )
    return ""


def generate_confidence_explanation(
    confidence: float,
    metric_col: str | None,
    group_col: str | None,
    reasoning: list[str],
    df: pd.DataFrame,
) -> dict[str, Any]:
    """Generate a human-readable confidence explanation."""
    level = "High" if confidence >= 0.85 else "Medium" if confidence >= 0.65 else "Low"
    pct = round(confidence * 100)

    reasons: list[str] = []
    if metric_col and metric_col in df.columns:
        null_pct = (df[metric_col].isna().sum() / len(df)) * 100
        if null_pct < 1:
            reasons.append("Required metric column is available with no missing values.")
        elif null_pct < 5:
            reasons.append(f"Metric column available with minimal missing data ({null_pct:.1f}%).")
        else:
            reasons.append(f"Note: {null_pct:.1f}% of {metric_col} values are missing.")
    elif metric_col:
        reasons.append(f"Metric '{metric_col}' was resolved from business terminology.")
    else:
        reasons.append("No specific metric was identified — results may be approximate.")

    if group_col and group_col in df.columns:
        reasons.append(f"Dimension '{group_col}' is available for grouping.")
    elif group_col:
        reasons.append(f"Dimension '{group_col}' was inferred from context.")

    if any("filter" in r.lower() for r in reasoning):
        reasons.append("Filters were applied to narrow the analysis scope.")

    reasons.append("Direct aggregation was performed on the source data.")

    return {
        "level": level,
        "score": pct,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
#  LLM-powered narrative enhancement (optional)
# ---------------------------------------------------------------------------

_NARRATIVE_PROMPT = """You are a Senior Business Analyst. Given analytical results, generate a business narrative.

RULES:
- Write like an analyst presenting to executives
- Be specific — use actual numbers from the data
- Never fabricate numbers or conclusions not supported by the data
- If evidence is insufficient, say so explicitly
- No SQL references — this is a Pandas-based analytics system

Input format:
{
  "question": "the user's question",
  "metric": "column used",
  "dimension": "grouping column",
  "top_results": [...],
  "total": number,
  "record_count": number
}

Return ONLY valid JSON:
{
  "executive_summary": "2-3 sentence executive summary",
  "key_findings": ["finding1", "finding2", "finding3"],
  "business_impact": "Why this matters to the organization",
  "recommendations": ["actionable recommendation 1", "actionable recommendation 2"],
  "chart_narrative": "One sentence describing what the visualization reveals",
  "data_story": "The analytical result rewritten as a business narrative (2-3 sentences)"
}"""


def _get_client():
    key = settings.OPENAI_API_KEY
    if not key or not key.startswith("sk-"):
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=key, timeout=15.0, max_retries=1)
    except Exception:
        return None


def enhance_with_llm(
    question: str,
    answer: str,
    result_df: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
    insights: list[str],
) -> dict[str, Any] | None:
    """Use LLM to generate richer narrative from analytical results."""
    client = _get_client()
    if not client:
        return None

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    top_results = []
    if not result_df.empty and group_col and value_col and value_col in result_df.columns:
        sorted_df = result_df.sort_values(value_col, ascending=False).head(5)
        for _, row in sorted_df.iterrows():
            top_results.append({
                str(group_col): str(row.get(group_col, "")),
                str(value_col): float(row[value_col]) if pd.api.types.is_numeric_dtype(sorted_df[value_col]) else str(row[value_col]),
            })

    total = float(result_df[value_col].sum()) if value_col and value_col in result_df.columns and pd.api.types.is_numeric_dtype(result_df[value_col]) else 0

    payload = {
        "question": question,
        "metric": metric_col,
        "dimension": group_col,
        "top_results": top_results,
        "total": total,
        "record_count": len(result_df),
        "current_answer": answer,
    }

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _NARRATIVE_PROMPT},
                {"role": "user", "content": json.dumps(payload, default=str)},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=800,
        )
        raw = (response.choices[0].message.content or "").strip()
        return json.loads(raw)
    except Exception:
        return None


# ---------------------------------------------------------------------------
#  Main orchestrator — combines rule-based + LLM insights
# ---------------------------------------------------------------------------

def build_business_response(
    answer: str,
    result_df: pd.DataFrame,
    df_full: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
    question: str,
    confidence: float,
    reasoning: list[str],
    chart: dict | None = None,
) -> dict[str, Any]:
    """
    Build a complete business intelligence response.

    Returns enriched fields: executive_summary, key_findings, business_impact,
    recommendations, chart_narrative, confidence_explanation, data_story.
    """
    # 1. Rule-based generation (always available)
    key_findings = generate_key_findings(result_df, metric_col, group_col, df_full)
    impact = generate_business_impact(metric_col, group_col, result_df, question)
    recommendations = generate_recommendations(result_df, metric_col, group_col, question, df_full)
    chart_narrative = generate_chart_narrative(chart, result_df, metric_col, group_col)
    confidence_explanation = generate_confidence_explanation(
        confidence, metric_col, group_col, reasoning, df_full
    )
    exec_summary = generate_executive_summary(
        answer, key_findings, impact, recommendations, metric_col, group_col, confidence
    )

    # 2. Try LLM enhancement (non-blocking — falls back gracefully)
    llm_result = enhance_with_llm(question, answer, result_df, metric_col, group_col, key_findings)
    if llm_result:
        if llm_result.get("executive_summary"):
            exec_summary = llm_result["executive_summary"]
        if llm_result.get("key_findings"):
            key_findings = llm_result["key_findings"]
        if llm_result.get("business_impact"):
            impact = llm_result["business_impact"]
        if llm_result.get("recommendations"):
            recommendations = llm_result["recommendations"]
        if llm_result.get("chart_narrative"):
            chart_narrative = llm_result["chart_narrative"]
        data_story = llm_result.get("data_story", "")
    else:
        data_story = _build_data_story(answer, result_df, metric_col, group_col)

    return {
        "executive_summary": exec_summary,
        "key_findings": key_findings,
        "business_impact": impact,
        "recommendations": recommendations,
        "chart_narrative": chart_narrative,
        "confidence_explanation": confidence_explanation,
        "data_story": data_story,
    }


def _build_data_story(
    answer: str,
    result_df: pd.DataFrame,
    metric_col: str | None,
    group_col: str | None,
) -> str:
    """Rule-based data storytelling when LLM is unavailable."""
    if result_df.empty or not group_col:
        return answer

    value_col = metric_col or ("count" if "count" in result_df.columns else None)
    if not value_col or value_col not in result_df.columns:
        return answer

    sorted_df = result_df.sort_values(value_col, ascending=False)
    total = sorted_df[value_col].sum() if pd.api.types.is_numeric_dtype(sorted_df[value_col]) else 0
    n = len(sorted_df)

    if n == 0 or total == 0:
        return answer

    top = sorted_df.iloc[0]
    top_pct = (top[value_col] / total * 100)

    story = (
        f"{top[group_col]} is the largest contributor to {_label(value_col)}, "
        f"accounting for more than {top_pct:.0f}% of total costs"
    )

    if n >= 2:
        second = sorted_df.iloc[1]
        story += f", followed by {second[group_col]}"

    story += (
        f". Across all {n} {_label(group_col)} segments, "
        f"the total {_label(value_col)} stands at {_fmt(total)}"
    )

    if n >= 3:
        top3_sum = sorted_df.head(3)[value_col].sum()
        top3_pct = (top3_sum / total) * 100
        if top3_pct > 60:
            story += (
                f", with the top 3 segments alone representing {top3_pct:.0f}% — "
                f"a clear signal of concentration that warrants strategic attention"
            )

    story += "."
    return story
