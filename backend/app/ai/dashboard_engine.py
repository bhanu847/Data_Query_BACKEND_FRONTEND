"""
Dashboard engine: profiles a DataFrame and auto-generates KPIs, charts and
insights without the user choosing chart types.

Chart selection rules:
  - a detected date/time column + numeric  -> line chart (trend)
  - a categorical column + numeric         -> bar (or pie if <= 6 categories)
  - two numeric columns                    -> scatter (correlation)
"""
import numpy as np
import pandas as pd


def _numeric_cols(df):
    return df.select_dtypes(include=[np.number]).columns.tolist()


def _datetime_col(df):
    for c in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[c]):
            return c
        if pd.api.types.is_numeric_dtype(df[c]):
            continue
        # Try to parse object/string columns that look like dates
        if "date" in c.lower() or "time" in c.lower() or "day" in c.lower():
            try:
                parsed = pd.to_datetime(df[c], errors="raise")
                df[c] = parsed
                return c
            except Exception:
                continue
    return None


def _categorical_cols(df, dt_col):
    cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    return [c for c in cols if c != dt_col and df[c].nunique() <= 50]


def _records(df):
    return df.where(pd.notnull(df), None).to_dict(orient="records")


def generate_dashboard(df: pd.DataFrame, name: str = "Dataset") -> dict:
    numeric = _numeric_cols(df)
    dt_col = _datetime_col(df)
    categorical = _categorical_cols(df, dt_col)

    kpis = [{"label": "Rows", "value": f"{len(df):,}"},
            {"label": "Columns", "value": str(df.shape[1])}]
    for col in numeric[:3]:
        total = df[col].sum()
        kpis.append({"label": f"Total {col}", "value": f"{round(total, 2):,}"})

    charts: list[dict] = []
    insights: list[str] = []

    # Trend chart
    if dt_col and numeric:
        metric = numeric[0]
        trend = df[[dt_col, metric]].dropna().sort_values(dt_col)
        trend = trend.groupby(trend[dt_col].dt.to_period("M").astype(str))[metric].sum().reset_index()
        trend.columns = [dt_col, metric]
        charts.append({"type": "line", "title": f"{metric} over time", "x": dt_col, "y": metric, "data": _records(trend)})
        if len(trend) >= 2:
            first, last = trend[metric].iloc[0], trend[metric].iloc[-1]
            if first:
                pct = (last - first) / abs(first) * 100
                insights.append(f"{metric} changed {pct:+.1f}% from first to last period.")

    # Category breakdown
    if categorical and numeric:
        group, metric = categorical[0], numeric[0]
        agg = df.groupby(group)[metric].sum().reset_index().sort_values(metric, ascending=False)
        ctype = "pie" if agg.shape[0] <= 6 else "bar"
        charts.append({"type": ctype, "title": f"{metric} by {group}", "x": group, "y": metric, "data": _records(agg.head(12))})
        top = agg.iloc[0]
        insights.append(f"Top {group}: {top[group]} with {round(top[metric], 2):,} {metric}.")

    # Correlation
    if len(numeric) >= 2:
        x, y = numeric[0], numeric[1]
        corr = df[[x, y]].corr().iloc[0, 1]
        sample = df[[x, y]].dropna().head(200)
        charts.append({"type": "scatter", "title": f"{x} vs {y}", "x": x, "y": y, "data": _records(sample)})
        if not np.isnan(corr):
            strength = "strong" if abs(corr) > 0.6 else "moderate" if abs(corr) > 0.3 else "weak"
            insights.append(f"{x} and {y} show a {strength} correlation ({corr:.2f}).")

    if not insights:
        insights.append("Dataset profiled. Upload richer data (dates, categories, metrics) for deeper insights.")

    return {"title": f"{name} Dashboard", "kpis": kpis, "charts": charts, "insights": insights}
