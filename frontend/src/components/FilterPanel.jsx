import { useState, useEffect } from "react";
import { getFilterValues } from "../services/api";

export default function FilterPanel({ sourceId, columns, dtypes, filters, onFiltersChange }) {
  const [expanded, setExpanded] = useState(true);
  const [filterConfigs, setFilterConfigs] = useState({});
  const [loadingCol, setLoadingCol] = useState(null);

  const categoricalCols = columns.filter((c) => dtypes[c] === "categorical");
  const numericCols = columns.filter((c) => dtypes[c] === "numeric");
  const dateTimeCols = columns.filter((c) => dtypes[c] === "datetime");

  const loadValues = async (col) => {
    if (filterConfigs[col]) return;
    setLoadingCol(col);
    try {
      const vals = await getFilterValues(sourceId, col);
      setFilterConfigs((prev) => ({ ...prev, [col]: vals }));
    } catch {
      // ignore
    } finally {
      setLoadingCol(null);
    }
  };

  const toggleCategoricalValue = (col, val) => {
    const current = filters[col] || [];
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
    if (next.length === 0) {
      const updated = { ...filters };
      delete updated[col];
      onFiltersChange(updated);
    } else {
      onFiltersChange({ ...filters, [col]: next });
    }
  };

  const setRangeFilter = (col, min, max) => {
    const range = {};
    if (min !== "" && min !== undefined) range.min = Number(min);
    if (max !== "" && max !== undefined) range.max = Number(max);
    if (Object.keys(range).length === 0) {
      const updated = { ...filters };
      delete updated[col];
      onFiltersChange(updated);
    } else {
      onFiltersChange({ ...filters, [col]: range });
    }
  };

  const clearAll = () => onFiltersChange({});

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters & Slicers
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>
          )}
        </div>
        <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto">
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(filters).map(([col, val]) => (
                  <span key={col} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700">
                    {col}: {Array.isArray(val) ? `${val.length} selected` : typeof val === "object" ? `${val.min ?? ""}–${val.max ?? ""}` : String(val)}
                    <button onClick={() => {
                      const updated = { ...filters };
                      delete updated[col];
                      onFiltersChange(updated);
                    }} className="hover:text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
              <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-2">Clear all</button>
            </div>
          )}

          {/* Categorical filters */}
          {categoricalCols.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Categories</p>
              {categoricalCols.map((col) => (
                <FilterSection key={col} col={col} config={filterConfigs[col]} filters={filters}
                  loading={loadingCol === col} onExpand={() => loadValues(col)}
                  onToggle={(val) => toggleCategoricalValue(col, val)} />
              ))}
            </div>
          )}

          {/* Numeric range filters */}
          {numericCols.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Numeric Ranges</p>
              {numericCols.slice(0, 5).map((col) => (
                <div key={col} className="mb-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">{col}</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min"
                      value={filters[col]?.min ?? ""}
                      onChange={(e) => setRangeFilter(col, e.target.value, filters[col]?.max)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand focus:outline-none" />
                    <span className="text-slate-400 text-xs self-center">to</span>
                    <input type="number" placeholder="Max"
                      value={filters[col]?.max ?? ""}
                      onChange={(e) => setRangeFilter(col, filters[col]?.min, e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-brand focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {categoricalCols.length === 0 && numericCols.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No filterable columns detected</p>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSection({ col, config, filters, loading, onExpand, onToggle }) {
  const [open, setOpen] = useState(false);
  const selected = filters[col] || [];

  const toggle = () => {
    if (!open) onExpand();
    setOpen(!open);
  };

  return (
    <div className="mb-1">
      <button onClick={toggle}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
        <span className="font-medium">{col}</span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span className="rounded-full bg-brand/10 px-1.5 text-[10px] text-brand font-medium">{selected.length}</span>
          )}
          <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="ml-2 mt-1 max-h-28 overflow-y-auto">
          {loading && <p className="text-xs text-slate-400 animate-pulse px-2">Loading...</p>}
          {config?.values?.map((v) => (
            <label key={v} className="flex items-center gap-2 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 rounded cursor-pointer">
              <input type="checkbox" checked={selected.includes(v)} onChange={() => onToggle(v)}
                className="rounded border-slate-300 text-brand focus:ring-brand" />
              {v}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}