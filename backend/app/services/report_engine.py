"""
AI Business Intelligence Report Generator.

Produces executive-quality PDF reports with:
- Cover page
- Executive summary
- KPI overview
- Auto-generated charts (matplotlib → embedded images)
- Key findings & insights
- Recommendations
- Optional appendix (max 50 rows)

NEVER dumps raw data. The output resembles a Power BI / McKinsey report.
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
        if abs(v) >= 1_000_000_000:
            return f"{v / 1_000_000_000:,.2f}B"
        if abs(v) >= 1_000_000:
            return f"{v / 1_000_000:,.1f}M"
        if abs(v) >= 1_000:
            return f"{v / 1_000:,.1f}K"
        return f"{v:,}"
    return str(v)


def _numeric(df):
    return df.select_dtypes(include=[np.number]).columns.tolist()

def _categorical(df):
    exc = set(_numeric(df) + _date_cols(df))
    return [c for c in df.columns if c not in exc and df[c].nunique() <= 200]

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


# ── Chart generation (matplotlib → bytes) ──────────────────────────

def _chart_to_image(fig, width_cm=16, dpi=150) -> Image:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight",
                facecolor="#FFFFFF", edgecolor="none")
    plt.close(fig)
    buf.seek(0)
    w = width_cm * cm
    img = Image(buf, width=w, height=w * 0.55)
    return img


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
    bars = ax.bar(range(len(grp)), grp.values, color=CHART_COLORS[:len(grp)], width=0.6, zorder=3)
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
        t.set_fontsize(7)
        t.set_color("white")
        t.set_fontweight("bold")
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


def _area_chart(df, date_col, y, title):
    tmp = df[[date_col, y]].dropna().sort_values(date_col)
    if len(tmp) < 2:
        return None
    tmp["_period"] = tmp[date_col].dt.to_period("M").astype(str)
    agg = tmp.groupby("_period")[y].sum()
    if len(agg) < 2:
        return None
    fig, ax = plt.subplots(figsize=(8, 4.4))
    ax.fill_between(range(len(agg)), agg.values, alpha=0.2, color=ACCENT2, zorder=2)
    ax.plot(range(len(agg)), agg.values, color=ACCENT2, linewidth=2, zorder=3)
    ax.set_xticks(range(len(agg)))
    ax.set_xticklabels(list(agg.index), rotation=40, ha="right", fontsize=7)
    ax.grid(axis="y", alpha=0.15, zorder=0)
    _style_ax(ax, title)
    fig.tight_layout()
    return _chart_to_image(fig)


# ── Auto-generate charts based on column types ─────────────────────

def _auto_charts(df) -> list:
    charts = []
    num = _numeric(df)
    cat = _categorical(df)
    dates = _date_cols(df)

    # Revenue-like column heuristic
    rev_col = None
    for n in num:
        nl = n.lower()
        if any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "profit", "cost")):
            rev_col = n
            break
    if not rev_col and num:
        rev_col = num[0]

    # 1. Bar chart: top category by revenue
    if cat and rev_col:
        c = _bar_chart(df, cat[0], rev_col, f"{_label(rev_col)} by {_label(cat[0])}")
        if c:
            charts.append(c)

    # 2. Pie chart: distribution
    if cat and rev_col:
        c = _pie_chart(df, cat[0], rev_col, f"{_label(rev_col)} Distribution")
        if c:
            charts.append(c)

    # 3. Line/area trend if date exists
    if dates and rev_col:
        c = _line_chart(df, dates[0], rev_col, f"{_label(rev_col)} Trend Over Time")
        if c:
            charts.append(c)
        c = _area_chart(df, dates[0], rev_col, f"Cumulative {_label(rev_col)}")
        if c:
            charts.append(c)

    # 4. Second categorical if available
    if len(cat) > 1 and rev_col:
        c = _horizontal_bar(df, cat[1], rev_col, f"Top {_label(cat[1])} by {_label(rev_col)}")
        if c:
            charts.append(c)

    # 5. Second metric if available
    if len(num) > 1 and cat:
        c = _bar_chart(df, cat[0], num[1], f"{_label(num[1])} by {_label(cat[0])}")
        if c:
            charts.append(c)

    # 6. Scatter: two numeric columns
    if len(num) >= 2:
        c = _scatter_chart(df, num[0], num[1], f"{_label(num[0])} vs {_label(num[1])}")
        if c:
            charts.append(c)

    # 7. Date trend for second metric
    if dates and len(num) > 1:
        c = _line_chart(df, dates[0], num[1], f"{_label(num[1])} Trend Over Time")
        if c:
            charts.append(c)

    # 8. Third categorical
    if len(cat) > 2 and rev_col:
        c = _pie_chart(df, cat[2], rev_col, f"{_label(rev_col)} by {_label(cat[2])}")
        if c:
            charts.append(c)

    return charts[:10]


# ── KPI generation ──────────────────────────────────────────────────

def _generate_kpis(df) -> list[dict]:
    kpis = []
    num = _numeric(df)
    cat = _categorical(df)

    for col in num[:8]:
        nl = col.lower()
        if any(w in nl for w in ("id", "index", "key", "code", "zip", "phone")):
            continue
        total = df[col].sum()
        avg = df[col].mean()
        if any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "cost", "profit")):
            kpis.append({"label": f"Total {_label(col)}", "value": _fmt(total), "desc": f"Sum across {len(df):,} records"})
            kpis.append({"label": f"Avg {_label(col)}", "value": _fmt(avg), "desc": "Average per record"})
        elif any(w in nl for w in ("quantity", "qty", "units", "count", "orders")):
            kpis.append({"label": f"Total {_label(col)}", "value": _fmt(total), "desc": f"Aggregate total"})
        else:
            kpis.append({"label": f"Total {_label(col)}", "value": _fmt(total), "desc": f"Sum of all values"})

    kpis.insert(0, {"label": "Total Records", "value": f"{len(df):,}", "desc": "Rows in dataset"})

    if cat:
        kpis.append({"label": f"Unique {_label(cat[0])}", "value": f"{df[cat[0]].nunique():,}", "desc": f"Distinct values"})

    return kpis[:8]


# ── Insight generation ──────────────────────────────────────────────

def _generate_insights(df) -> list[str]:
    insights = []
    num = _numeric(df)
    cat = _categorical(df)
    dates = _date_cols(df)

    rev_col = None
    for n in num:
        nl = n.lower()
        if any(w in nl for w in ("price", "revenue", "sales", "amount", "total", "profit")):
            rev_col = n
            break
    if not rev_col and num:
        rev_col = num[0]

    # Top category
    if cat and rev_col:
        top = df.groupby(cat[0])[rev_col].sum().sort_values(ascending=False)
        if len(top) >= 1:
            pct = (top.iloc[0] / top.sum() * 100) if top.sum() > 0 else 0
            insights.append(f'The top {_label(cat[0])} is "{top.index[0]}" contributing {pct:.1f}% of total {_label(rev_col)} ({_fmt(top.iloc[0])}).')
        if len(top) >= 2:
            insights.append(f'The bottom performer is "{top.index[-1]}" with only {_fmt(top.iloc[-1])} in {_label(rev_col)}.')

    # Average vs median
    if rev_col:
        avg = df[rev_col].mean()
        med = df[rev_col].median()
        if avg > 0 and abs(avg - med) / avg > 0.2:
            direction = "right-skewed (mean > median)" if avg > med else "left-skewed (median > mean)"
            insights.append(f"The {_label(rev_col)} distribution is {direction}, indicating uneven distribution.")

    # Date trend
    if dates and rev_col:
        tmp = df[[dates[0], rev_col]].dropna().sort_values(dates[0])
        if len(tmp) > 10:
            tmp["_p"] = tmp[dates[0]].dt.to_period("M").astype(str)
            monthly = tmp.groupby("_p")[rev_col].sum()
            if len(monthly) >= 2:
                first_half = monthly.iloc[:len(monthly)//2].mean()
                second_half = monthly.iloc[len(monthly)//2:].mean()
                if first_half > 0:
                    growth = (second_half - first_half) / first_half * 100
                    direction = "upward" if growth > 0 else "downward"
                    insights.append(f"{_label(rev_col)} shows a {direction} trend ({growth:+.1f}% change between first and second half of the period).")

    # Second categorical
    if len(cat) > 1 and rev_col:
        top2 = df.groupby(cat[1])[rev_col].sum().sort_values(ascending=False)
        if len(top2) >= 1:
            insights.append(f'Leading {_label(cat[1])}: "{top2.index[0]}" with {_fmt(top2.iloc[0])} in {_label(rev_col)}.')

    # Quantity insight
    for n in num:
        if any(w in n.lower() for w in ("quantity", "qty", "units")):
            avg_qty = df[n].mean()
            insights.append(f"Average {_label(n)} per transaction: {avg_qty:.1f}.")
            break

    # Null data warning
    null_pct = (df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
    if null_pct > 5:
        insights.append(f"Data quality note: {null_pct:.1f}% of values are missing across the dataset.")

    return insights[:8]


def _generate_recommendations(df, insights: list[str]) -> list[str]:
    recs = []
    num = _numeric(df)
    cat = _categorical(df)

    rev_col = None
    for n in num:
        if any(w in n.lower() for w in ("price", "revenue", "sales", "amount", "total", "profit")):
            rev_col = n
            break

    if cat and rev_col:
        top = df.groupby(cat[0])[rev_col].sum().sort_values(ascending=False)
        if len(top) >= 3:
            recs.append(f"Focus on top-performing {_label(cat[0])}s ({', '.join(str(v) for v in top.index[:3])}) to maximize revenue.")
            recs.append(f"Investigate underperforming {_label(cat[0])}s and consider targeted promotions or discontinuation.")

    if len(cat) > 1 and rev_col:
        recs.append(f"Analyze {_label(cat[1])} segments further to identify cross-selling opportunities.")

    for n in num:
        if any(w in n.lower() for w in ("quantity", "qty", "units")):
            recs.append("Increase inventory for high-demand products to avoid stockouts.")
            break

    recs.append("Implement real-time dashboards to monitor KPIs and detect anomalies early.")
    recs.append("Schedule periodic reviews of underperforming segments to reallocate resources.")
    recs.append("Focus marketing spend on peak periods identified in the trend analysis.")

    return recs[:8]


def _generate_summary(df, kpis: list[dict], insights: list[str]) -> str:
    num = _numeric(df)
    cat = _categorical(df)
    dates = _date_cols(df)

    parts = [
        f"This executive report presents an analysis of {len(df):,} records "
        f"across {len(df.columns)} data dimensions. "
    ]

    if num:
        top_metrics = ", ".join(_label(c) for c in num[:4])
        parts.append(f"Key metrics analyzed include {top_metrics}. ")

    if kpis:
        parts.append(f"The dataset reveals {kpis[0]['value']} total records with ")
        metric_summaries = [f"{k['label']}: {k['value']}" for k in kpis[1:4]]
        if metric_summaries:
            parts.append(", ".join(metric_summaries) + ". ")

    if insights:
        parts.append(insights[0] + " ")

    if dates:
        parts.append(f"Time-series data spans from {df[dates[0]].min()} to {df[dates[0]].max()}, enabling trend analysis. ")

    if cat:
        parts.append(f"The data is segmented across {len(cat)} categorical dimensions including {', '.join(_label(c) for c in cat[:3])}. ")

    parts.append(
        "The following pages detail KPI performance, visual analytics, "
        "key findings, and strategic recommendations for stakeholders."
    )

    return "".join(parts)


def _label(col: str) -> str:
    return col.replace("_", " ").replace("-", " ").title()


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

    # ──── Page 1: Cover ────────────────────────────────────────────
    elements.append(Spacer(1, 5 * cm))

    cover_data = [[""]]
    cover_table = Table(cover_data, colWidths=[page_w], rowHeights=[12 * cm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(BRAND)),
        ("ROUNDEDCORNERS", [12, 12, 12, 12]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    cover_content = []
    cover_content.append(Spacer(1, 2 * cm))
    cover_content.append(Paragraph("AI EXECUTIVE REPORT", styles["Cover_Title"]))
    cover_content.append(Spacer(1, 0.5 * cm))
    clean_name = dataset_name.rsplit(".", 1)[0] if "." in dataset_name else dataset_name
    cover_content.append(Paragraph(clean_name.upper(), styles["Cover_Sub"]))
    cover_content.append(Spacer(1, 1 * cm))
    cover_content.append(Paragraph(
        f"Generated on {datetime.now().strftime('%B %d, %Y')}",
        styles["Cover_Sub"],
    ))
    cover_content.append(Spacer(1, 0.5 * cm))
    cover_content.append(Paragraph(
        f"{len(df):,} Records  |  {len(df.columns)} Dimensions  |  AI-Powered Analysis",
        styles["Cover_Sub"],
    ))

    elements.extend(cover_content)
    elements.append(PageBreak())

    # ──── Page 2: Executive Summary ────────────────────────────────
    kpis = _generate_kpis(df)
    insights = _generate_insights(df)
    summary = _generate_summary(df, kpis, insights)
    recommendations = _generate_recommendations(df, insights)

    elements.append(Paragraph("Executive Summary", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph(summary, styles["Body"]))
    elements.append(Spacer(1, 8 * mm))

    # ──── KPI Cards (as a table) ────────────────────────────────────
    elements.append(Paragraph("Key Performance Indicators", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))

    kpi_rows = []
    kpi_row = []
    for i, kpi in enumerate(kpis):
        cell_content = [
            Paragraph(kpi["label"], styles["KpiLabel"]),
            Spacer(1, 2 * mm),
            Paragraph(kpi["value"], styles["KpiValue"]),
            Spacer(1, 1 * mm),
            Paragraph(kpi.get("desc", ""), ParagraphStyle("kd", parent=styles["KpiLabel"], fontSize=7)),
        ]
        kpi_row.append(cell_content)
        if len(kpi_row) == 4 or i == len(kpis) - 1:
            while len(kpi_row) < 4:
                kpi_row.append("")
            kpi_rows.append(kpi_row)
            kpi_row = []

    if kpi_rows:
        col_w = page_w / 4
        kpi_table = Table(kpi_rows, colWidths=[col_w] * 4, rowHeights=[2.8 * cm] * len(kpi_rows))
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(LIGHT_BG)),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(kpi_table)

    elements.append(PageBreak())

    # ──── Pages 3-6: Visual Analytics ──────────────────────────────
    charts = _auto_charts(df)

    if charts:
        elements.append(Paragraph("Visual Analytics", styles["Section_H"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
        elements.append(Spacer(1, 4 * mm))

        for i, chart_img in enumerate(charts):
            elements.append(chart_img)
            elements.append(Spacer(1, 6 * mm))
            if (i + 1) % 2 == 0 and i < len(charts) - 1:
                elements.append(PageBreak())
                elements.append(Paragraph("Visual Analytics (continued)", styles["Section_H"]))
                elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
                elements.append(Spacer(1, 4 * mm))

        elements.append(PageBreak())

    # ──── Key Findings ─────────────────────────────────────────────
    elements.append(Paragraph("Key Findings", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))

    for idx, ins in enumerate(insights, 1):
        elements.append(Paragraph(
            f'<b>{idx}.</b>  {ins}',
            styles["Insight"],
        ))
        elements.append(Spacer(1, 3 * mm))

    if not insights:
        elements.append(Paragraph("No significant findings detected in the current dataset.", styles["Body"]))

    elements.append(PageBreak())

    # ──── Recommendations ──────────────────────────────────────────
    elements.append(Paragraph("Recommendations", styles["Section_H"]))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0")))
    elements.append(Spacer(1, 4 * mm))

    for idx, rec in enumerate(recommendations, 1):
        rec_data = [[
            Paragraph(f'<font color="{ACCENT}"><b>{idx}</b></font>', ParagraphStyle("ri", alignment=TA_CENTER, fontSize=11, fontName="Helvetica-Bold")),
            Paragraph(rec, styles["Body"]),
        ]]
        rec_table = Table(rec_data, colWidths=[1.2 * cm, page_w - 1.5 * cm])
        rec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EFF6FF")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(rec_table)
        elements.append(Spacer(1, 3 * mm))

    # ──── Appendix (limited data sample) ───────────────────────────
    elements.append(PageBreak())
    elements.append(Paragraph("Appendix: Data Sample", styles["Section_H"]))
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
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    # ──── Build ────────────────────────────────────────────────────
    doc.build(elements, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return buf.getvalue()
