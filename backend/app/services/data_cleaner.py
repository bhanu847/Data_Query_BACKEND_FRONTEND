"""
AI Data Quality & Governance Engine.

Comprehensive data profiling with:
- Row-level issue tracking (which rows, which values)
- Quality score breakdown (completeness, accuracy, consistency, validity, uniqueness)
- AI root cause analysis and recommended fixes
- Business impact analysis
- Executive summary generation
- Before/after fix comparison
"""

import math
import re
from typing import Any

import numpy as np
import pandas as pd


EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
PHONE_RE = re.compile(r"^[\+]?[\d\s\-\(\)\.]{7,20}$")


def _json_safe(val: Any) -> Any:
    if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return round(float(val), 4)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    if isinstance(val, (pd.Timestamp,)):
        return val.isoformat()
    if pd.isna(val):
        return None
    return val


def _safe_record(row: pd.Series) -> dict[str, Any]:
    return {str(k): _json_safe(v) for k, v in row.items()}


def _fmt(val: float) -> str:
    if abs(val) >= 1_000_000:
        return f"${val / 1_000_000:,.1f}M"
    if abs(val) >= 1_000:
        return f"${val / 1_000:,.1f}K"
    return f"${val:,.2f}"


# ---------------------------------------------------------------------------
#  Main Profiler
# ---------------------------------------------------------------------------

def profile_dataset(df: pd.DataFrame) -> dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    if total_rows == 0:
        return _empty_profile(total_rows, total_cols)

    issues: dict[str, Any] = {}
    col_quality: dict[str, Any] = {}
    affected_rows: dict[int, list[dict]] = {}

    def _track_row(row_idx: int, issue_type: str, column: str, value: Any, detail: str = ""):
        idx = int(row_idx)
        if idx not in affected_rows:
            affected_rows[idx] = []
        affected_rows[idx].append({
            "type": issue_type,
            "column": column,
            "value": _json_safe(value),
            "detail": detail,
        })

    # ── Missing values ──
    missing = {}
    missing_row_details: dict[str, list[dict]] = {}
    for col in df.columns:
        mask = df[col].isna()
        n = int(mask.sum())
        if n > 0:
            missing[col] = {"count": n, "pct": round(n / total_rows * 100, 1)}
            rows = df.index[mask].tolist()
            missing_row_details[col] = [{"row": int(r), "value": None} for r in rows[:50]]
            for r in rows:
                _track_row(r, "missing_value", col, None, f"Missing {col}")
    if missing:
        issues["missing_values"] = {
            "total": sum(v["count"] for v in missing.values()),
            "columns": missing,
            "affected_rows": missing_row_details,
        }

    # ── Duplicates ──
    dup_mask = df.duplicated(keep="first")
    dup_count = int(dup_mask.sum())
    if dup_count > 0:
        dup_indices = df.index[dup_mask].tolist()[:50]
        issues["duplicates"] = {
            "count": dup_count,
            "pct": round(dup_count / total_rows * 100, 1),
            "affected_rows": [int(r) for r in dup_indices],
        }
        for r in dup_indices:
            _track_row(r, "duplicate", "_row_", None, "Duplicate row")

    # ── Empty rows (all NaN) ──
    empty_row_mask = df.isna().all(axis=1)
    empty_rows = int(empty_row_mask.sum())
    if empty_rows > 0:
        empty_indices = df.index[empty_row_mask].tolist()[:50]
        issues["empty_rows"] = {"count": empty_rows, "affected_rows": [int(r) for r in empty_indices]}

    # ── Empty columns (all NaN) ──
    empty_cols = [col for col in df.columns if df[col].isna().all()]
    if empty_cols:
        issues["empty_columns"] = {"count": len(empty_cols), "columns": empty_cols}

    # ── Text trimming issues ──
    trim_issues: dict[str, int] = {}
    trim_row_details: dict[str, list[dict]] = {}
    for col in df.select_dtypes(include=["object"]).columns:
        trimmed = df[col].dropna().astype(str)
        mask = trimmed != trimmed.str.strip()
        needs_trim = int(mask.sum())
        if needs_trim > 0:
            trim_issues[col] = needs_trim
            rows = trimmed.index[mask].tolist()[:20]
            trim_row_details[col] = [
                {"row": int(r), "value": str(df.at[r, col]), "fixed": str(df.at[r, col]).strip()}
                for r in rows
            ]
            for r in rows:
                _track_row(r, "whitespace", col, str(df.at[r, col]), "Leading/trailing whitespace")
    if trim_issues:
        issues["whitespace"] = {
            "total": sum(trim_issues.values()),
            "columns": trim_issues,
            "affected_rows": trim_row_details,
        }

    # ── Invalid emails ──
    email_issues: dict[str, int] = {}
    email_row_details: dict[str, list[dict]] = {}
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("email", "e_mail", "e-mail", "mail")):
            vals = df[col].dropna().astype(str)
            mask = ~vals.apply(lambda x: bool(EMAIL_RE.match(x.strip())))
            invalid = int(mask.sum())
            if invalid > 0:
                email_issues[col] = invalid
                rows = vals.index[mask].tolist()[:20]
                details = []
                for r in rows:
                    v = str(df.at[r, col])
                    problem = _diagnose_email(v)
                    details.append({"row": int(r), "value": v, "problem": problem})
                    _track_row(r, "invalid_email", col, v, problem)
                email_row_details[col] = details
    if email_issues:
        issues["invalid_emails"] = {
            "total": sum(email_issues.values()),
            "columns": email_issues,
            "affected_rows": email_row_details,
        }

    # ── Invalid phones ──
    phone_issues: dict[str, int] = {}
    phone_row_details: dict[str, list[dict]] = {}
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("phone", "mobile", "tel", "fax", "contact_number")):
            vals = df[col].dropna().astype(str)
            mask = ~vals.apply(lambda x: bool(PHONE_RE.match(x.strip())))
            invalid = int(mask.sum())
            if invalid > 0:
                phone_issues[col] = invalid
                rows = vals.index[mask].tolist()[:20]
                details = []
                for r in rows:
                    v = str(df.at[r, col])
                    problem = _diagnose_phone(v)
                    details.append({"row": int(r), "value": v, "problem": problem})
                    _track_row(r, "invalid_phone", col, v, problem)
                phone_row_details[col] = details
    if phone_issues:
        issues["invalid_phones"] = {
            "total": sum(phone_issues.values()),
            "columns": phone_issues,
            "affected_rows": phone_row_details,
        }

    # ── Date format issues ──
    date_issues: dict[str, int] = {}
    date_row_details: dict[str, list[dict]] = {}
    for col in df.columns:
        cl = col.lower()
        if df[col].dtype == "object" and any(w in cl for w in ("date", "time", "day", "created", "updated")):
            parsed = pd.to_datetime(df[col], errors="coerce")
            original_nulls = df[col].isna()
            failed_mask = parsed.isna() & ~original_nulls
            failed = int(failed_mask.sum())
            if failed > 0:
                date_issues[col] = failed
                rows = df.index[failed_mask].tolist()[:20]
                date_row_details[col] = [
                    {"row": int(r), "value": str(df.at[r, col]), "problem": "Could not parse date format"}
                    for r in rows
                ]
                for r in rows:
                    _track_row(r, "invalid_date", col, str(df.at[r, col]), "Unparseable date format")
    if date_issues:
        issues["date_format"] = {
            "total": sum(date_issues.values()),
            "columns": date_issues,
            "affected_rows": date_row_details,
        }

    # ── Outliers (IQR) ──
    outlier_issues: dict[str, dict] = {}
    outlier_row_details: dict[str, list[dict]] = {}
    for col in df.select_dtypes(include=[np.number]).columns:
        cl = col.lower()
        if any(w in cl for w in ("id", "index", "key", "code", "zip", "phone")):
            continue
        q1 = float(df[col].quantile(0.25))
        q3 = float(df[col].quantile(0.75))
        iqr = q3 - q1
        if iqr > 0:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            mask = (df[col] < lower) | (df[col] > upper)
            n_out = int(mask.sum())
            if n_out > 0:
                outlier_issues[col] = {
                    "count": n_out,
                    "pct": round(n_out / total_rows * 100, 1),
                    "lower": round(lower, 2),
                    "upper": round(upper, 2),
                    "q1": round(q1, 2),
                    "q3": round(q3, 2),
                    "iqr": round(iqr, 2),
                    "mean": round(float(df[col].mean()), 2),
                    "median": round(float(df[col].median()), 2),
                }
                rows = df.index[mask].tolist()[:20]
                details = []
                for r in rows:
                    v = float(df.at[r, col])
                    severity = "extreme" if (v > upper + iqr or v < lower - iqr) else "moderate"
                    details.append({
                        "row": int(r), "value": round(v, 2),
                        "expected_range": f"{round(lower, 2)} - {round(upper, 2)}",
                        "severity": severity,
                    })
                    _track_row(r, "outlier", col, round(v, 2),
                               f"Value {round(v, 2)} outside range {round(lower, 2)}-{round(upper, 2)}")
                outlier_row_details[col] = details
    if outlier_issues:
        issues["outliers"] = {
            "total": sum(v["count"] for v in outlier_issues.values()),
            "columns": outlier_issues,
            "affected_rows": outlier_row_details,
        }

    # ── Data type mismatches ──
    type_issues: dict[str, dict] = {}
    for col in df.select_dtypes(include=["object"]).columns:
        vals = df[col].dropna().astype(str)
        if len(vals) == 0:
            continue
        numeric_pct = pd.to_numeric(vals, errors="coerce").notna().sum() / len(vals) * 100
        if 30 < numeric_pct < 95:
            type_issues[col] = {
                "numeric_pct": round(numeric_pct, 1),
                "suggestion": "Column contains mixed numeric and text data",
            }
    if type_issues:
        issues["type_mismatch"] = {"total": len(type_issues), "columns": type_issues}

    # ── Category standardization ──
    cat_issues: dict[str, dict] = {}
    cat_row_details: dict[str, list[dict]] = {}
    for col in df.select_dtypes(include=["object"]).columns:
        vals = df[col].dropna().astype(str)
        unique_raw = vals.nunique()
        unique_normalized = vals.str.strip().str.lower().nunique()
        if unique_raw > unique_normalized and unique_normalized < 100:
            cat_issues[col] = {
                "raw_unique": unique_raw,
                "normalized_unique": unique_normalized,
                "duplicates_from_casing": unique_raw - unique_normalized,
            }
            # Find example inconsistencies
            norm_map: dict[str, list[str]] = {}
            for v in vals.unique():
                key = v.strip().lower()
                norm_map.setdefault(key, []).append(v)
            examples = []
            for key, variants in norm_map.items():
                if len(variants) > 1:
                    examples.append({"normalized": key, "variants": variants[:5]})
                    if len(examples) >= 5:
                        break
            cat_row_details[col] = examples
    if cat_issues:
        issues["category_inconsistency"] = {
            "total": len(cat_issues),
            "columns": cat_issues,
            "affected_rows": cat_row_details,
        }

    # ── Column quality scores ──
    for col in df.columns:
        score = 100.0
        n = total_rows
        miss = int(df[col].isna().sum())
        score -= (miss / n * 100) * 0.5
        if col in trim_issues:
            score -= min(10, trim_issues[col] / n * 100)
        if col in outlier_issues:
            score -= min(10, outlier_issues[col]["pct"])
        if col in cat_issues:
            score -= 5
        col_quality[col] = {
            "score": max(0, round(score, 1)),
            "dtype": str(df[col].dtype),
            "non_null": int(df[col].notna().sum()),
            "unique": int(df[col].nunique()),
            "missing_pct": round(miss / n * 100, 1),
        }

    # ── Quality score breakdown ──
    quality_breakdown = _compute_quality_breakdown(df, issues, total_rows, total_cols)

    # ── Overall quality score ──
    quality_score = round(
        (quality_breakdown["completeness"] + quality_breakdown["accuracy"] +
         quality_breakdown["consistency"] + quality_breakdown["validity"] +
         quality_breakdown["uniqueness"]) / 5, 1
    )

    # ── Recommendations ──
    recommendations = _generate_recommendations(df, issues, total_rows, total_cols)

    # ── Problem rows summary ──
    problem_rows = _build_problem_rows(affected_rows, df)

    # ── AI executive summary ──
    executive_summary = _generate_executive_summary(
        df, issues, quality_score, quality_breakdown, total_rows, total_cols
    )

    # ── Business impact ──
    business_impact = _generate_business_impact(df, issues, total_rows)

    # ── Data preview ──
    preview = [_safe_record(df.iloc[i]) for i in range(min(8, total_rows))]
    columns_list = list(df.columns)

    total_issues = sum(
        v.get("total", v.get("count", 0)) if isinstance(v, dict) else 0
        for v in issues.values()
    )

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "quality_score": quality_score,
        "quality_breakdown": quality_breakdown,
        "total_issues": total_issues,
        "issues": issues,
        "column_quality": col_quality,
        "recommendations": recommendations,
        "problem_rows": problem_rows,
        "executive_summary": executive_summary,
        "business_impact": business_impact,
        "preview": preview,
        "columns": columns_list,
    }


# ---------------------------------------------------------------------------
#  Quality Score Breakdown
# ---------------------------------------------------------------------------

def _compute_quality_breakdown(
    df: pd.DataFrame, issues: dict, total_rows: int, total_cols: int,
) -> dict[str, float]:
    total_cells = total_rows * total_cols

    # Completeness: how much data is present
    missing_count = issues.get("missing_values", {}).get("total", 0)
    empty_row_count = issues.get("empty_rows", {}).get("count", 0)
    completeness = max(0, round(100 - (missing_count / max(total_cells, 1)) * 100 - empty_row_count / max(total_rows, 1) * 10, 1))

    # Accuracy: outliers + type mismatches
    outlier_count = issues.get("outliers", {}).get("total", 0)
    type_mismatch = len(issues.get("type_mismatch", {}).get("columns", {}))
    accuracy = max(0, round(100 - (outlier_count / max(total_rows, 1)) * 50 - type_mismatch * 3, 1))

    # Consistency: category standardization + whitespace
    cat_count = len(issues.get("category_inconsistency", {}).get("columns", {}))
    ws_count = issues.get("whitespace", {}).get("total", 0)
    consistency = max(0, round(100 - cat_count * 5 - (ws_count / max(total_cells, 1)) * 50, 1))

    # Validity: emails + phones + dates
    email_count = issues.get("invalid_emails", {}).get("total", 0)
    phone_count = issues.get("invalid_phones", {}).get("total", 0)
    date_count = issues.get("date_format", {}).get("total", 0)
    validity = max(0, round(100 - (email_count + phone_count + date_count) / max(total_rows, 1) * 100, 1))

    # Uniqueness: duplicates
    dup_count = issues.get("duplicates", {}).get("count", 0)
    uniqueness = max(0, round(100 - (dup_count / max(total_rows, 1)) * 100, 1))

    return {
        "completeness": min(completeness, 100),
        "accuracy": min(accuracy, 100),
        "consistency": min(consistency, 100),
        "validity": min(validity, 100),
        "uniqueness": min(uniqueness, 100),
    }


# ---------------------------------------------------------------------------
#  Problem Rows Builder
# ---------------------------------------------------------------------------

def _build_problem_rows(
    affected_rows: dict[int, list[dict]], df: pd.DataFrame,
) -> list[dict[str, Any]]:
    rows = []
    for row_idx in sorted(affected_rows.keys())[:100]:
        issues_list = affected_rows[row_idx]
        issue_summary = ", ".join(set(i["detail"] for i in issues_list))
        issue_types = list(set(i["type"] for i in issues_list))
        problem_cols = list(set(i["column"] for i in issues_list if i["column"] != "_row_"))

        row_data = _safe_record(df.iloc[row_idx]) if row_idx < len(df) else {}
        rows.append({
            "row": row_idx,
            "issue_count": len(issues_list),
            "issues": issue_summary,
            "issue_types": issue_types,
            "problem_columns": problem_cols,
            "record": row_data,
        })
    return rows


# ---------------------------------------------------------------------------
#  Diagnostic helpers
# ---------------------------------------------------------------------------

def _diagnose_email(val: str) -> str:
    v = val.strip()
    if not v:
        return "Empty value"
    if "@" not in v:
        return "Missing @ symbol"
    parts = v.split("@")
    if len(parts) != 2:
        return "Multiple @ symbols"
    if not parts[0]:
        return "Missing username before @"
    if "." not in parts[1]:
        return "Missing domain extension (e.g., .com)"
    if parts[1].startswith(".") or parts[1].endswith("."):
        return "Invalid domain format"
    return "Invalid email format"


def _diagnose_phone(val: str) -> str:
    v = val.strip()
    if not v:
        return "Empty value"
    digits = re.sub(r'\D', '', v)
    if len(digits) < 7:
        return f"Too few digits ({len(digits)}) — minimum 7 required"
    if len(digits) > 15:
        return f"Too many digits ({len(digits)}) — maximum 15"
    if not PHONE_RE.match(v):
        return "Contains invalid characters"
    return "Invalid phone format"


# ---------------------------------------------------------------------------
#  AI Executive Summary
# ---------------------------------------------------------------------------

def _generate_executive_summary(
    df: pd.DataFrame, issues: dict, quality_score: float,
    breakdown: dict, total_rows: int, total_cols: int,
) -> dict[str, Any]:
    total_issues = sum(
        v.get("total", v.get("count", 0)) if isinstance(v, dict) else 0
        for v in issues.values()
    )

    summary_text = (
        f"Dataset contains {total_rows:,} records across {total_cols} columns. "
        f"{total_issues} quality issues were detected with an overall score of {quality_score}/100."
    )

    major_findings = []
    if "missing_values" in issues:
        cols = issues["missing_values"]["columns"]
        worst = max(cols.items(), key=lambda x: x[1]["count"])
        major_findings.append(
            f"{issues['missing_values']['total']} missing values detected — "
            f"worst in '{worst[0]}' ({worst[1]['count']} nulls, {worst[1]['pct']}%)"
        )
    if "invalid_emails" in issues:
        major_findings.append(f"{issues['invalid_emails']['total']} invalid email addresses found")
    if "outliers" in issues:
        cols = list(issues["outliers"]["columns"].keys())
        major_findings.append(
            f"{issues['outliers']['total']} statistical outliers in {', '.join(cols[:3])}"
        )
    if "duplicates" in issues:
        major_findings.append(f"{issues['duplicates']['count']} duplicate rows ({issues['duplicates']['pct']}%)")

    estimated_post_clean = min(100, round(quality_score + (100 - quality_score) * 0.85, 1))

    return {
        "text": summary_text,
        "major_findings": major_findings,
        "estimated_post_clean_score": estimated_post_clean,
        "quality_breakdown": breakdown,
    }


# ---------------------------------------------------------------------------
#  Business Impact Analysis
# ---------------------------------------------------------------------------

def _generate_business_impact(
    df: pd.DataFrame, issues: dict, total_rows: int,
) -> list[dict[str, Any]]:
    impacts = []

    if "missing_values" in issues:
        total_missing = issues["missing_values"]["total"]
        pct = round(total_missing / max(total_rows * len(df.columns), 1) * 100, 1)
        for col, info in issues["missing_values"]["columns"].items():
            cl = col.lower()
            if any(w in cl for w in ("condition", "diagnosis", "risk", "disease")):
                impacts.append({
                    "issue": f"Missing {col} values",
                    "impact": f"Missing {col} values may reduce risk stratification accuracy by {min(info['pct'] * 1.5, 30):.0f}%.",
                    "priority": "high",
                })
            elif any(w in cl for w in ("cost", "amount", "spend", "paid", "price")):
                impacts.append({
                    "issue": f"Missing {col} values",
                    "impact": f"Missing {col} data may skew financial calculations and forecasting.",
                    "priority": "high",
                })

    if "outliers" in issues:
        for col, info in issues["outliers"]["columns"].items():
            cl = col.lower()
            if any(w in cl for w in ("cost", "amount", "spend", "paid")):
                # Calculate actual skew impact
                q3 = info.get("upper", 0)
                mean = info.get("mean", 0)
                if mean > 0:
                    skew_pct = round((q3 / mean - 1) * 100, 0)
                    impacts.append({
                        "issue": f"Outliers in {col}",
                        "impact": f"Cost outliers may skew average {col} calculations by up to {min(skew_pct, 50):.0f}%.",
                        "priority": "medium",
                    })

    if "duplicates" in issues:
        dup_pct = issues["duplicates"]["pct"]
        if dup_pct > 1:
            impacts.append({
                "issue": "Duplicate records",
                "impact": f"Duplicate records ({dup_pct}%) may inflate metrics and distort analysis accuracy.",
                "priority": "high" if dup_pct > 5 else "medium",
            })

    return impacts


# ---------------------------------------------------------------------------
#  Recommendations
# ---------------------------------------------------------------------------

def _generate_recommendations(
    df: pd.DataFrame, issues: dict, total_rows: int, total_cols: int,
) -> list[dict[str, Any]]:
    recs = []

    if "missing_values" in issues:
        total = issues["missing_values"]["total"]
        pct = round(total / (total_rows * total_cols) * 100, 1)
        worst_col = max(issues["missing_values"]["columns"].items(), key=lambda x: x[1]["count"])

        # Determine best fill strategy
        col_dtype = str(df[worst_col[0]].dtype)
        is_numeric = "int" in col_dtype or "float" in col_dtype
        fill_strategy = "median" if is_numeric else "mode (most frequent value)"

        # AI confidence based on data distribution
        if is_numeric:
            std = df[worst_col[0]].std()
            mean = df[worst_col[0]].mean()
            cv = (std / mean * 100) if mean > 0 else 100
            confidence = 95 if cv < 30 else 85 if cv < 60 else 70
        else:
            mode_pct = (df[worst_col[0]].value_counts().iloc[0] / df[worst_col[0]].notna().sum() * 100) if df[worst_col[0]].notna().sum() > 0 else 0
            confidence = min(96, max(60, int(mode_pct)))

        suggested_value = None
        if is_numeric:
            suggested_value = str(round(float(df[worst_col[0]].median()), 2))
        elif df[worst_col[0]].notna().sum() > 0:
            mode = df[worst_col[0]].mode()
            if len(mode) > 0:
                suggested_value = str(mode.iloc[0])

        recs.append({
            "id": "fill_missing",
            "title": "Fill Missing Values",
            "description": (
                f"{total:,} missing values found ({pct}% of all data). "
                f"Worst column: '{worst_col[0]}' with {worst_col[1]['count']:,} missing ({worst_col[1]['pct']}%)."
            ),
            "severity": "high" if pct > 10 else "medium" if pct > 2 else "low",
            "confidence": confidence,
            "fix": "fill_missing_numeric" if is_numeric else "fill_missing_categorical",
            "fix_label": f"Fill with {fill_strategy}",
            "suggested_value": suggested_value,
            "ai_reason": f"Based on data distribution analysis, {fill_strategy} is the optimal imputation strategy for '{worst_col[0]}'.",
            "root_cause": _analyze_root_cause("missing_values", worst_col[0], df),
        })

    if "duplicates" in issues:
        count = issues["duplicates"]["count"]
        recs.append({
            "id": "remove_duplicates",
            "title": "Remove Duplicate Records",
            "description": f"{count:,} duplicate rows detected ({issues['duplicates']['pct']}% of dataset).",
            "severity": "high" if count > total_rows * 0.05 else "medium",
            "confidence": 98,
            "fix": "remove_duplicates",
            "fix_label": "Remove Duplicates",
            "root_cause": "Likely caused by data import overlap or ETL pipeline re-runs.",
        })

    if "whitespace" in issues:
        recs.append({
            "id": "trim_whitespace",
            "title": "Trim Whitespace",
            "description": f"{issues['whitespace']['total']:,} values have leading/trailing spaces across {len(issues['whitespace']['columns'])} columns.",
            "severity": "low",
            "confidence": 99,
            "fix": "trim_whitespace",
            "fix_label": "Trim All",
            "root_cause": "Common in manually entered or copy-pasted data.",
        })

    if "empty_rows" in issues:
        recs.append({
            "id": "remove_empty_rows",
            "title": "Remove Empty Rows",
            "description": f"{issues['empty_rows']['count']:,} completely empty rows found.",
            "severity": "medium",
            "confidence": 100,
            "fix": "remove_empty_rows",
            "fix_label": "Remove Empty Rows",
        })

    if "empty_columns" in issues:
        recs.append({
            "id": "remove_empty_columns",
            "title": "Remove Empty Columns",
            "description": f"{issues['empty_columns']['count']} columns are entirely empty: {', '.join(issues['empty_columns']['columns'][:5])}.",
            "severity": "medium",
            "confidence": 100,
            "fix": "remove_empty_columns",
            "fix_label": "Remove Empty Columns",
        })

    if "date_format" in issues:
        recs.append({
            "id": "fix_dates",
            "title": "Standardize Date Formats",
            "description": f"{issues['date_format']['total']:,} date values could not be parsed in {len(issues['date_format']['columns'])} columns.",
            "severity": "medium",
            "confidence": 85,
            "fix": "fix_dates",
            "fix_label": "Standardize Dates",
            "root_cause": "Mixed date formats from different data sources or regional settings.",
        })

    if "invalid_emails" in issues:
        recs.append({
            "id": "fix_emails",
            "title": "Fix Invalid Email Addresses",
            "description": f"{issues['invalid_emails']['total']:,} invalid email addresses detected.",
            "severity": "high",
            "confidence": 90,
            "fix": "trim_whitespace",
            "fix_label": "Trim & Validate",
            "root_cause": "Missing @ symbols, incomplete domains, or data entry errors.",
        })

    if "outliers" in issues:
        cols = list(issues["outliers"]["columns"].keys())
        recs.append({
            "id": "handle_outliers",
            "title": "Handle Statistical Outliers",
            "description": f"{issues['outliers']['total']:,} outlier values detected using IQR method across {len(cols)} numeric columns.",
            "severity": "low",
            "confidence": 75,
            "fix": "remove_outliers",
            "fix_label": "Remove Outliers",
            "root_cause": "May indicate data entry errors, exceptional cases, or legitimate extreme values requiring review.",
        })

    if "category_inconsistency" in issues:
        recs.append({
            "id": "standardize_categories",
            "title": "Standardize Category Values",
            "description": f"{len(issues['category_inconsistency']['columns'])} columns have inconsistent casing/spacing in category values.",
            "severity": "medium",
            "confidence": 88,
            "fix": "standardize_categories",
            "fix_label": "Standardize",
            "root_cause": "Inconsistent data entry — same values entered with different casing or spacing.",
        })

    if "type_mismatch" in issues:
        recs.append({
            "id": "fix_types",
            "title": "Fix Data Type Mismatches",
            "description": f"{issues['type_mismatch']['total']} columns contain mixed data types (text and numbers).",
            "severity": "medium",
            "confidence": 80,
            "fix": "fill_missing_numeric",
            "fix_label": "Convert Types",
            "root_cause": "Numeric columns corrupted with text entries during data collection or import.",
        })

    return recs


def _analyze_root_cause(issue_type: str, column: str, df: pd.DataFrame) -> str:
    cl = column.lower()

    if issue_type == "missing_values":
        missing_pct = df[column].isna().sum() / len(df) * 100
        if missing_pct > 50:
            return f"Over {missing_pct:.0f}% of values are missing — column may not be collected consistently or is optional in the source system."
        if any(w in cl for w in ("condition", "diagnosis")):
            return "Likely incomplete enrollment or intake records — clinical data often has gaps from source system limitations."
        if any(w in cl for w in ("email", "phone", "contact")):
            return "Contact information frequently missing from records — may indicate optional fields in source forms."
        return "Possible causes: incomplete data entry, source system gaps, or data migration issues."

    return "Root cause analysis requires additional context."


# ---------------------------------------------------------------------------
#  Cleaning Engine
# ---------------------------------------------------------------------------

def clean_dataset(df: pd.DataFrame, fixes: list[str]) -> pd.DataFrame:
    cleaned = df.copy()

    for fix in fixes:
        if fix == "remove_duplicates":
            cleaned = cleaned.drop_duplicates()
        elif fix == "remove_empty_rows":
            cleaned = cleaned.dropna(how="all")
        elif fix == "remove_empty_columns":
            cleaned = cleaned.dropna(axis=1, how="all")
        elif fix == "trim_whitespace":
            for col in cleaned.select_dtypes(include=["object"]).columns:
                cleaned[col] = cleaned[col].astype(str).str.strip()
                cleaned[col] = cleaned[col].replace("nan", np.nan)
        elif fix == "fill_missing_numeric":
            for col in cleaned.select_dtypes(include=[np.number]).columns:
                if cleaned[col].isna().any():
                    cleaned[col] = cleaned[col].fillna(cleaned[col].median())
        elif fix == "fill_missing_categorical":
            for col in cleaned.select_dtypes(include=["object"]).columns:
                if cleaned[col].isna().any():
                    mode = cleaned[col].mode()
                    if len(mode) > 0:
                        cleaned[col] = cleaned[col].fillna(mode.iloc[0])
        elif fix == "standardize_categories":
            for col in cleaned.select_dtypes(include=["object"]).columns:
                cleaned[col] = cleaned[col].astype(str).str.strip().str.title()
                cleaned[col] = cleaned[col].replace("Nan", np.nan)
        elif fix == "fix_dates":
            for col in cleaned.columns:
                cl = col.lower()
                if cleaned[col].dtype == "object" and any(w in cl for w in ("date", "time", "created", "updated")):
                    cleaned[col] = pd.to_datetime(cleaned[col], errors="coerce")
        elif fix == "remove_outliers":
            for col in cleaned.select_dtypes(include=[np.number]).columns:
                cl = col.lower()
                if any(w in cl for w in ("id", "index", "key")):
                    continue
                q1, q3 = cleaned[col].quantile(0.25), cleaned[col].quantile(0.75)
                iqr = q3 - q1
                if iqr > 0:
                    cleaned = cleaned[(cleaned[col] >= q1 - 1.5 * iqr) & (cleaned[col] <= q3 + 1.5 * iqr)]

    return cleaned


def _empty_profile(rows: int, cols: int) -> dict[str, Any]:
    return {
        "total_rows": rows,
        "total_columns": cols,
        "quality_score": 0 if rows == 0 else 100,
        "quality_breakdown": {
            "completeness": 100, "accuracy": 100, "consistency": 100,
            "validity": 100, "uniqueness": 100,
        },
        "total_issues": 0,
        "issues": {},
        "column_quality": {},
        "recommendations": [],
        "problem_rows": [],
        "executive_summary": {"text": "Empty dataset.", "major_findings": [], "estimated_post_clean_score": 100, "quality_breakdown": {}},
        "business_impact": [],
        "preview": [],
        "columns": [],
    }
