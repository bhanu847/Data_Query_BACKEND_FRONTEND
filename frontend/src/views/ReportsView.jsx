import { useState, useEffect } from "react";
import { listSources, generateReportBlob, downloadBlob } from "../services/api";

const RECENT_REPORTS = [
  { type: "Executive Summary", icon: "E", color: "#818CF8" },
  { type: "Performance Analysis", icon: "P", color: "#22D3EE" },
  { type: "Trend & Forecast", icon: "T", color: "#34D399" },
  { type: "AI Insights", icon: "AI", color: "#A78BFA" },
];

export default function ReportsView({ onOpenTool }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [reportName, setReportName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleQuickGenerate = async () => {
    if (!sources.length) return;
    setError("");
    setGenerating(true);
    try {
      const src = sources[0];
      const name = (src.name || `report`).replace(/\.[^.]+$/, "");
      const blob = await generateReportBlob(src.id);
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPreviewUrl(url);
      setReportName(`${name}_report.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) downloadBlob(pdfBlob, reportName);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPdfBlob(null);
    setReportName("");
  };

  if (previewUrl) {
    return (
      <div className="max-w-[1180px] mx-auto animate-fade-in space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 border border-accent-indigo/30 font-mono text-sm font-bold text-[#A5B4FC]">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{reportName}</p>
              <p className="text-xs text-muted">Report preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={closePreview}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleDownload}
              className="rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
            >
              Download PDF
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-card">
          <iframe
            src={previewUrl}
            title="Report Preview"
            className="w-full border-0"
            style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            AI-powered business intelligence reports with insights, charts and recommendations.
          </p>
        </div>
        <button
          onClick={() => onOpenTool("report")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2.5 text-[13.5px] font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
        >
          &#xFF0B; New AI Report
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-3 text-sm text-accent-rose">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface-1 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : !sources.length ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-1 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/30 flex items-center justify-center font-mono text-lg font-bold text-[#A5B4FC] mb-5">
            AI
          </div>
          <p className="font-semibold text-ink text-lg">No data available</p>
          <p className="mt-2 text-sm text-muted max-w-sm">
            Upload a dataset first, then use the AI Report Generator to create professional business reports.
          </p>
          <button
            onClick={() => onOpenTool("excel")}
            className="mt-5 rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
          >
            Upload Data
          </button>
        </div>
      ) : (
        <>
          {/* Quick-generate hero card */}
          <div className="relative rounded-2xl border border-border bg-surface-1 p-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] opacity-30 bg-gradient-brand pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-xl font-bold text-[#050710] shadow-glow-sm font-display">
                  AI
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-ink">Quick Report</p>
                  <p className="text-sm text-muted mt-0.5">
                    Generate an instant executive summary from your active dataset
                  </p>
                </div>
              </div>
              <button
                onClick={handleQuickGenerate}
                disabled={generating}
                className="shrink-0 rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-60 transition-transform"
              >
                {generating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" />
                    Generating…
                  </span>
                ) : (
                  "Generate Now"
                )}
              </button>
            </div>
          </div>

          {/* Report type cards */}
          <div>
            <p className="text-sm font-semibold text-ink mb-3">Create a new report</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {RECENT_REPORTS.map((rt) => (
                <button
                  key={rt.type}
                  onClick={() => onOpenTool("report")}
                  className="group relative flex flex-col rounded-2xl border border-border bg-surface-1 p-5 text-left overflow-hidden hover:border-border-2 hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[25px] opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity"
                    style={{ background: rt.color }}
                  />
                  <div
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold mb-3"
                    style={{ background: `${rt.color}18`, color: rt.color, border: `1px solid ${rt.color}40` }}
                  >
                    {rt.icon}
                  </div>
                  <p className="relative text-sm font-semibold text-ink">{rt.type}</p>
                  <span className="relative mt-2 text-xs font-medium" style={{ color: rt.color }}>
                    Create →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
