import { useState } from "react";
import { getKpiData } from "../services/api";

const AGGREGATIONS = [
  { value: "sum", label: "Total (Sum)" },
  { value: "mean", label: "Average (Mean)" },
  { value: "count", label: "Count" },
  { value: "distinct", label: "Distinct Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "median", label: "Median" },
];

const COLORS = [
  { value: "brand", label: "Blue", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { value: "green", label: "Green", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { value: "purple", label: "Purple", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { value: "orange", label: "Orange", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { value: "red", label: "Red", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { value: "teal", label: "Teal", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
];

const ICONS = ["$", "#", "%", "↑", "↓", "★", "◆", "●", "▲"];

export default function KpiBuilder({ sourceId, columns, dtypes, onAdd, onClose }) {
  const [column, setColumn] = useState("");
  const [aggregation, setAggregation] = useState("sum");
  const [customLabel, setCustomLabel] = useState("");
  const [color, setColor] = useState("brand");
  const [icon, setIcon] = useState("$");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const numericCols = columns.filter((c) => dtypes[c] === "numeric");
  const allCols = columns;
  const showNumericOnly = !["count", "distinct"].includes(aggregation);

  const generatePreview = async () => {
    if (!column) return;
    setLoading(true);
    setError("");
    try {
      const res = await getKpiData({ source_id: sourceId, column, aggregation });
      setPreview(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!preview) return;
    const colorDef = COLORS.find((c) => c.value === color) || COLORS[0];
    onAdd({
      label: customLabel || preview.label,
      value: preview.value,
      column,
      aggregation,
      color: colorDef,
      icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="font-display text-lg font-semibold text-slate-900">Add KPI Card</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Metric Column</label>
            <select value={column} onChange={(e) => setColumn(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
              <option value="">Select column...</option>
              {(showNumericOnly ? numericCols : allCols).map((c) => (
                <option key={c} value={c}>{c} ({dtypes[c]})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Aggregation</label>
            <select value={aggregation} onChange={(e) => setAggregation(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none">
              {AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Custom Label (optional)</label>
            <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Total Revenue"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c.value} onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-lg ${c.bg} border-2 transition-all ${
                    color === c.value ? `${c.border} ring-2 ring-offset-1 ring-slate-300` : "border-transparent"
                  }`} title={c.label} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((i) => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${
                    icon === i ? "border-brand bg-brand-soft text-brand" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}>{i}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {preview && (
            <div className={`rounded-xl border p-4 ${COLORS.find((c) => c.value === color)?.bg || "bg-slate-50"} ${COLORS.find((c) => c.value === color)?.border || "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${COLORS.find((c) => c.value === color)?.text || "text-slate-700"}`}>{icon}</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{customLabel || preview.label}</p>
                  <p className={`font-display text-2xl font-semibold ${COLORS.find((c) => c.value === color)?.text || "text-slate-900"}`}>{preview.value}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={generatePreview} disabled={!column || loading}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
              {loading ? "Loading..." : "Preview"}
            </button>
            {preview && (
              <button onClick={handleAdd}
                className="rounded-xl bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark">
                Add KPI Card
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}