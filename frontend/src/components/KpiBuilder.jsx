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
  { value: "brand",  label: "Cyan",   hex: "#22D3EE" },
  { value: "green",  label: "Green",  hex: "#34D399" },
  { value: "purple", label: "Purple", hex: "#A78BFA" },
  { value: "orange", label: "Orange", hex: "#FB923C" },
  { value: "red",    label: "Red",    hex: "#FB7185" },
  { value: "teal",   label: "Teal",   hex: "#2DD4BF" },
];

const ICONS = ["$", "#", "%", "↑", "↓", "★", "◆", "●", "▲"];

const selectClass = "w-full rounded-xl bg-surface-2 border border-border px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all appearance-none";
const inputClass = selectClass;

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
    onAdd({
      label: customLabel || preview.label,
      value: preview.value,
      column,
      aggregation,
      color,
      icon,
    });
  };

  const selectedColor = COLORS.find((c) => c.value === color) || COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[#0c1020] border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">Add KPI Card</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-2 text-muted-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Metric Column</label>
            <select value={column} onChange={(e) => setColumn(e.target.value)} className={selectClass}>
              <option value="">Select column...</option>
              {(showNumericOnly ? numericCols : allCols).map((c) => (
                <option key={c} value={c}>{c} ({dtypes[c]})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Aggregation</label>
            <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className={selectClass}>
              {AGGREGATIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Custom Label (optional)</label>
            <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g. Total Revenue" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c.value} onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{
                    background: `${c.hex}15`,
                    borderColor: color === c.value ? c.hex : "transparent",
                    boxShadow: color === c.value ? `0 0 10px ${c.hex}40` : "none",
                  }}
                  title={c.label}>
                  <div className="w-3 h-3 rounded-full mx-auto" style={{ background: c.hex }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`w-8 h-8 rounded-lg border text-sm font-bold flex items-center justify-center transition-all ${
                    icon === ic ? "border-brand bg-brand/10 text-brand shadow-[0_0_8px_rgba(34,211,238,0.2)]" : "border-border bg-surface-2 text-muted hover:bg-surface-3"
                  }`}>{ic}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-accent-rose">{error}</p>}

          {/* KPI preview — value only, no chart */}
          {preview && (
            <div className="rounded-xl border p-4 relative overflow-hidden"
              style={{ background: `${selectedColor.hex}08`, borderColor: `${selectedColor.hex}30` }}>
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full blur-[20px] opacity-40 pointer-events-none"
                style={{ background: selectedColor.hex }} />
              <div className="relative flex items-center gap-3">
                <span className="text-lg font-bold" style={{ color: selectedColor.hex }}>{icon}</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">{customLabel || preview.label}</p>
                  <p className="font-display text-2xl font-bold" style={{ color: selectedColor.hex }}>{preview.value}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={generatePreview} disabled={!column || loading}
              className="rounded-xl bg-surface-2 border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-3 disabled:opacity-40 transition-all flex items-center gap-2">
              {loading && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />}
              {loading ? "Loading..." : "Preview"}
            </button>
            {preview && (
              <button onClick={handleAdd}
                className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform">
                Add KPI Card
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
