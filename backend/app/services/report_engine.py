"""
AI Business Intelligence Report Generator.

Produces executive-quality PDF reports with a full analytical pipeline:
1. Dataset Profile
2. Data Quality Assessment
3. Statistical Analysis
4. Outlier Detection
5. Correlation & Relationship Analysis
6. AI-Generated Insights
7. Intelligent Visualizations (with per-chart narratives)
8. Strategic Recommendations
9. Executive Summary

NEVER dumps raw data. Output resembles a McKinsey / senior analyst report.
"""

import io
import math
import textwrap
from datetime import datetime
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
import pandas as pd

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)

# ── Colour palette ──────────────────────────────────────────────────

BRAND      = "#0F172A"
BRAND_ALT  = "#1E293B"
ACCENT     = "#2563EB"
ACCENT2    = "#0891B2"
LIGHT_BG   = "#F8FAFC"
MUTED      = "#64748B"
SUCCESS    = "#059669"
DANGER     = "#DC2626"
CHART_COLORS = [
    "#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626",
    "#7C3AED", "#DB2777", "#0D9488", "#EA580C", "#4F46E5",
]

# ── Styles ──────────────────────────────────────────────────────────

def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle("Cover_Title", fontName="Helvetica-Bold", fontSize=28,
                          textColor=colors.white, alignment=TA_CENTER, leading=34))
    ss.add(ParagraphStyle("Cover_Sub", fontName="Helvetica", fontSize=13,
                          textColor=colors.Color(0.75, 0.82, 0.95), alignment=TA_CENTER, leading=18))
    ss.add(ParagraphStyle("Section_H", fontName="Helvetica-Bold", fontSize=16,
                          textColor=colors.HexColor(BRAND), spaceBefore=18, spaceAfter=8))
    ss.add(ParagraphStyle("Sub_H", fontName="Helvetica-Bold", fontSize=12,
                          textColor=colors.HexColor(BRAND_ALT), spaceBefore=10, spaceAfter=4))
    ss.add(ParagraphStyle("Body", fontName="Helvetica", fontSize=10,
                          textColor=colors.HexColor("#334155"), leading=15, alignment=TA_JUSTIFY))
    ss.add(ParagraphStyle("Insight", fontName="Helvetica", fontSize=10,
                          textColor=colors.HexColor("#334155"), leading=15,
                          leftIndent=14, bulletIndent=0, spaceBefore=3))
    ss.add(ParagraphStyle("KpiLabel", fontName="Helvetica", fontSize=8,
                          textColor=colors.HexColor(MUTED), alignment=TA_CENTER))
    ss.add(ParagraphStyle("KpiValue", fontName="Helvetica-Bold", fontSize=16,
                          textColor=colors.HexColor(BRAND), alignment=TA_CENTER))
    ss.add(ParagraphStyle("Footer", fontName="Helvetica", fontSize=7,
                          textColor=colors.HexColor(MUTED), alignment=TA_CENTER))
    ss.add(ParagraphStyle("ChartNarrative", fontName="Helvetica-Oblique", fontSize=9,
                          textColor=colors.HexColor(MUTED), leading=13, alignment=TA_LEFT,
                          spaceBefore=2, spaceAfter=6))
    return ss


# ── Helpers ─────────────────────────────────────────────────────────

def _fmt(v: Any) -> str:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return "N/A"
    if isinstance(v, float):
        if abs(v) >= 1_000_000_000:
            return f"{v / 1_000_000_000:,.2f}B"
        if abs(v) >= 1_000_000:
            return f"{v / 1_000_000:,.2f}M"
        if abs(v) >= 1_000:
            return f"{v / 1_000:,.1f}K"
        return f"{v:,.2f}"
    if isinstance(v, int):
        if abs(v) >= 1_000_000:
            return f"{v / 1_000_000:,.1f}M"
        if abs(v) >= 1_000:
            return f"{v / 1_000:,.1f}K"
        return f"{v:,}"
    return str(v)


def _numeric(df):
    return [c for c in df.select_dtypes(include=[np.number]).columns
            if not any(w in c.lower() for w in ("id", "index", "key", "code", "zip", "phone"))]

def _all_numeric(df):
    return df.select_dtypes(include=[np.number]).columns.tolist()

def _categorical(df):
    exc = set(_all_numeric(df) + _date_cols(df))
    return [c for c in df.columns if c not in exc and df[c].nunique() <= 50]

def _date_cols(df):
    return df.select_dtypes(include=["datetime64[ns]", "datetimetz"]).columns.tolist()

def _coerce_dates(df):
    for col in df.columns:
        if df[col].dtype == "object" and any(w in col.lower() for w in ("date", "time", "day", "month", "year", "created")):
            try:
                df[col] = pd.to_datetime(df[col], errors="coerce")
            except Exception:
                pass
    return df

def _label(col: str) -> str:
    return col.replace("_", " ").replace("-", " ").title()

def _rev_col(df) -> str | None:
    for n in _numeric(df):
        nl = n.lower()
        if any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "profit", "cost", "paid", "spend")):
            return n
    num = _numeric(df)
    return num[0] if num else None


# ── Chart generation (matplotlib -> bytes) ──────────────────────────

def _chart_to_image(fig, width_cm=16, dpi=150) -> Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight",
                facecolor="#FFFFFF", edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    w = width_cm * cm
    return Image(buf, width=w, height=w * 0.55)


def _style_ax(ax, title=""):
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0F172A", pad=12)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#E2E8F0")
    ax.spines["bottom"].set_color("#E2E8F0")
    ax.tick_params(colors="#64748B", labelsize=8)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: _fmt(v)))


def _bar_chart(df, x, y, title, limit=10):
    grp = df.groupby(x, dropna=False)[y].sum().sort_values(ascending=False).head(limit)
    if grp.empty:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    ax.bar(range(len(grp)), grp.values, color=CHART_COLORS[:len(grp)], width=0.6, zorder=3)
    ax.set_xticks(range(len(grp)))
    ax.set_xticklabels([str(v)[:18] for v in grp.index], rotation=35, ha="right", fontsize=7)
    ax.grid(axis="y", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


def _horizontal_bar(df, x, y, title, limit=10):
    grp = df.groupby(x, dropna=False)[y].sum().sort_values(ascending=True).tail(limit)
    if grp.empty:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    ax.barh(range(len(grp)), grp.values, color=CHART_COLORS[:len(grp)], height=0.55, zorder=3)
    ax.set_yticks(range(len(grp)))
    ax.set_yticklabels([str(v)[:22] for v in grp.index], fontsize=8)
    ax.grid(axis="x", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    ax.xaxis.set_major_formatter(ticker.FuncFormatter(lambda v, _: _fmt(v)))
    fig.tight_layout()
    return _chart_to_image(fig)


def _pie_chart(df, x, y, title, limit=6):
    grp = df.groupby(x, dropna=False)[y].sum().sort_values(ascending=False).head(limit)
    if grp.empty or grp.sum() == 0:
        return None
    fig, ax = plt.subplots(figsize=(7, 4.4))
    wedges, texts, autotexts = ax.pie(
        grp.values, labels=[str(v)[:16] for v in grp.index],
        autopct="%1.1f%%", colors=CHART_COLORS[:len(grp)],
        pctdistance=0.78, startangle=140, textprops={"fontsize": 8},
    )
    for t in autotexts:
        t.set_fontsize(7); t.set_color("white"); t.set_fontweight("bold")
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0F172A", pad=10)
    fig.tight_layout()
    return _chart_to_image(fig)


def _line_chart(df, date_col, y, title):
    tmp = df[[date_col, y]].dropna().sort_values(date_col)
    if len(tmp) < 2:
        return None
    tmp["_period"] = tmp[date_col].dt.to_period("M").astype(str)
    agg = tmp.groupby("_period")[y].sum()
    if len(agg) < 2:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    ax.plot(range(len(agg)), agg.values, color=ACCENT, linewidth=2, marker="o", markersize=4, zorder=3)
    ax.fill_between(range(len(agg)), agg.values, alpha=0.08, color=ACCENT, zorder=2)
    ax.set_xticks(range(len(agg)))
    ax.set_xticklabels(list(agg.index), rotation=40, ha="right", fontsize=7)
    ax.grid(axis="y", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


def _scatter_chart(df, x_col, y_col, title, limit=300):
    tmp = df[[x_col, y_col]].dropna().head(limit)
    if len(tmp) < 3:
        return None
    fig, ax = plt.subplots(figsize=(7, 4.4))
    ax.scatter(tmp[x_col], tmp[y_col], c=ACCENT, alpha=0.55, s=20, edgecolors="white", linewidth=0.3, zorder=3)
    ax.set_xlabel(x_col, fontsize=8, color="#64748B")
    ax.set_ylabel(y_col, fontsize=8, color="#64748B")
    ax.grid(alpha=0.12, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


def _histogram_chart(df, col, title):
    data = df[col].dropna()
    if len(data) < 5:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    ax.hist(data, bins=min(30, len(data) // 3 + 1), color=ACCENT, alpha=0.7, edgecolor="white", zorder=3)
    ax.axvline(data.mean(), color=DANGER, linestyle="--", linewidth=1, label=f"Mean: {_fmt(data.mean())}")
    ax.axvline(data.median(), color=SUCCESS, linestyle="--", linewidth=1, label=f"Median: {_fmt(data.median())}")
    ax.legend(fontsize=8)
    ax.grid(axis="y", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


def _box_chart(df, cols, title):
    data = [df[c].dropna().values for c in cols if len(df[c].dropna()) > 0]
    if not data:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    tick_labels = [_label(c)[:14] for c in cols]
    bp = ax.boxplot(data, patch_artist=True, widths=0.5)
    ax.set_xticks(range(1, len(tick_labels) + 1))
    ax.set_xticklabels(tick_labels, fontsize=8)
    for i, patch in enumerate(bp["boxes"]):
        patch.set_facecolor(CHART_COLORS[i % len(CHART_COLORS)])
        patch.set_alpha(0.6)
    ax.grid(axis="y", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


def _corr_heatmap(df, num_cols, title):
    if len(num_cols) < 2:
        return None
    corr = df[num_cols].corr()
    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(corr.values, cmap="RdBu_r", vmin=-1, vmax=1, aspect="auto")
    ax.set_xticks(range(len(num_cols)))
    ax.set_yticks(range(len(num_cols)))
    ax.set_xticklabels([_label(c)[:12] for c in num_cols], rotation=45, ha="right", fontsize=7)
    ax.set_yticklabels([_label(c)[:12] for c in num_cols], fontsize=7)
    for i in range(len(num_cols)):
        for j in range(len(num_cols)):
            val = corr.values[i, j]
            color = "white" if abs(val) > 0.5 else "black"
            ax.text(j, i, f"{val:.2f}", ha="center", va="center", fontsize=7, color=color)
    fig.colorbar(im, ax=ax, shrink=0.8)
    ax.set_title(title, fontsize=11, fontweight="bold", color="#0F172A", pad=12)
    fig.tight_layout()
    return _chart_to_image(fig, width_cm=15)


# ── Analysis Engines ───────────────────────────────────────────────

def _dataset_profile(df) -> dict:
    return {
        "rows": len(df),
        "cols": len(df.columns),
        "numeric": _numeric(df),
        "categorical": _categorical(df),
        "dates": _date_cols(df),
        "dtypes": {str(k): int(v) for k, v in df.dtypes.value_counts().items()},
    }


def _data_quality(df) -> dict:
    total_cells = len(df) * len(df.columns)
    missing = int(df.isna().sum().sum())
    dups = int(df.duplicated().sum())
    missing_cols = {c: int(df[c].isna().sum()) for c in df.columns if df[c].isna().any()}
    score = max(0, round(100 - (missing / max(total_cells, 1)) * 50 - (dups / max(len(df), 1)) * 20, 1))
    return {
        "score": score,
        "missing_total": missing,
        "missing_pct": round(missing / max(total_cells, 1) * 100, 1),
        "missing_cols": missing_cols,
        "duplicates": dups,
        "dup_pct": round(dups / max(len(df), 1) * 100, 1),
    }


def _statistical_summary(df) -> list[dict]:
    rows = []
    for col in _numeric(df):
        s = df[col].dropna()
        if len(s) == 0:
            continue
        q1 = float(s.quantile(0.25))
        q3 = float(s.quantile(0.75))
        rows.append({
            "column": col,
            "count": int(len(s)),
            "mean": round(float(s.mean()), 2),
            "median": round(float(s.median()), 2),
            "std": round(float(s.std()), 2),
            "min": round(float(s.min()), 2),
            "max": round(float(s.max()), 2),
            "q1": round(q1, 2),
            "q3": round(q3, 2),
            "iqr": round(q3 - q1, 2),
            "skew": "Right" if s.mean() > s.median() * 1.1 else "Left" if s.median() > s.mean() * 1.1 else "Normal",
        })
    return rows


def _detect_outliers(df) -> list[dict]:
    outliers = []
    for col in _numeric(df):
        s = df[col].dropna()
        if len(s) < 10:
            continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        upper = q3 + 1.5 * iqr
        mask = s > upper
        count = int(mask.sum())
        if count > 0:
            max_val = float(s.max())
            mean_val = float(s.mean())
            severity = "Critical" if max_val > upper + 2 * iqr else "High" if max_val > upper + iqr else "Moderate"
            outliers.append({
                "column": col,
                "count": count,
                "pct": round(count / len(s) * 100, 1),
                "max_value": round(max_val, 2),
                "expected_upper": round(float(upper), 2),
                "ratio": round(max_val / mean_val, 1) if mean_val > 0 else 0,
                "severity": severity,
            })
    outliers.sort(key=lambda x: x["count"], reverse=True)
    return outliers[:8]


def _correlation_analysis(df) -> list[dict]:
    num = _numeric(df)
    if len(num) < 2:
        return []
    corr = df[num].corr()
    pairs = []
    seen = set()
    for i, a in enumerate(num):
        for b in num[i + 1:]:
            pair = tuple(sorted([a, b]))
            if pair in seen:
                continue
            seen.add(pair)
            r = float(corr.loc[a, b])
            if math.isnan(r):
                continue
            if abs(r) >= 0.3:
                strength = "Strong" if abs(r) > 0.7 else "Moderate"
                direction = "Positive" if r > 0 else "Negative"
                pairs.append({
                    "col_a": a, "col_b": b,
                    "r": round(r, 3),
                    "strength": strength,
                    "direction": direction,
                    "narrative": (
                        f"{_label(a)} and {_label(b)} show a {strength.lower()} {direction.lower()} "
                        f"correlation (r={r:.2f}). "
                        + (f"As {_label(a)} increases, {_label(b)} tends to {'increase' if r > 0 else 'decrease'}."
                           if abs(r) > 0.5 else "")
                    ),
                })
    pairs.sort(key=lambda x: abs(x["r"]), reverse=True)
    return pairs[:10]


# ── AI Insight Generation ──────────────────────────────────────────

def _generate_insights(df, stats, outliers, correlations) -> list[str]:
    insights = []
    num = _numeric(df)
    cat = _categorical(df)
    rev = _rev_col(df)

    # Category concentration
    if cat and rev:
        top = df.groupby(cat[0])[rev].sum().sort_values(ascending=False)
        total = top.sum()
        if len(top) >= 1 and total > 0:
            pct = top.iloc[0] / total * 100
            insights.append(
                f'"{top.index[0]}" is the dominant {_label(cat[0])}, contributing {pct:.1f}% '
                f"of total {_label(rev)} ({_fmt(top.iloc[0])}). "
                f"This concentration level {'represents significant exposure' if pct > 30 else 'is within normal range'}."
            )
        if len(top) >= 2 and top.iloc[-1] > 0:
            ratio = top.iloc[0] / top.iloc[-1]
            if ratio >= 3:
                insights.append(
                    f'Performance gap: "{top.index[0]}" generates {ratio:.1f}x more {_label(rev)} '
                    f'than "{top.index[-1]}", indicating significant disparity across segments.'
                )

    # Distribution skewness
    for s in stats[:3]:
        if s["skew"] != "Normal" and s["std"] > 0:
            cv = s["std"] / s["mean"] * 100 if s["mean"] > 0 else 0
            if cv > 50:
                insights.append(
                    f'{_label(s["column"])} has high variance (CV={cv:.0f}%) with a {s["skew"].lower()}-skewed '
                    f"distribution (mean {_fmt(s['mean'])} vs median {_fmt(s['median'])}), "
                    f"suggesting a small subset drives disproportionate volume."
                )
                break

    # Outlier insight
    if outliers:
        worst = outliers[0]
        insights.append(
            f'{worst["count"]} outliers detected in {_label(worst["column"])} '
            f"(max value {_fmt(worst['max_value'])} is {worst['ratio']}x the average). "
            f'Severity: {worst["severity"]}. These may indicate data quality issues or exceptional cases requiring review.'
        )

    # Correlation insights
    strong = [c for c in correlations if c["strength"] == "Strong"]
    if strong:
        c = strong[0]
        insights.append(c["narrative"])

    # Trend detection
    dates = _date_cols(df)
    if dates and rev:
        tmp = df[[dates[0], rev]].dropna().sort_values(dates[0])
        if len(tmp) > 10:
            tmp["_p"] = tmp[dates[0]].dt.to_period("M").astype(str)
            monthly = tmp.groupby("_p")[rev].sum()
            if len(monthly) >= 2:
                first_half = monthly.iloc[:len(monthly) // 2].mean()
                second_half = monthly.iloc[len(monthly) // 2:].mean()
                if first_half > 0:
                    growth = (second_half - first_half) / first_half * 100
                    direction = "upward" if growth > 0 else "downward"
                    severity = "significant" if abs(growth) > 20 else "moderate" if abs(growth) > 10 else "slight"
                    insights.append(
                        f"{_label(rev)} shows a {severity} {direction} trend ({growth:+.1f}% change), "
                        f"{'warranting investigation into cost drivers' if growth > 10 else 'suggesting stabilization in the metric'}."
                    )

    # Second category
    if len(cat) > 1 and rev:
        top2 = df.groupby(cat[1])[rev].sum().sort_values(ascending=False)
        if len(top2) >= 1:
            total2 = top2.sum()
            pct2 = (top2.iloc[0] / total2 * 100) if total2 > 0 else 0
            insights.append(
                f'Leading {_label(cat[1])}: "{top2.index[0]}" accounts for {pct2:.1f}% of '
                f"total {_label(rev)} ({_fmt(top2.iloc[0])})."
            )

    # Data quality note
    null_pct = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
    if null_pct > 5:
        insights.append(f"Data quality concern: {null_pct:.1f}% of values are missing, which may affect analytical accuracy.")

    return insights[:10]


def _generate_recommendations(df, insights, outliers, correlations) -> list[str]:
    recs = []
    cat = _categorical(df)
    rev = _rev_col(df)

    if cat and rev:
        top = df.groupby(cat[0])[rev].sum().sort_values(ascending=False)
        total = top.sum()
        if total > 0:
            pct = top.iloc[0] / total * 100
            if pct > 40:
                recs.append(
                    f'Concentration Risk: "{top.index[0]}" drives {pct:.0f}% of {_label(rev)}. '
                    f"Develop contingency plans and evaluate diversification strategies."
                )
            if len(top) >= 3:
                names = ", ".join(str(v) for v in top.index[:3])
                recs.append(f"Prioritize the top 3 {_label(cat[0])} segments ({names}) for maximum impact on {_label(rev)}.")

    if outliers:
        recs.append(
            f"Investigate {outliers[0]['count']} outliers in {_label(outliers[0]['column'])} "
            f"({outliers[0]['severity']} severity) — validate whether these represent data errors or legitimate exceptional cases."
        )

    strong_corr = [c for c in correlations if c["strength"] == "Strong"]
    if strong_corr:
        c = strong_corr[0]
        recs.append(
            f"Leverage the strong correlation between {_label(c['col_a'])} and {_label(c['col_b'])} "
            f"(r={c['r']:.2f}) for predictive modeling and resource allocation."
        )

    null_pct = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
    if null_pct > 3:
        recs.append(f"Address data quality: {null_pct:.1f}% missing values. Implement validation rules at the point of data entry.")

    recs.append("Establish automated monitoring dashboards to track KPI movements and detect anomalies in real-time.")
    recs.append("Conduct quarterly deep-dive reviews of segment performance to identify emerging trends and reallocation opportunities.")

    return recs[:8]


def _generate_summary(df, profile, quality, stats, outliers, correlations, insights) -> str:
    rev = _rev_col(df)
    cat = _categorical(df)
    parts = []

    parts.append(
        f"This report analyzes {profile['rows']:,} records across {profile['cols']} dimensions, "
        f"including {len(profile['numeric'])} numeric metrics and {len(profile['categorical'])} categorical segments. "
    )

    parts.append(f"The overall data quality score is {quality['score']}/100")
    if quality["missing_total"] > 0:
        parts.append(f" with {quality['missing_total']:,} missing values ({quality['missing_pct']}%)")
    if quality["duplicates"] > 0:
        parts.append(f" and {quality['duplicates']:,} duplicate records")
    parts.append(". ")

    if insights:
        parts.append(insights[0] + " ")

    if outliers:
        total_outliers = sum(o["count"] for o in outliers)
        parts.append(f"{total_outliers} statistical outliers were identified across {len(outliers)} variables. ")

    strong_corr = [c for c in correlations if c["strength"] == "Strong"]
    if strong_corr:
        parts.append(
            f"Notable correlation detected between {_label(strong_corr[0]['col_a'])} and "
            f"{_label(strong_corr[0]['col_b'])} (r={strong_corr[0]['r']:.2f}). "
        )

    parts.append(
        "The following sections provide detailed statistical analysis, outlier investigation, "
        "correlation mapping, intelligent visualizations, and strategic recommendations."
    )

    return "".join(parts)


# ── Intelligent Chart Selection ────────────────────────────────────

def _smart_charts(df, stats, outliers, correlations) -> list[tuple]:
    """Returns (image, narrative) tuples. Avoids duplicates."""
    charts = []
    num = _numeric(df)
    cat = _categorical(df)
    dates = _date_cols(df)
    rev = _rev_col(df)
    used_combos = set()

    def _add(img, narrative, combo_key):
        if img and combo_key not in used_combos:
            charts.append((img, narrative))
            used_combos.add(combo_key)

    # 1. Category breakdown (bar) — primary metric by primary dimension
    if cat and rev:
        grp = df.groupby(cat[0])[rev].sum().sort_values(ascending=False)
        total = grp.sum()
        top_pct = (grp.iloc[0] / total * 100) if total > 0 else 0
        img = _bar_chart(df, cat[0], rev, f"{_label(rev)} by {_label(cat[0])}")
        narrative = (
            f"The bar chart reveals that {grp.index[0]} leads in {_label(rev)}, "
            f"accounting for {top_pct:.0f}% of the total. "
            f"{'A steep drop-off after the top segment indicates high concentration.' if top_pct > 25 else 'Distribution is relatively balanced across segments.'}"
        )
        _add(img, narrative, f"bar_{cat[0]}_{rev}")

    # 2. Pie chart — only if few categories
    if cat and rev and df[cat[0]].nunique() <= 6:
        img = _pie_chart(df, cat[0], rev, f"{_label(rev)} Share by {_label(cat[0])}")
        narrative = f"The composition chart illustrates how {_label(rev)} is distributed across {_label(cat[0])} segments."
        _add(img, narrative, f"pie_{cat[0]}_{rev}")

    # 3. Trend line
    if dates and rev:
        img = _line_chart(df, dates[0], rev, f"{_label(rev)} Trend Over Time")
        narrative = f"The trend line tracks {_label(rev)} over time, enabling identification of growth patterns and seasonal effects."
        _add(img, narrative, f"line_{dates[0]}_{rev}")

    # 4. Distribution histogram for primary metric
    if rev:
        img = _histogram_chart(df, rev, f"{_label(rev)} Distribution")
        narrative = (
            f"The histogram shows the frequency distribution of {_label(rev)}. "
            f"Red and green lines mark the mean and median respectively — "
            f"{'divergence indicates skew.' if abs(df[rev].mean() - df[rev].median()) / max(df[rev].mean(), 1) > 0.15 else 'alignment suggests a balanced distribution.'}"
        )
        _add(img, narrative, f"hist_{rev}")

    # 5. Box plot for key numeric columns
    box_cols = num[:4]
    if len(box_cols) >= 2:
        img = _box_chart(df, box_cols, "Numeric Distribution & Outlier Overview")
        narrative = "Box plots summarize the central tendency and spread of key metrics, highlighting outliers beyond the interquartile range."
        _add(img, narrative, "boxplot")

    # 6. Correlation heatmap
    if len(num) >= 3:
        heatmap_cols = num[:8]
        img = _corr_heatmap(df, heatmap_cols, "Correlation Matrix")
        narrative = "The heatmap reveals pairwise correlations between numeric variables. Dark blue/red cells indicate strong relationships worth further investigation."
        _add(img, narrative, "corr_heatmap")

    # 7. Scatter plot for strongest correlation
    if correlations:
        c = correlations[0]
        img = _scatter_chart(df, c["col_a"], c["col_b"],
                             f"{_label(c['col_a'])} vs {_label(c['col_b'])} (r={c['r']:.2f})")
        narrative = c["narrative"]
        _add(img, narrative, f"scatter_{c['col_a']}_{c['col_b']}")

    # 8. Second category
    if len(cat) > 1 and rev:
        img = _horizontal_bar(df, cat[1], rev, f"Top {_label(cat[1])} by {_label(rev)}")
        narrative = f"Horizontal bar chart ranks {_label(cat[1])} segments by {_label(rev)} to identify leading and lagging performers."
        _add(img, narrative, f"hbar_{cat[1]}_{rev}")

    return charts[:10]


# ── PDF Builder ─────────────────────────────────────────────────────

def _page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor(MUTED))
    canvas.drawCentredString(
        doc.pagesize[0] / 2, 1.2 * cm,
        f"DataQuery AI  |  Generated {datetime.now().strftime('%B %d, %Y %I:%M %p')}  |  Page {canvas.getPageNumber()}"
    )
    canvas.restoreState()


def generate_report_pdf(df: pd.DataFrame, dataset_name: str = "Dataset") -> bytes:
    df = _coerce_dates(df.copy())
    styles = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2.2 * cm,
    )
    elements = []
    page_w = A4[0] - 4 * cm

    # Run full analytical pipeline
    profile = _dataset_profile(df)
    quality = _data_quality(df)
    stats = _statistical_summary(df)
    outliers_data = _detect_outliers(df)
    correlations = _correlation_analysis(df)
    insights = _generate_insights(df, stats, outliers_data, correlations)
    recommendations = _generate_recommendations(df, insights, outliers_data, correlations)
    summary = _generate_summary(df, profile, quality, stats, outliers_data, correlations, insights)
    chart_pairs = _smart_charts(df, stats, outliers_data, correlations)

    # ──── Page 1: Cover ────────────────────────────────────────────
    elements.append(Spacer(1, 5 * cm))
    cover_content = []
    cover_content.append(Spacer(1, 2 * cm))
    cover_content.append(Paragraph("AI BUSINESS INTELLIGENCE REPORT", styles["Cover_Title"]))
    cover_content.append(Spacer(1, 0.5 * cm))
    clean_name = dataset_name.rsplit(".", 1)[0] if "." in dataset_name else dataset_name
    cover_content.append(Paragraph(clean_name.upper(), styles["Cover_Sub"]))
    cover_content.append(Spacer(1, 1 * cm))
    cover_content.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", styles["Cover_Sub"]))
    cover_content.append(Spacer(1, 0.5 * cm))
    cover_content.append(Paragraph(
        f"{len(df):,} Records  |  {len(df.columns)} Dimensions  |  Data Quality: {quality['score']}/100",
        styles["Cover_Sub"],
    ))
    elements.extend(cover_content)
    elements.append(PageBreak())

    # ──── Executive Summary ────────────────────────────────────────
    elements.append(Paragraph("1. Executive Summary", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph(summary, styles["Body"]))
    elements.append(Spacer(1, 8 * mm))

    # KPI Cards
    kpis = _generate_kpis(df)
    if kpis:
        elements.append(Paragraph("Key Performance Indicators", styles["Sub_H"]))
        elements.append(Spacer(1, 3 * mm))
        kpi_rows = []
        kpi_row = []
        for i, kpi in enumerate(kpis):
            cell = [
                Paragraph(kpi["label"], styles["KpiLabel"]),
                Spacer(1, 2 * mm),
                Paragraph(kpi["value"], styles["KpiValue"]),
                Spacer(1, 1 * mm),
                Paragraph(kpi.get("desc", ""), ParagraphStyle("kd", parent=styles["KpiLabel"], fontSize=7)),
            ]
            kpi_row.append(cell)
            if len(kpi_row) == 4 or i == len(kpis) - 1:
                while len(kpi_row) < 4:
                    kpi_row.append("")
                kpi_rows.append(kpi_row)
                kpi_row = []
        col_w = page_w / 4
        kt = Table(kpi_rows, colWidths=[col_w] * 4, rowHeights=[2.8 * cm] * len(kpi_rows))
        kt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(LIGHT_BG)),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(kt)

    elements.append(PageBreak())

    # ──── Dataset Profile ──────────────────────────────────────────
    elements.append(Paragraph("2. Dataset Profile", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))
    profile_text = (
        f"The dataset contains {profile['rows']:,} records and {profile['cols']} columns. "
        f"Of these, {len(profile['numeric'])} are numeric metrics, "
        f"{len(profile['categorical'])} are categorical dimensions, "
        f"and {len(profile['dates'])} are temporal fields."
    )
    elements.append(Paragraph(profile_text, styles["Body"]))
    elements.append(Spacer(1, 6 * mm))

    # ──── Data Quality Assessment ──────────────────────────────────
    elements.append(Paragraph("3. Data Quality Assessment", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))
    q_color = SUCCESS if quality["score"] >= 80 else "#D97706" if quality["score"] >= 60 else DANGER
    q_text = (
        f'Data Quality Score: <font color="{q_color}"><b>{quality["score"]}/100</b></font>. '
        f'{quality["missing_total"]:,} missing values ({quality["missing_pct"]}% of all cells)'
    )
    if quality["duplicates"] > 0:
        q_text += f' and {quality["duplicates"]:,} duplicate rows ({quality["dup_pct"]}%)'
    q_text += "."
    elements.append(Paragraph(q_text, styles["Body"]))

    if quality["missing_cols"]:
        elements.append(Spacer(1, 3 * mm))
        elements.append(Paragraph("Missing Values by Column:", styles["Sub_H"]))
        for col, cnt in sorted(quality["missing_cols"].items(), key=lambda x: x[1], reverse=True)[:6]:
            pct = round(cnt / len(df) * 100, 1)
            elements.append(Paragraph(f"<b>{_label(col)}</b>: {cnt:,} missing ({pct}%)", styles["Insight"]))

    elements.append(PageBreak())

    # ──── Statistical Analysis ─────────────────────────────────────
    if stats:
        elements.append(Paragraph("4. Statistical Analysis", styles["Section_H"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
        elements.append(Spacer(1, 4 * mm))

        header = ["Metric", "Count", "Mean", "Median", "Std Dev", "Min", "Max", "Skew"]
        body = []
        for s in stats[:8]:
            body.append([
                _label(s["column"])[:16], f'{s["count"]:,}', _fmt(s["mean"]), _fmt(s["median"]),
                _fmt(s["std"]), _fmt(s["min"]), _fmt(s["max"]), s["skew"],
            ])
        t_data = [header] + body
        col_widths = [page_w * w for w in [0.18, 0.1, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]]
        st = Table(t_data, colWidths=col_widths, repeatRows=1)
        st.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(ACCENT)),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(st)
        elements.append(PageBreak())

    # ──── Outlier Analysis ─────────────────────────────────────────
    if outliers_data:
        elements.append(Paragraph("5. Outlier Detection", styles["Section_H"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
        elements.append(Spacer(1, 4 * mm))
        elements.append(Paragraph(
            f"{sum(o['count'] for o in outliers_data)} outliers detected across {len(outliers_data)} "
            f"variables using the IQR method (1.5x interquartile range).",
            styles["Body"],
        ))
        elements.append(Spacer(1, 3 * mm))

        for o in outliers_data[:5]:
            sev_color = DANGER if o["severity"] == "Critical" else "#D97706" if o["severity"] == "High" else MUTED
            elements.append(Paragraph(
                f'<font color="{sev_color}"><b>[{o["severity"]}]</b></font> '
                f'<b>{_label(o["column"])}</b>: {o["count"]} outliers ({o["pct"]}%). '
                f'Max value {_fmt(o["max_value"])} is {o["ratio"]}x the mean '
                f'(expected upper bound: {_fmt(o["expected_upper"])}).',
                styles["Insight"],
            ))
            elements.append(Spacer(1, 2 * mm))

        elements.append(PageBreak())

    # ──── Correlation Analysis ─────────────────────────────────────
    if correlations:
        elements.append(Paragraph("6. Correlation & Relationship Analysis", styles["Section_H"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
        elements.append(Spacer(1, 4 * mm))

        for c in correlations[:6]:
            strength_color = ACCENT if c["strength"] == "Strong" else MUTED
            elements.append(Paragraph(
                f'<font color="{strength_color}"><b>[{c["strength"]} {c["direction"]}]</b></font> '
                f'{_label(c["col_a"])} vs {_label(c["col_b"])} (r={c["r"]:.2f})',
                styles["Insight"],
            ))
            if c.get("narrative"):
                elements.append(Paragraph(c["narrative"], styles["Body"]))
            elements.append(Spacer(1, 3 * mm))

        elements.append(PageBreak())

    # ──── Visualizations (with narratives) ─────────────────────────
    if chart_pairs:
        elements.append(Paragraph("7. Key Visualizations", styles["Section_H"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
        elements.append(Spacer(1, 4 * mm))

        for i, (chart_img, narrative) in enumerate(chart_pairs):
            elements.append(chart_img)
            if narrative:
                elements.append(Paragraph(narrative, styles["ChartNarrative"]))
            elements.append(Spacer(1, 4 * mm))
            if (i + 1) % 2 == 0 and i < len(chart_pairs) - 1:
                elements.append(PageBreak())
                elements.append(Paragraph("7. Key Visualizations (continued)", styles["Section_H"]))
                elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
                elements.append(Spacer(1, 4 * mm))

        elements.append(PageBreak())

    # ──── AI Insights ──────────────────────────────────────────────
    elements.append(Paragraph("8. AI-Generated Insights", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))

    for idx, ins in enumerate(insights, 1):
        elements.append(Paragraph(f'<b>{idx}.</b>  {ins}', styles["Insight"]))
        elements.append(Spacer(1, 3 * mm))

    if not insights:
        elements.append(Paragraph("No significant findings detected in the current dataset.", styles["Body"]))

    elements.append(PageBreak())

    # ──── Recommendations ──────────────────────────────────────────
    elements.append(Paragraph("9. Strategic Recommendations", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))

    for idx, rec in enumerate(recommendations, 1):
        rec_data = [[
            Paragraph(f'<font color="{ACCENT}"><b>{idx}</b></font>',
                      ParagraphStyle("ri", alignment=TA_CENTER, fontSize=11, fontName="Helvetica-Bold")),
            Paragraph(rec, styles["Body"]),
        ]]
        rt = Table(rec_data, colWidths=[1.2 * cm, page_w - 1.5 * cm])
        rt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EFF6FF")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(rt)
        elements.append(Spacer(1, 3 * mm))

    # ──── Appendix ─────────────────────────────────────────────────
    elements.append(PageBreak())
    elements.append(Paragraph("10. Appendix: Data Sample", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))
    elements.append(Paragraph(
        f"Showing first {min(30, len(df))} of {len(df):,} records (max 10 columns).",
        styles["Body"],
    ))
    elements.append(Spacer(1, 3 * mm))

    show_cols = list(df.columns)[:10]
    sample = df[show_cols].head(30).fillna("")
    header = [str(c)[:20] for c in show_cols]
    body = [[str(v)[:25] for v in row] for row in sample.values.tolist()]
    table_data = [header] + body
    col_w = min(page_w / max(len(show_cols), 1), 4 * cm)
    t = Table(table_data, repeatRows=1, colWidths=[col_w] * len(show_cols))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(ACCENT)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(LIGHT_BG)]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    elements.append(t)

    # ──── Build ────────────────────────────────────────────────────
    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return buf.getvalue()


# ── KPI generation (kept for backward compat) ──────────────────────

def _generate_kpis(df) -> list[dict]:
    kpis = []
    num = _numeric(df)

    for col in num[:6]:
        total = df[col].sum()
        avg = df[col].mean()
        nl = col.lower()
        is_monetary = any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "cost", "profit", "paid", "spend"))
        if is_monetary:
            kpis.append({"label": f"Total {_label(col)}", "value": _fmt(total), "desc": f"Sum across {len(df):,} records"})
            kpis.append({"label": f"Avg {_label(col)}", "value": _fmt(avg), "desc": "Average per record"})
        else:
            kpis.append({"label": f"Total {_label(col)}", "value": _fmt(total), "desc": "Aggregate total"})

    kpis.insert(0, {"label": "Total Records", "value": f"{len(df):,}", "desc": "Rows in dataset"})

    cat = _categorical(df)
    if cat:
        kpis.append({"label": f"Unique {_label(cat[0])}", "value": f"{df[cat[0]].nunique():,}", "desc": "Distinct values"})

    return kpis[:8]
