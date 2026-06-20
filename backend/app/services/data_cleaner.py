"""
AI Data Cleaning Engine.

Profiles a DataFrame and returns structured quality metrics:
- Missing values per column
- Duplicate rows
- Invalid emails / phones
- Date format issues
- Outliers (IQR method)
- Empty rows/columns
- Text trimming issues
- Data type mismatches
- Column-level quality scores
- AI recommendations with severity + confidence
"""

import math
import re
from typing import Any

import numpy as np
import pandas as pd


EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
PHONE_RE = re.compile(r"^[\+]?[\d\s\-\(\)\.]{7,20}$")


def profile_dataset(df: pd.DataFrame) -> dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    if total_rows == 0:
        return _empty_profile(total_rows, total_cols)

    issues = {}
    col_quality = {}
    recommendations = []

    # ── Missing values ──
    missing = {}
    for col in df.columns:
        n = int(df[col].isna().sum())
        if n > 0:
            missing[col] = {"count": n, "pct": round(n / total_rows * 100, 1)}
    if missing:
        issues["missing_values"] = {"total": sum(v["count"] for v in missing.values()), "columns": missing}

    # ── Duplicates ──
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        issues["duplicates"] = {"count": dup_count, "pct": round(dup_count / total_rows * 100, 1)}

    # ── Empty rows (all NaN) ──
    empty_rows = int(df.isna().all(axis=1).sum())
    if empty_rows > 0:
        issues["empty_rows"] = {"count": empty_rows}

    # ── Empty columns (all NaN) ──
    empty_cols = [col for col in df.columns if df[col].isna().all()]
    if empty_cols:
        issues["empty_columns"] = {"count": len(empty_cols), "columns": empty_cols}

    # ── Text trimming issues ──
    trim_issues = {}
    for col in df.select_dtypes(include=["object"]).columns:
        trimmed = df[col].dropna().astype(str)
        needs_trim = (trimmed != trimmed.str.strip()).sum()
        if needs_trim > 0:
            trim_issues[col] = int(needs_trim)
    if trim_issues:
        issues["whitespace"] = {"total": sum(trim_issues.values()), "columns": trim_issues}

    # ── Invalid emails ──
    email_issues = {}
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("email", "e_mail", "e-mail", "mail")):
            vals = df[col].dropna().astype(str)
            invalid = vals[~vals.apply(lambda x: bool(EMAIL_RE.match(x.strip())))].shape[0]
            if invalid > 0:
                email_issues[col] = invalid
    if email_issues:
        issues["invalid_emails"] = {"total": sum(email_issues.values()), "columns": email_issues}

    # ── Invalid phones ──
    phone_issues = {}
    for col in df.columns:
        cl = col.lower()
        if any(w in cl for w in ("phone", "mobile", "tel", "fax", "contact_number")):
            vals = df[col].dropna().astype(str)
            invalid = vals[~vals.apply(lambda x: bool(PHONE_RE.match(x.strip())))].shape[0]
            if invalid > 0:
                phone_issues[col] = invalid
    if phone_issues:
        issues["invalid_phones"] = {"total": sum(phone_issues.values()), "columns": phone_issues}

    # ── Date format issues ──
    date_issues = {}
    for col in df.columns:
        cl = col.lower()
        if df[col].dtype == "object" and any(w in cl for w in ("date", "time", "day", "created", "updated")):
            parsed = pd.to_datetime(df[col], errors="coerce")
            failed = int(parsed.isna().sum() - df[col].isna().sum())
            if failed > 0:
                date_issues[col] = failed
    if date_issues:
        issues["date_format"] = {"total": sum(date_issues.values()), "columns": date_issues}

    # ── Outliers (IQR) ──
    outlier_issues = {}
    for col in df.select_dtypes(include=[np.number]).columns:
        cl = col.lower()
        if any(w in cl for w in ("id", "index", "key", "code", "zip", "phone")):
            continue
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            n_out = int(((df[col] < lower) | (df[col] > upper)).sum())
            if n_out > 0:
                outlier_issues[col] = {"count": n_out, "pct": round(n_out / total_rows * 100, 1),
                                       "lower": round(float(lower), 2), "upper": round(float(upper), 2)}
    if outlier_issues:
        issues["outliers"] = {"total": sum(v["count"] for v in outlier_issues.values()), "columns": outlier_issues}

    # ── Data type mismatches ──
    type_issues = {}
    for col in df.select_dtypes(include=["object"]).columns:
        vals = df[col].dropna().astype(str)
        if len(vals) == 0:
            continue
        numeric_pct = pd.to_numeric(vals, errors="coerce").notna().sum() / len(vals) * 100
        if 30 < numeric_pct < 95:
            type_issues[col] = {"numeric_pct": round(numeric_pct, 1),
                                "suggestion": "Column appears to contain mixed numeric and text data"}
    if type_issues:
        issues["type_mismatch"] = {"total": len(type_issues), "columns": type_issues}

    # ── Category standardization ──
    cat_issues = {}
    for col in df.select_dtypes(include=["object"]).columns:
        vals = df[col].dropna().astype(str)
        unique_raw = vals.nunique()
        unique_normalized = vals.str.strip().str.lower().nunique()
        if unique_raw > unique_normalized and unique_normalized < 100:
            cat_issues[col] = {"raw_unique": unique_raw, "normalized_unique": unique_normalized,
                               "duplicates_from_casing": unique_raw - unique_normalized}
    if cat_issues:
        issues["category_inconsistency"] = {"total": len(cat_issues), "columns": cat_issues}

    # ── Column quality scores ──
    for col in df.columns:
        score = 100.0
        n = total_rows
        miss = df[col].isna().sum()
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

    # ── Overall quality score ──
    total_cells = total_rows * total_cols
    penalty = 0
    if "missing_values" in issues:
        penalty += issues["missing_values"]["total"] / total_cells * 30
    if "duplicates" in issues:
        penalty += issues["duplicates"]["count"] / total_rows * 15
    if "outliers" in issues:
        penalty += issues["outliers"]["total"] / total_cells * 10
    if "whitespace" in issues:
        penalty += min(5, issues["whitespace"]["total"] / total_cells * 20)
    if "invalid_emails" in issues:
        penalty += min(5, issues["invalid_emails"]["total"] / total_cells * 20)
    if "type_mismatch" in issues:
        penalty += len(issues["type_mismatch"]["columns"]) * 2
    if "category_inconsistency" in issues:
        penalty += len(issues["category_inconsistency"]["columns"]) * 1.5
    quality_score = max(0, round(100 - penalty, 1))

    # ── Recommendations ──
    recommendations = _generate_recommendations(df, issues, total_rows, total_cols)

    # ── Data preview ──
    preview = df.head(8).fillna("").astype(str).to_dict(orient="records")
    columns_list = list(df.columns)

    total_issues = sum(
        v.get("total", v.get("count", 0)) if isinstance(v, dict) else 0
        for v in issues.values()
    )

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "quality_score": quality_score,
        "total_issues": total_issues,
        "issues": issues,
        "column_quality": col_quality,
        "recommendations": recommendations,
        "preview": preview,
        "columns": columns_list,
    }


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


def _generate_recommendations(df, issues, total_rows, total_cols):
    recs = []

    if "missing_values" in issues:
        total = issues["missing_values"]["total"]
        pct = round(total / (total_rows * total_cols) * 100, 1)
        worst_col = max(issues["missing_values"]["columns"].items(), key=lambda x: x[1]["count"])
        recs.append({
            "id": "fill_missing",
            "title": "Fill Missing Values",
            "description": f"{total:,} missing values found ({pct}% of all data). Worst column: '{worst_col[0]}' with {worst_col[1]['count']:,} missing ({worst_col[1]['pct']}%).",
            "severity": "high" if pct > 10 else "medium" if pct > 2 else "low",
            "confidence": 92,
            "fix": "fill_missing_numeric",
            "fix_label": "Fill with Median/Mode",
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
        })

    if "outliers" in issues:
        recs.append({
            "id": "handle_outliers",
            "title": "Handle Statistical Outliers",
            "description": f"{issues['outliers']['total']:,} outlier values detected using IQR method across {len(issues['outliers']['columns'])} numeric columns.",
            "severity": "low",
            "confidence": 75,
            "fix": "remove_outliers",
            "fix_label": "Remove Outliers",
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
        })

    return recs


def _empty_profile(rows, cols):
    return {
        "total_rows": rows,
        "total_columns": cols,
        "quality_score": 0 if rows == 0 else 100,
        "total_issues": 0,
        "issues": {},
        "column_quality": {},
        "recommendations": [],
        "preview": [],
        "columns": [],
    }
