import { useState, useEffect } from "react";
import { getChartData, getFilterValues } from "../services/api";

const CHART_CATEGORIES = [
  {
    label: "Basic Charts",
    charts: [
      { type: "bar", label: "Bar Chart", icon: "|||" },
      { type: "horizontal_bar", label: "Horizontal Bar", icon: "≡" },
      { type: "line", label: "Line Chart", icon: "⟋" },
      { type: "area", label: "Area Chart", icon: "▲" },
      { type: "pie", label: "Pie Chart", icon: "◔" },
      { type: "donut", label: "Donut Chart", icon: "◎" },
      { type: "scatter", label: "Scatter Plot", icon: "⁘" },
      { type: "bubble", label: "Bubble Chart", icon: "◉" },
    ],
  },
  {
    label: "Statistical Charts",
    charts: [
      { type: "histogram", label: "Histogram", icon: "▌" },
      { type: "box_plot", label: "Box Plot", icon: "☐" },
      { type: "heatmap", label: "Heatmap", icon: "▦" },
      { type: "correlation_matrix", label: "Correlation Matrix", icon: "⊞" },
    ],
  },
  {
    label: "Advanced Charts",
    charts: [
      { type: "treemap", label: "Treemap", icon: "⊟" },
      { type: "funnel", label: "Funnel Chart", icon: "▽" },
      { type: "radar", label: "Radar Chart", icon: "⬡" },
      { type: "waterfall", label: "Waterfall", icon: "⥮" },
      { type: "gauge", label: "Gauge Chart", icon: "◑" },
      { type: "top_n", label: "Top N Analysis", icon: "🏆" },
    ],
  },
];

const AGGREGATIONS = ["sum", "mean", "count", "min", "max", "median"];
const SORT_OPTIONS = [
  { value: "", label: "None" },
  { value: "ascending", label: "Ascending" },
  { value: "descending", label: "Descending" },
];

const NEEDS_X_AND_Y = ["bar", "horizontal_bar", "line", "area", "pie", "donut", "scatter", "bubble", "radar", "treemap", "funnel", "waterfall", "top_n"];
const NEEDS_ONLY_X = ["histogram", "box_plot"];
const NEEDS_ONLY_Y_GAUGE = ["gauge"];
const NO_COLUMNS = ["heatmap", "correlation_matrix"];

export default function AddChartModal({ sourceId, columns, dtypes, onAdd, onClose, editChart }) {
  const [step, setStep] = useState(editChart ? 2 : 1);
  const [chartType, setChartType] = useState(editChart?.chart_type || editChart?.type || "bar");
  const [xColumn, setXColumn] = useState(editChart?.x_column || editChart?.x || "");
  const [yColumn, setYColumn] = useState(editChart?.y_column || editChart?.y || "");
  const [aggregation, setAggregation] = useState(editChart?.aggregation || "sum");
  const [sortOrder, setSortOrder] = useState(editChart?.sort_order || "");
  const [limit, setLimit] = useState(editChart?.limit || "");
  const [filters, setFilters] = useState(editChart?.filters || {});
  const [filterCol, setFilterCol] = useState("");
  const [filterValues, setFilterValues] = useState(null);
  const [selectedFilterVals, setSelectedFilterVals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const numericCols = columns.filter((c) => dtypes[c] === "numeric");
  const categoricalCols = columns.filter((c) => dtypes[c] === "categorical");
  const allCols = columns;

  useEffect(() => {
    if (editChart) {
      setChartType(editChart.chart_type || editChart.type);
      setXColumn(editChart.x_column || editChart.x || "");
      setYColumn(editChart.y_column || editChart.y || "");
    }
  }, [editChart]);

  const loadFilterValues = async (col) => {
    if (!col) return;
    setFilterCol(col);
    try {
      const vals = await getFilterValues(sourceId, col);
      setFilterValues(vals);
      setSelectedFilterVals(filters[col] || []);
    } catch {
      setFilterValues(null);
    }
  };

  const applyFilter = () => {
    if (filterCol && selectedFilterVals.length > 0) {
      setFilters((prev) => ({ ...prev, [filterCol]: selectedFilterVals }));
    }
    setFilterCol("");
    setFilterValues(null);
    setSelectedFilterVals([]);
  };

  const removeFilter = (col) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const generatePreview = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        source_id: sourceId,
        chart_type: chartType,
        x_column: xColumn || undefined,
        y_column: yColumn || undefined,
        aggregation,
        sort_order: sortOrder || undefined,
        limit: limit ? parseInt(limit) : undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };
      const res = await getChartData(params);
      setPreview(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (preview) {
      onAdd({
        ...preview,
        chart_type: chartType,
        x_column: xColumn,
        y_column: yColumn,
        aggregation,
        sort_order: sortOrder,
        limit: limit ? parseInt(limit) : undefined,
        filters,
      });
    }
  };

  const needsXY = NEEDS_X_AND_Y.includes(chartType);
  const needsOnlyX = NEEDS_ONLY_X.includes(chartType);
  const needsOnlyY = NEEDS_ONLY_Y_GAUGE.includes(chartType);
  const noColumns = NO_COLUMNS.includes(chartType);

  const canPreview = noColumns || (needsOnlyY && yColumn) || (needsOnlyX && xColumn) || (needsXY && xColumn && yColumn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            {editChart ? "Edit Chart" : "Add Chart"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Step 1: Chart Type */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-600">Select Chart Type</p>
              {CHART_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">{cat.label}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {cat.charts.map((chart) => (
                      <button
                        key={chart.type}
                        onClick={() => { setChartType(chart.type); setStep(2); }}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all hover:border-brand/40 hover:shadow-sm ${
                          chartType === chart.type ? "border-brand bg-brand-soft" : "border-slate-200"
                        }`}
                      >
                        <span className="text-lg">{chart.icon}</span>
                        <span className="text-xs font-medium text-slate-700">{chart.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-800">← Change Type</button>
                <span className="text-sm font-medium text-brand capitalize">{chartType.replace(/_/g, " ")}</span>
              </div>

              {!noColumns && (
                <>
                  {(needsXY || needsOnlyX) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        {needsOnlyX ? "Column" : "X-Axis (Category/Date)"}
                      </label>
                      <select value={xColumn} onChange={(e) => setXColumn(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                        <option value="">Select column...</option>
                        {(needsOnlyX ? numericCols : allCols).map((c) => (
                          <option key={c} value={c}>{c} ({dtypes[c]})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(needsXY || needsOnlyY) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        {needsOnlyY ? "Metric Column" : "Y-Axis (Metric)"}
                      </label>
                      <select value={yColumn} onChange={(e) => setYColumn(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                        <option value="">Select column...</option>
                        {numericCols.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Aggregation</label>
                  <select value={aggregation} onChange={(e) => setAggregation(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                    {AGGREGATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sort</label>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Limit</label>
                  <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="All"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Filters</label>
                <div className="flex gap-2 mb-2">
                  <select value={filterCol} onChange={(e) => loadFilterValues(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
                    <option value="">Add filter...</option>
                    {categoricalCols.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {filterValues && filterValues.type === "categorical" && (
                  <div className="rounded-lg border border-slate-200 p-3 mb-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {filterValues.values.map((v) => (
                        <button key={v} onClick={() => {
                          setSelectedFilterVals((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
                        }} className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                          selectedFilterVals.includes(v) ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>{v}</button>
                      ))}
                    </div>
                    <button onClick={applyFilter} className="mt-2 rounded-lg bg-brand px-3 py-1 text-xs text-white hover:bg-brand-dark">
                      Apply Filter
                    </button>
                  </div>
                )}
                {Object.keys(filters).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(filters).map(([col, vals]) => (
                      <span key={col} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs text-violet-700">
                        {col}: {Array.isArray(vals) ? vals.join(", ") : String(vals)}
                        <button onClick={() => removeFilter(col)} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button onClick={generatePreview} disabled={!canPreview || loading}
                  className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                  {loading ? "Generating..." : "Preview Chart"}
                </button>
                {preview && (
                  <button onClick={handleAdd}
                    className="rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                    {editChart ? "Update Chart" : "Add to Dashboard"}
                  </button>
                )}
              </div>

              {preview && preview.data?.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <p className="text-xs text-slate-400 mb-2">Preview ({preview.data.length} data points)</p>
                  <div className="overflow-x-auto max-h-40">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(preview.data[0]).map((k) => (
                            <th key={k} className="text-left p-1 border-b border-slate-200 font-medium text-slate-500">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="p-1 border-b border-slate-100 text-slate-600">{v != null ? String(v) : "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}