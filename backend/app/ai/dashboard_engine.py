"""
AI Dashboard Intelligence Engine.

Auto-generates executive dashboards with AI-powered analysis:
  - KPI generation with business context
  - Intelligent chart selection
  - Per-chart insight narratives (what happened, why, what to do)
  - Outlier detection
  - Trend identification
  - Correlation analysis
  - Executive summary with risks & opportunities
"""

import math
from typing import Any

import numpy as np
import pandas as pd

from app.ai.insight_engine import _fmt, _fmt_plain, _label


def _numeric_cols(df: pd.DataFrame) -> list[str]:
    return df.select_dtypes(include=[np.number]).columns.tolist()


def _datetime_col(df: pd.DataFrame) -> str | None:
    for c in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[c]):
            return c
        if pd.api.types.is_numeric_dtype(df[c]):
            continue
        if any(w in c.lower() for w in ("date", "time", "day", "month", "year", "created")):
            try:
                parsed = pd.to_datetime(df[c], errors="raise")
                df[c] = parsed
                return c
            except Exception:
                continue
    return None


def _categorical_cols(df: pd.DataFrame, dt_col: str | None) -> list[str]:
    cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    return [c for c in cols if c != dt_col and df[c].nunique() <= 50]


def _records(df: pd.DataFrame) -> list[dict]:
    return df.where(pd.notnull(df), None).to_dict(orient="records")


def _find_revenue_col(numeric: list[str]) -> str | None:
    for n in numeric:
        nl = n.lower()
        if any(w in nl for w in ("price", "revenue", "sales", "amount", "total",
                                  "profit", "cost", "paid", "spend", "copay")):
            return n
    return numeric[0] if numeric else None


# ---------------------------------------------------------------------------
#  KPI Generation with Business Context
# ---------------------------------------------------------------------------

def _generate_kpis(df: pd.DataFrame, numeric: list[str], categorical: list[str],
                   rev_col: str | None) -> list[dict]:
    kpis = [{"label": "Total Records", "value": f"{len(df):,}",
             "description": "Total data points in the dataset"}]

    for col in numeric[:6]:
        nl = col.lower()
        if any(w in nl for w in ("id", "index", "key", "code", "zip", "phone")):
            continue

        total = df[col].sum()
        avg = df[col].mean()
        is_monetary = any(w in nl for w in ("price", "revenue", "sales", "amount",
                                             "total", "cost", "profit", "paid", "spend", "copay"))
        fmt = _fmt if is_monetary else _fmt_plain

        kpis.append({
            "label": f"Total {_label(col)}",
            "value": fmt(total),
            "description": f"Aggregate across {len(df):,} records",
        })

        if is_monetary:
            kpis.append({
                "label": f"Avg {_label(col)}",
                "value": fmt(avg),
                "description": f"Per-record average",
            })

    if categorical:
        kpis.append({
            "label": f"Unique {_label(categorical[0])}",
            "value": f"{df[categorical[0]].nunique():,}",
            "description": f"Distinct {_label(categorical[0])} values",
        })

    return kpis[:8]


# ---------------------------------------------------------------------------
#  Chart Generation with AI Narratives
# ---------------------------------------------------------------------------

def _generate_chart_insight(chart_type: str, df: pd.DataFrame,
                             x_col: str, y_col: str, title: str) -> str:
    """Generate an AI narrative for a chart."""
    if chart_type in ("bar", "pie"):
        grouped = df.groupby(x_col, dropna=False)[y_col].sum().sort_values(ascending=False)
        if grouped.empty:
            return ""
        total = grouped.sum()
        top_name = grouped.index[0]
        top_val = grouped.iloc[0]
        top_pct = (top_val / total * 100) if total > 0 else 0

        if len(grouped) >= 2:
            bottom_name = grouped.index[-1]
            bottom_val = grouped.iloc[-1]
            ratio = (top_val / bottom_val) if bottom_val > 0 else 0

            if top_pct > 40:
                return (
                    f"{top_name} dominates {_label(y_col)}, contributing {top_pct:.0f}% "
                    f"of the total. This concentration suggests significant exposure — "
                    f"if {top_name} performance shifts, overall metrics would be materially impacted."
                )
            if ratio > 3:
                return (
                    f"{top_name} leads with {ratio:.1f}x more {_label(y_col)} than {bottom_name}, "
                    f"revealing a wide performance gap across {_label(x_col)} segments."
                )
        return (
            f"{top_name} is the top {_label(x_col)} by {_label(y_col)}, "
            f"accounting for {top_pct:.0f}% of total volume."
        )

    if chart_type == "line":
        return (
            f"The trend line shows how {_label(y_col)} has evolved over time. "
            f"Monitor for sustained directional changes that may require strategic intervention."
        )

    if chart_type == "scatter":
        return (
            f"The scatter plot reveals the relationship between {_label(x_col)} and {_label(y_col)}. "
            f"Clusters and outliers may indicate distinct segments or anomalies worth investigating."
        )

    return ""


def _auto_charts(df: pd.DataFrame, numeric: list[str], categorical: list[str],
                 dt_col: str | None, rev_col: str | None) -> list[dict]:
    charts: list[dict] = []

    # 1. Category breakdown (bar or pie)
    if categorical and rev_col:
        group = categorical[0]
        agg = df.groupby(group)[rev_col].sum().reset_index().sort_values(rev_col, ascending=False)
        ctype = "pie" if agg.shape[0] <= 6 else "bar"
        title = f"{_label(rev_col)} by {_label(group)}"
        insight = _generate_chart_insight(ctype, df, group, rev_col, title)
        charts.append({
            "type": ctype, "title": title, "x": group, "y": rev_col,
            "data": _records(agg.head(12)), "insight": insight,
        })

    # 2. Trend chart
    if dt_col and rev_col:
        trend = df[[dt_col, rev_col]].dropna().sort_values(dt_col)
        if len(trend) >= 2:
            trend_agg = trend.groupby(trend[dt_col].dt.to_period("M").astype(str))[rev_col].sum().reset_index()
            trend_agg.columns = [dt_col, rev_col]
            title = f"{_label(rev_col)} Trend Over Time"
            insight = _generate_chart_insight("line", df, dt_col, rev_col, title)
            charts.append({
                "type": "line", "title": title, "x": dt_col, "y": rev_col,
                "data": _records(trend_agg), "insight": insight,
            })

    # 3. Second categorical
    if len(categorical) > 1 and rev_col:
        group = categorical[1]
        agg = df.groupby(group)[rev_col].sum().reset_index().sort_values(rev_col, ascending=False)
        title = f"{_label(rev_col)} by {_label(group)}"
        insight = _generate_chart_insight("bar", df, group, rev_col, title)
        charts.append({
            "type": "bar", "title": title, "x": group, "y": rev_col,
            "data": _records(agg.head(12)), "insight": insight,
        })

    # 4. Correlation scatter
    if len(numeric) >= 2:
        x, y = numeric[0], numeric[1]
        sample = df[[x, y]].dropna().head(200)
        title = f"{_label(x)} vs {_label(y)}"
        insight = _generate_chart_insight("scatter", df, x, y, title)
        charts.append({
            "type": "scatter", "title": title, "x": x, "y": y,
            "data": _records(sample), "insight": insight,
        })

    return charts[:8]


# ---------------------------------------------------------------------------
#  Outlier Detection
# ---------------------------------------------------------------------------

def _detect_outliers(df: pd.DataFrame, numeric: list[str]) -> list[str]:
    outlier_insights: list[str] = []

    for col in numeric[:3]:
        nl = col.lower()
        if any(w in nl for w in ("id", "index", "key", "code", "zip")):
            continue

        series = df[col].dropna()
        if len(series) < 10:
            continue

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        upper = q3 + 1.5 * iqr
        outlier_count = (series > upper).sum()

        if outlier_count > 0:
            pct = (outlier_count / len(series)) * 100
            max_val = series.max()
            mean_val = series.mean()
            ratio = (max_val / mean_val) if mean_val > 0 else 0

            if ratio > 5:
                outlier_insights.append(
                    f"Outlier alert: {outlier_count} records ({pct:.1f}%) have {_label(col)} "
                    f"above {_fmt_plain(upper)}. The maximum ({_fmt_plain(max_val)}) is "
                    f"{ratio:.1f}x the average, suggesting extreme values that may warrant "
                    f"case-level review."
                )
            elif pct > 5:
                outlier_insights.append(
                    f"{outlier_count} records ({pct:.1f}%) show unusually high {_label(col)} "
                    f"values (above {_fmt_plain(upper)}), indicating potential anomalies."
                )

    return outlier_insights[:3]


# ---------------------------------------------------------------------------
#  Trend Detection
# ---------------------------------------------------------------------------

def _detect_trends(df: pd.DataFrame, dt_col: str | None, rev_col: str | None) -> list[str]:
    if not dt_col or not rev_col:
        return []

    trend_insights: list[str] = []
    tmp = df[[dt_col, rev_col]].dropna().sort_values(dt_col)
    if len(tmp) < 10:
        return []

    tmp["_period"] = tmp[dt_col].dt.to_period("M").astype(str)
    monthly = tmp.groupby("_period")[rev_col].sum()

    if len(monthly) >= 2:
        first_half = monthly.iloc[:len(monthly) // 2].mean()
        second_half = monthly.iloc[len(monthly) // 2:].mean()
        if first_half > 0:
            growth = (second_half - first_half) / first_half * 100
            direction = "increasing" if growth > 0 else "decreasing"
            severity = "significant" if abs(growth) > 20 else "moderate" if abs(growth) > 10 else "slight"

            trend_insights.append(
                f"{_label(rev_col)} shows a {severity} {direction} trend "
                f"({growth:+.1f}% between the first and second half of the period). "
                + (
                    "This upward trajectory may indicate growing demand or cost escalation "
                    "that requires monitoring."
                    if growth > 10 else
                    "This decline may signal reduced activity or improved cost management."
                    if growth < -10 else
                    "The metric has remained relatively stable over the observed period."
                )
            )

    return trend_insights


# ---------------------------------------------------------------------------
#  Correlation Detection
# ---------------------------------------------------------------------------

def _detect_correlations(df: pd.DataFrame, numeric: list[str]) -> list[str]:
    if len(numeric) < 2:
        return []

    corr_insights: list[str] = []
    checked = set()

    for i, col_a in enumerate(numeric[:5]):
        for col_b in numeric[i + 1:5]:
            pair = tuple(sorted([col_a, col_b]))
            if pair in checked:
                continue
            checked.add(pair)

            try:
                corr = df[[col_a, col_b]].dropna().corr().iloc[0, 1]
            except Exception:
                continue

            if math.isnan(corr):
                continue

            abs_corr = abs(corr)
            if abs_corr > 0.6:
                strength = "strong" if abs_corr > 0.8 else "moderate-to-strong"
                direction = "positive" if corr > 0 else "negative"
                corr_insights.append(
                    f"{strength.title()} {direction} correlation (r={corr:.2f}) between "
                    f"{_label(col_a)} and {_label(col_b)}. "
                    + (
                        f"As {_label(col_a)} increases, {_label(col_b)} tends to increase as well."
                        if corr > 0 else
                        f"As {_label(col_a)} increases, {_label(col_b)} tends to decrease."
                    )
                )

    return corr_insights[:3]


# ---------------------------------------------------------------------------
#  Executive Summary
# ---------------------------------------------------------------------------

def _generate_executive_summary(
    df: pd.DataFrame,
    kpis: list[dict],
    insights: list[str],
    numeric: list[str],
    categorical: list[str],
) -> str:
    parts = [
        f"This dashboard analyzes {len(df):,} records across {len(df.columns)} dimensions. "
    ]

    if kpis and len(kpis) > 1:
        metric_summaries = [f"{k['label']}: {k['value']}" for k in kpis[1:4]]
        parts.append(f"Key metrics: {', '.join(metric_summaries)}. ")

    if insights:
        parts.append(insights[0] + " ")

    if categorical:
        parts.append(
            f"The data is segmented across {len(categorical)} categorical dimensions "
            f"including {', '.join(_label(c) for c in categorical[:3])}. "
        )

    return "".join(parts)


# ---------------------------------------------------------------------------
#  Main Entry Point
# ---------------------------------------------------------------------------

def generate_dashboard(df: pd.DataFrame, name: str = "Dataset") -> dict:
    numeric = _numeric_cols(df)
    dt_col = _datetime_col(df)
    categorical = _categorical_cols(df, dt_col)
    rev_col = _find_revenue_col(numeric)

    # KPIs with business context
    kpis = _generate_kpis(df, numeric, categorical, rev_col)

    # Charts with per-chart AI narratives
    charts = _auto_charts(df, numeric, categorical, dt_col, rev_col)

    # AI-generated insights
    insights: list[str] = []

    # Category concentration analysis
    if categorical and rev_col:
        top = df.groupby(categorical[0])[rev_col].sum().sort_values(ascending=False)
        if len(top) >= 1:
            total = top.sum()
            pct = (top.iloc[0] / total * 100) if total > 0 else 0
            insights.append(
                f'{top.index[0]} is the leading {_label(categorical[0])}, contributing '
                f'{pct:.1f}% of total {_label(rev_col)} ({_fmt(top.iloc[0])}).'
            )
        if len(top) >= 2:
            ratio = (top.iloc[0] / top.iloc[-1]) if top.iloc[-1] > 0 else 0
            if ratio > 3:
                insights.append(
                    f'Wide performance gap: {top.index[0]} generates {ratio:.1f}x more '
                    f'{_label(rev_col)} than {top.index[-1]}.'
                )

    # Outlier detection
    insights.extend(_detect_outliers(df, numeric))

    # Trend detection
    insights.extend(_detect_trends(df, dt_col, rev_col))

    # Correlation detection
    insights.extend(_detect_correlations(df, numeric))

    # Executive summary
    executive_summary = _generate_executive_summary(df, kpis, insights, numeric, categorical)

    # Recommendations
    recommendations: list[str] = []
    if categorical and rev_col:
        top = df.groupby(categorical[0])[rev_col].sum().sort_values(ascending=False)
        total = top.sum()
        if total > 0:
            top_pct = (top.iloc[0] / total) * 100
            if top_pct > 40:
                recommendations.append(
                    f"Investigate {top.index[0]} — it drives {top_pct:.0f}% of "
                    f"{_label(rev_col)} and represents a concentration risk."
                )
            if len(top) >= 3:
                recommendations.append(
                    f"Focus on top {_label(categorical[0])} segments "
                    f"({', '.join(str(v) for v in top.index[:3])}) for maximum impact."
                )

    recommendations.append(
        "Set up automated monitoring for the identified outliers and trends to enable proactive management."
    )

    return {
        "title": f"{name} Dashboard",
        "kpis": kpis,
        "charts": charts,
        "insights": insights,
        "executive_summary": executive_summary,
        "recommendations": recommendations,
    }
