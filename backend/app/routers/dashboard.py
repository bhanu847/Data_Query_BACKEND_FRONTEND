import json

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.dashboard_engine import generate_dashboard
from app.auth.deps import get_current_user
from app.database.db import get_db
from app.models.models import Dashboard, Source, User
from app.schemas.schemas import (
    ChartDataRequest,
    ChartDataResponse,
    ColumnsResponse,
    DashboardOut,
    DashboardResponse,
    KpiDataRequest,
    KpiDataResponse,
    SaveDashboardRequest,
    UpdateDashboardRequest,
)
from app.services import store

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardRequest(BaseModel):
    source_id: int


def _get_df(db: Session, source_id: int, user_id: int) -> pd.DataFrame:
    try:
        return store.get_frame(db, source_id, user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Source not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _apply_filters(df: pd.DataFrame, filters: dict | None) -> pd.DataFrame:
    if not filters:
        return df
    for col, val in filters.items():
        if col not in df.columns:
            continue
        if isinstance(val, list):
            df = df[df[col].isin(val)]
        elif isinstance(val, dict):
            if "min" in val:
                df = df[df[col] >= val["min"]]
            if "max" in val:
                df = df[df[col] <= val["max"]]
        else:
            df = df[df[col] == val]
    return df


def _records(df: pd.DataFrame) -> list[dict]:
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# ---- Auto-generate (existing) ----
@router.post("/generate", response_model=DashboardResponse)
def generate(payload: DashboardRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    df = _get_df(db, payload.source_id, user.id)
    source = db.query(Source).filter(Source.id == payload.source_id).first()
    return generate_dashboard(df, name=source.name if source else "Dataset")


# ---- Column metadata ----
@router.get("/columns/{source_id}", response_model=ColumnsResponse)
def get_columns(source_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    df = _get_df(db, source_id, user.id)
    dtype_map = {}
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            dtype_map[col] = "datetime"
        elif pd.api.types.is_numeric_dtype(df[col]):
            dtype_map[col] = "numeric"
        elif pd.api.types.is_bool_dtype(df[col]):
            dtype_map[col] = "boolean"
        else:
            dtype_map[col] = "categorical"
    return ColumnsResponse(
        columns=df.columns.tolist(),
        dtypes=dtype_map,
        sample=_records(df.head(5)),
        row_count=len(df),
    )


# ---- Chart data generation ----
@router.post("/chart-data", response_model=ChartDataResponse)
def chart_data(payload: ChartDataRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    df = _get_df(db, payload.source_id, user.id)
    df = _apply_filters(df, payload.filters)

    x = payload.x_column
    y = payload.y_column
    agg = payload.aggregation
    chart_type = payload.chart_type
    data = []
    title = ""

    agg_funcs = {
        "sum": "sum", "mean": "mean", "avg": "mean", "average": "mean",
        "count": "count", "min": "min", "max": "max",
        "median": "median", "std": "std",
    }
    agg_fn = agg_funcs.get(agg, "sum")

    if chart_type in ("bar", "horizontal_bar", "pie", "donut", "treemap", "funnel"):
        if x and y and x in df.columns and y in df.columns:
            grouped = df.groupby(x, dropna=False)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            if payload.sort_order == "ascending":
                grouped = grouped.sort_values(y, ascending=True)
            elif payload.sort_order == "descending":
                grouped = grouped.sort_values(y, ascending=False)
            if payload.limit:
                grouped = grouped.head(payload.limit)
            data = _records(grouped)
            title = f"{y} by {x} ({agg})"

    elif chart_type in ("line", "area"):
        if x and y and x in df.columns and y in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[x]) or "date" in x.lower():
                try:
                    df[x] = pd.to_datetime(df[x], errors="coerce")
                except Exception:
                    pass
            grouped = df.groupby(x, dropna=False)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            grouped = grouped.sort_values(x)
            if payload.limit:
                grouped = grouped.tail(payload.limit)
            data = _records(grouped)
            title = f"{y} over {x}"

    elif chart_type == "scatter":
        if x and y and x in df.columns and y in df.columns:
            sample = df[[x, y]].dropna()
            if payload.limit:
                sample = sample.head(payload.limit)
            else:
                sample = sample.head(500)
            data = _records(sample)
            title = f"{x} vs {y}"

    elif chart_type == "bubble":
        if x and y and x in df.columns and y in df.columns:
            sample = df[[x, y]].dropna().head(200)
            for row in _records(sample):
                row["z"] = abs(row.get(y, 1))
            data = _records(sample)
            title = f"{x} vs {y} (bubble)"

    elif chart_type == "histogram":
        if x and x in df.columns:
            col_data = df[x].dropna()
            if pd.api.types.is_numeric_dtype(col_data):
                counts, bin_edges = np.histogram(col_data, bins=min(20, len(col_data)))
                data = [{"bin": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}", "count": int(counts[i])}
                        for i in range(len(counts))]
                y = "count"
                x = "bin"
            title = f"Distribution of {payload.x_column}"

    elif chart_type == "box_plot":
        if x and x in df.columns:
            col_data = df[x].dropna()
            if pd.api.types.is_numeric_dtype(col_data):
                data = [{
                    "name": x,
                    "min": float(col_data.min()),
                    "q1": float(col_data.quantile(0.25)),
                    "median": float(col_data.median()),
                    "q3": float(col_data.quantile(0.75)),
                    "max": float(col_data.max()),
                    "mean": float(col_data.mean()),
                }]
            title = f"Box Plot of {x}"

    elif chart_type == "heatmap":
        if x and y:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if len(numeric_cols) >= 2:
                corr = df[numeric_cols].corr()
                data = []
                for row_name in corr.index:
                    for col_name in corr.columns:
                        data.append({"x": col_name, "y": row_name, "value": round(corr.loc[row_name, col_name], 3)})
                x = "x"
                y = "y"
            title = "Correlation Heatmap"

    elif chart_type == "correlation_matrix":
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) >= 2:
            corr = df[numeric_cols].corr()
            data = []
            for row_name in corr.index:
                for col_name in corr.columns:
                    data.append({"x": col_name, "y": row_name, "value": round(corr.loc[row_name, col_name], 3)})
            x = "x"
            y = "y"
        title = "Correlation Matrix"

    elif chart_type == "radar":
        if x and y and x in df.columns and y in df.columns:
            grouped = df.groupby(x)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            if payload.limit:
                grouped = grouped.head(payload.limit)
            else:
                grouped = grouped.head(8)
            data = _records(grouped)
            title = f"{y} by {x} (Radar)"

    elif chart_type == "waterfall":
        if x and y and x in df.columns and y in df.columns:
            grouped = df.groupby(x)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            cumulative = 0
            waterfall_data = []
            for _, row in grouped.iterrows():
                val = float(row[y])
                waterfall_data.append({"name": str(row[x]), "value": val, "cumulative": cumulative + val})
                cumulative += val
            data = waterfall_data
            x = "name"
            y = "value"
            title = f"{payload.y_column} Waterfall"

    elif chart_type == "gauge":
        if y and y in df.columns:
            val = float(df[y].agg(agg_fn))
            col_min = float(df[y].min())
            col_max = float(df[y].max())
            data = [{"value": val, "min": col_min, "max": col_max}]
            title = f"{y} ({agg})"

    elif chart_type == "top_n":
        if x and y and x in df.columns and y in df.columns:
            n = payload.limit or 10
            grouped = df.groupby(x)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            grouped = grouped.sort_values(y, ascending=False).head(n)
            data = _records(grouped)
            title = f"Top {n} {x} by {y}"

    else:
        if x and y and x in df.columns and y in df.columns:
            grouped = df.groupby(x)[y].agg(agg_fn).reset_index()
            grouped.columns = [x, y]
            data = _records(grouped)
            title = f"{y} by {x}"

    return ChartDataResponse(chart_type=chart_type, title=title, x=x, y=y, data=data)


# ---- KPI data ----
@router.post("/kpi-data", response_model=KpiDataResponse)
def kpi_data(payload: KpiDataRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    df = _get_df(db, payload.source_id, user.id)
    df = _apply_filters(df, payload.filters)

    col = payload.column
    if col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{col}' not found")

    agg = payload.aggregation
    if agg == "count":
        val = len(df[col].dropna())
    elif agg == "distinct":
        val = df[col].nunique()
    elif agg in ("sum", "mean", "avg", "average", "min", "max", "median", "std"):
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise HTTPException(status_code=400, detail=f"Column '{col}' is not numeric")
        fn = {"avg": "mean", "average": "mean"}.get(agg, agg)
        val = float(df[col].agg(fn))
    else:
        val = float(df[col].sum())

    if isinstance(val, float):
        formatted = f"{val:,.2f}"
    else:
        formatted = f"{val:,}"

    return KpiDataResponse(label=f"{agg.title()} {col}", value=formatted, aggregation=agg)


# ---- Filter values ----
@router.get("/filter-values/{source_id}/{column}")
def filter_values(source_id: int, column: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    df = _get_df(db, source_id, user.id)
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")

    if pd.api.types.is_numeric_dtype(df[column]):
        return {
            "type": "numeric",
            "min": float(df[column].min()) if not df[column].isna().all() else 0,
            "max": float(df[column].max()) if not df[column].isna().all() else 0,
        }
    elif pd.api.types.is_datetime64_any_dtype(df[column]):
        return {
            "type": "datetime",
            "min": str(df[column].min()),
            "max": str(df[column].max()),
        }
    else:
        unique = df[column].dropna().unique().tolist()
        return {"type": "categorical", "values": sorted([str(v) for v in unique[:200]])}


# ---- Dashboard CRUD ----
@router.post("/save", response_model=DashboardOut)
def save_dashboard(payload: SaveDashboardRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dashboard = Dashboard(
        owner_id=user.id,
        source_id=payload.source_id,
        name=payload.name,
        config=json.dumps(payload.config),
        template=payload.template,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return _dashboard_to_out(dashboard)


@router.get("/list", response_model=list[DashboardOut])
def list_dashboards(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dashboards = db.query(Dashboard).filter(Dashboard.owner_id == user.id).order_by(Dashboard.updated_at.desc()).all()
    return [_dashboard_to_out(d) for d in dashboards]


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.owner_id == user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return _dashboard_to_out(dashboard)


@router.put("/{dashboard_id}", response_model=DashboardOut)
def update_dashboard(dashboard_id: int, payload: UpdateDashboardRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.owner_id == user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if payload.name is not None:
        dashboard.name = payload.name
    if payload.config is not None:
        dashboard.config = json.dumps(payload.config)
    db.commit()
    db.refresh(dashboard)
    return _dashboard_to_out(dashboard)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.owner_id == user.id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    db.delete(dashboard)
    db.commit()
    return {"ok": True}


def _dashboard_to_out(d: Dashboard) -> DashboardOut:
    config = json.loads(d.config) if isinstance(d.config, str) else d.config
    return DashboardOut(
        id=d.id,
        source_id=d.source_id,
        name=d.name,
        config=config,
        template=d.template,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )