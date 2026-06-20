import { useState, useEffect } from "react";
import { listSources, exportPDF } from "../services/api";

const REPORT_TYPES = [
  { key: "summary", label: "Summary Report", desc: "High-level overview with key metrics." },
  { key: "detailed", label: "Detailed Analysis", desc: "Full breakdown with charts and data tables." },
  { key: "trends", label: "Trends Report", desc: "Time-series analysis and trend lines." },
  { key: "custom", label: "Custom Prompt", desc: "Describe exactly what you want in the report." },
];

export default function ReportTool({ onBack }) {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [reportType, setReportType] = useState("summary");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false));
  }, []);

  const generate = async () => {
    if (!selectedSource) return;
    setError("");
    setDone(false);
    setGenerating(true);
    try {
      const src = sources.find((s) => s.id === selectedSource);
      const name = `report_${src?.name || selectedSource}.pdf`;
      await exportPDF(selectedSource, name);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">Report Generator</h2>
        <p className="text-sm text-muted">Generate a polished PDF report from your data in seconds.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-5">
        {/* Source selection */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">1. Select data source</h3>
          {loadingSources ? (
            <p className="text-sm text-muted-2 animate-pulse">Loading…</p>
          ) : sources.length === 0 ? (
            <div className="rounded-xl bg-surface-1 border border-border p-4 text-center">
              <p className="text-sm text-muted">No sources yet. Upload data first.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {sources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSource(src.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    selectedSource === src.id
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border hover:bg-surface-1 text-ink"
                  }`}
                >
                  <span className="font-medium">{src.name || src.filename || `Source ${src.id}`}</span>
                  <span className="ml-auto text-xs text-muted-2">{src.type || "file"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Report type */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">2. Choose report type</h3>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.key}
                onClick={() => setReportType(rt.key)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  reportType === rt.key
                    ? "border-brand bg-brand/10"
                    : "border-border hover:bg-surface-1"
                }`}
              >
                <p className={`text-sm font-semibold ${reportType === rt.key ? "text-brand" : "text-ink"}`}>
                  {rt.label}
                </p>
                <p className="mt-0.5 text-xs text-muted">{rt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {reportType === "custom" && (
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Describe what you want in the report…"
            className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
          />
        )}

        {error && <p className="text-sm text-accent-rose">{error}</p>}

        {done && (
          <div className="rounded-xl bg-accent-emerald/10 border border-emerald-200 px-4 py-3 text-sm text-accent-emerald">
            ✅ Report downloaded successfully!
          </div>
        )}

        <button
          onClick={generate}
          disabled={!selectedSource || generating}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
        >
          {generating ? "Generating report…" : "Generate & Download PDF"}
        </button>
      </div>
    </div>
  );
}
