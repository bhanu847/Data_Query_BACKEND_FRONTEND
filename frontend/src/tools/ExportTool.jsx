import { useState, useEffect } from "react";
//import { listSources, exportCSV, exportExcel, exportPDF } from "../api/api";
import { listSources, exportCSV, exportExcel, exportPDF } from "../services/api";

const FORMATS = [
  { key: "csv", label: "CSV", icon: "📄", desc: "Comma-separated values, compatible with any tool.", ext: "csv" },
  { key: "excel", label: "Excel", icon: "📊", desc: "Microsoft Excel format (.xlsx).", ext: "xlsx" },
  { key: "pdf", label: "PDF", icon: "📑", desc: "Formatted PDF report with data and charts.", ext: "pdf" },
];

export default function ExportTool({ onBack }) {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [format, setFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false));
  }, []);

  const doExport = async () => {
    if (!selectedSource) return;
    setError("");
    setDone(false);
    setExporting(true);
    try {
      const src = sources.find((s) => s.id === selectedSource);
      const baseName = src?.name || src?.filename || `export_${selectedSource}`;
      if (format === "csv") await exportCSV(selectedSource, `${baseName}.csv`);
      else if (format === "excel") await exportExcel(selectedSource, `${baseName}.xlsx`);
      else await exportPDF(selectedSource, `${baseName}.pdf`);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">Export Center</h2>
        <p className="text-sm text-muted">Download your data in CSV, Excel, or PDF format.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-5">
        {/* Source */}
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

        {/* Format */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">2. Choose export format</h3>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  format === f.key
                    ? "border-brand bg-brand/10"
                    : "border-border hover:bg-surface-1"
                }`}
              >
                <span className="text-2xl">{f.icon}</span>
                <p className={`mt-2 text-sm font-semibold ${format === f.key ? "text-brand" : "text-ink"}`}>
                  {f.label}
                </p>
                <p className="mt-0.5 text-xs text-muted">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-accent-rose">{error}</p>}

        {done && (
          <div className="rounded-xl bg-accent-emerald/10 border border-accent-emerald/25 px-4 py-3 text-sm text-accent-emerald">
            ✅ File downloaded successfully!
          </div>
        )}

        <button
          onClick={doExport}
          disabled={!selectedSource || exporting}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
        >
          {exporting ? "Exporting…" : `Export as ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
