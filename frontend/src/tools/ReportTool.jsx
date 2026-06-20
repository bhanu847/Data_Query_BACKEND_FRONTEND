import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  listSources,
  getSourceColumns,
  getChartData,
  getKpiData,
  getFilterValues,
  askQuestion,
  generateReportBlob,
  downloadBlob,
} from "../services/api";
import AutoChart from "../charts/AutoChart";

/* ═══════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════ */

const REPORT_TYPES = [
  {
    key: "executive",
    label: "Executive Summary",
    icon: "E",
    color: "#818CF8",
    glow: "rgba(129,140,248,0.35)",
    bullets: ["High-level KPI overview", "AI-generated business summary", "Key findings & recommendations"],
  },
  {
    key: "performance",
    label: "Performance Analysis",
    icon: "P",
    color: "#22D3EE",
    glow: "rgba(34,211,238,0.35)",
    bullets: ["KPI performance breakdown", "Top & bottom performers", "Comparative analysis"],
  },
  {
    key: "trend",
    label: "Trend & Forecast",
    icon: "T",
    color: "#34D399",
    glow: "rgba(52,211,153,0.35)",
    bullets: ["Historical trends", "Growth patterns", "Predictive forecasting"],
  },
  {
    key: "insights",
    label: "AI Insights",
    icon: "AI",
    color: "#A78BFA",
    glow: "rgba(167,139,250,0.35)",
    bullets: ["Automated insight generation", "Anomaly detection", "Root cause analysis"],
  },
  {
    key: "operational",
    label: "Operational Report",
    icon: "O",
    color: "#FB923C",
    glow: "rgba(251,146,60,0.35)",
    bullets: ["Detailed tables", "Drill-down analysis", "Transaction-level reporting"],
  },
  {
    key: "custom",
    label: "Custom AI Report",
    icon: "C",
    color: "#FBBF24",
    glow: "rgba(251,191,36,0.35)",
    bullets: ["Natural language prompt input", "Fully custom analysis", "AI-generated narrative"],
  },
];

const VISUAL_TYPES = [
  { key: "kpi",     label: "KPI Cards",    icon: "#" },
  { key: "line",    label: "Line Charts",  icon: "~" },
  { key: "bar",     label: "Bar Charts",   icon: "|" },
  { key: "pie",     label: "Pie Charts",   icon: "O" },
  { key: "area",    label: "Area Charts",  icon: "^" },
  { key: "heatmap", label: "Heatmaps",     icon: "H" },
  { key: "scatter", label: "Scatter Plots", icon: "." },
  { key: "table",   label: "Data Tables",  icon: "T" },
];

const AI_FEATURES = [
  { key: "summary",    label: "Generate Executive Summary" },
  { key: "insights",   label: "Highlight Key Insights" },
  { key: "anomalies",  label: "Detect Anomalies" },
  { key: "trends",     label: "Explain Trends" },
  { key: "actions",    label: "Recommend Actions" },
  { key: "forecast",   label: "Forecast Future Performance" },
];

const EXPORT_FORMATS = [
  { key: "pdf",   label: "PDF",        ext: ".pdf",  color: "#FB7185" },
  { key: "excel", label: "Excel",      ext: ".xlsx", color: "#34D399" },
  { key: "pptx",  label: "PowerPoint", ext: ".pptx", color: "#FB923C" },
  { key: "docx",  label: "Word",       ext: ".docx", color: "#38BDF8" },
];

const STEP_LABELS = [
  "Report Type",
  "KPI Selection",
  "Filters",
  "Visuals & AI",
  "Preview & Generate",
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export default function ReportTool({ onBack }) {
  const [step, setStep] = useState(0);
  const [reportType, setReportType] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");

  // data
  const [sources, setSources] = useState([]);
  const [activeSource, setActiveSource] = useState(null);
  const [columns, setColumns] = useState(null);
  const [loading, setLoading] = useState(true);

  // kpi
  const [selectedKpis, setSelectedKpis] = useState([]);

  // filters
  const [filterMeta, setFilterMeta] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});

  // visuals / ai
  const [selectedVisuals, setSelectedVisuals] = useState(["kpi", "bar", "line", "pie"]);
  const [aiFeatures, setAiFeatures] = useState(["summary", "insights", "trends", "actions"]);
  const [exportFormat, setExportFormat] = useState("pdf");

  // preview / generate
  const [previewData, setPreviewData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  /* ---- bootstrap: get first available source ---- */
  useEffect(() => {
    listSources()
      .then((srcs) => {
        setSources(srcs);
        if (srcs.length) setActiveSource(srcs[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeSource) return;
    getSourceColumns(activeSource.id)
      .then((meta) => {
        setColumns(meta);
        autoSelectKpis(meta);
        fetchFilterMeta(activeSource.id, meta);
      })
      .catch(() => {});
  }, [activeSource]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  function autoSelectKpis(meta) {
    const ID_PATTERNS = /\b(id|index|key|code|zip|phone|fax)\b/i;
    const numeric = Object.entries(meta.dtypes || {})
      .filter(([, t]) => t === "numeric")
      .map(([c]) => c)
      .filter((c) => !ID_PATTERNS.test(c));
    setSelectedKpis(numeric.slice(0, 6));
  }

  async function fetchFilterMeta(sourceId, meta) {
    const cat = Object.entries(meta.dtypes || {})
      .filter(([, t]) => t === "categorical" || t === "datetime")
      .map(([c]) => c);
    const results = {};
    for (const col of cat.slice(0, 10)) {
      try {
        results[col] = await getFilterValues(sourceId, col);
      } catch { /* skip */ }
    }
    setFilterMeta(results);
  }

  const numericCols = useMemo(
    () =>
      columns
        ? Object.entries(columns.dtypes || {})
            .filter(([, t]) => t === "numeric")
            .map(([c]) => c)
        : [],
    [columns]
  );

  const categoricalCols = useMemo(
    () =>
      columns
        ? Object.entries(columns.dtypes || {})
            .filter(([, t]) => t === "categorical")
            .map(([c]) => c)
        : [],
    [columns]
  );

  /* ---- generate preview ---- */
  const generatePreview = useCallback(async () => {
    if (!activeSource) return;
    setGeneratingPreview(true);
    setError("");
    const preview = { kpis: [], charts: [], aiSummary: "", recommendations: [] };

    try {
      const kpiAgg = (col) => {
        const cl = col.toLowerCase();
        if (/\b(avg|average|rate|ratio|percent|pct|score|rating)\b/.test(cl)) return "mean";
        if (/\b(price|unit_price|unitprice)\b/.test(cl)) return "mean";
        return "sum";
      };
      const kpiResults = await Promise.all(
        selectedKpis.slice(0, 6).map((col) =>
          getKpiData({
            source_id: activeSource.id,
            column: col,
            aggregation: kpiAgg(col),
            filters: appliedFilters,
          }).catch(() => null)
        )
      );
      preview.kpis = kpiResults.filter(Boolean);

      const chartConfigs = [];
      const groupCol = categoricalCols[0];
      const groupCol2 = categoricalCols[1];
      const metric1 = selectedKpis[0];
      const metric2 = selectedKpis[1];
      const dateCol = Object.entries(columns?.dtypes || {}).find(([, t]) => t === "datetime");
      const sid = activeSource.id;

      if (groupCol && metric1) {
        if (selectedVisuals.includes("bar"))
          chartConfigs.push({ source_id: sid, chart_type: "bar", x_column: groupCol, y_column: metric1, aggregation: "sum", filters: appliedFilters, limit: 10 });
        if (selectedVisuals.includes("pie"))
          chartConfigs.push({ source_id: sid, chart_type: "pie", x_column: groupCol, y_column: metric1, aggregation: "sum", filters: appliedFilters, limit: 6 });
      }
      if (dateCol && metric1 && selectedVisuals.includes("line"))
        chartConfigs.push({ source_id: sid, chart_type: "line", x_column: dateCol[0], y_column: metric1, aggregation: "sum", filters: appliedFilters });
      if (dateCol && metric1 && selectedVisuals.includes("area"))
        chartConfigs.push({ source_id: sid, chart_type: "area", x_column: dateCol[0], y_column: metric1, aggregation: "sum", filters: appliedFilters });
      if (groupCol2 && metric1)
        chartConfigs.push({ source_id: sid, chart_type: "horizontal_bar", x_column: groupCol2, y_column: metric1, aggregation: "sum", filters: appliedFilters, limit: 10 });
      if (groupCol && metric2 && selectedVisuals.includes("bar"))
        chartConfigs.push({ source_id: sid, chart_type: "bar", x_column: groupCol, y_column: metric2, aggregation: "sum", filters: appliedFilters, limit: 10 });
      if (metric1 && metric2 && selectedVisuals.includes("scatter"))
        chartConfigs.push({ source_id: sid, chart_type: "scatter", x_column: metric1, y_column: metric2, filters: appliedFilters, limit: 300 });

      const chartResults = await Promise.all(
        chartConfigs.map((cfg) => getChartData(cfg).catch(() => null))
      );
      preview.charts = chartResults
        .filter((r) => r?.data?.length)
        .map((r) => ({ type: r.chart_type, title: r.title, x: r.x, y: r.y, data: r.data }));

      if (aiFeatures.includes("summary") || aiFeatures.includes("insights")) {
        try {
          const q =
            reportType === "custom" && customPrompt
              ? customPrompt
              : `Provide an executive summary of this dataset. Highlight key metrics, top performers, anomalies, and actionable recommendations. Be specific with numbers.`;
          const aiRes = await askQuestion(activeSource.id, q);
          preview.aiSummary = aiRes.answer || "";
          preview.recommendations = aiRes.insights || [];
        } catch {
          preview.aiSummary = "AI summary will be generated with the full report.";
        }
      }
    } catch (e) {
      setError(e.message);
    }

    setPreviewData(preview);
    setGeneratingPreview(false);
  }, [activeSource, selectedKpis, selectedVisuals, aiFeatures, appliedFilters, columns, categoricalCols, reportType, customPrompt]);

  /* ---- generate final report ---- */
  const generateReport = useCallback(async () => {
    if (!activeSource) return;
    setGenerating(true);
    setError("");
    try {
      const blob = await generateReportBlob(activeSource.id);
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPreviewUrl(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [activeSource]);

  const handleDownload = () => {
    if (pdfBlob) {
      const name = activeSource?.name?.replace(/\.[^.]+$/, "") || "report";
      downloadBlob(pdfBlob, `${name}_report.pdf`);
    }
  };

  /* ---- nav helpers ---- */
  const canNext = () => {
    if (step === 0) return !!reportType;
    if (step === 1) return selectedKpis.length > 0;
    return true;
  };

  const goNext = () => {
    if (step === 3) {
      generatePreview();
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  /* ═══════════════════════════════════════════════════════════════════ */
  /*   PDF PREVIEW STATE                                               */
  /* ═══════════════════════════════════════════════════════════════════ */

  if (previewUrl) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 border border-accent-indigo/30 font-mono text-sm font-bold text-[#A5B4FC]">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">AI-Generated Report</p>
              <p className="text-xs text-muted">Your report is ready for download</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPdfBlob(null); }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleDownload}
              className="rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
            >
              Download Report
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden shadow-card">
          <iframe src={previewUrl} title="Report" className="w-full border-0" style={{ height: "calc(100vh - 240px)", minHeight: 500 }} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  if (!sources.length) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Header onBack={onBack} />
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-1 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/30 flex items-center justify-center font-mono text-lg font-bold text-[#A5B4FC] mb-5">
            AI
          </div>
          <p className="font-semibold text-ink text-lg">No data available</p>
          <p className="mt-2 text-sm text-muted max-w-sm">Upload a dataset first to start generating AI-powered business reports.</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  /*   MAIN RENDER                                                     */
  /* ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 animate-fade-in">
      <Header onBack={onBack} />

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => i <= step && setStep(i)}
            className="flex items-center gap-1.5 group"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                i === step
                  ? "bg-gradient-brand text-[#050710] shadow-glow-sm"
                  : i < step
                  ? "bg-brand/20 text-brand"
                  : "bg-surface-2 text-muted-2"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={`hidden sm:block text-xs font-medium transition-colors ${
                i === step ? "text-ink" : i < step ? "text-brand" : "text-muted-2"
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={`hidden sm:block w-6 h-px mx-1 ${i < step ? "bg-brand/40" : "bg-border"}`} />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-3 text-sm text-accent-rose">
          {error}
        </div>
      )}

      {/* ──────── Step 0: Report Type ──────── */}
      {step === 0 && (
        <div className="space-y-4">
          <SectionTitle num="01" title="Choose Report Type" sub="Select the type of analysis you need" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.key}
                onClick={() => setReportType(rt.key)}
                className={`group relative flex flex-col rounded-2xl border p-5 text-left overflow-hidden transition-all duration-200 ${
                  reportType === rt.key
                    ? "border-transparent ring-2 ring-brand/60 bg-surface-1"
                    : "border-border bg-surface-1 hover:border-border-2 hover:-translate-y-0.5"
                }`}
              >
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[30px] opacity-40 pointer-events-none transition-opacity group-hover:opacity-60"
                  style={{ background: rt.glow }}
                />
                <div
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold mb-3"
                  style={{
                    background: `${rt.color}18`,
                    color: rt.color,
                    border: `1px solid ${rt.color}40`,
                    boxShadow: reportType === rt.key ? `0 0 20px ${rt.glow}` : "none",
                  }}
                >
                  {rt.icon}
                </div>
                <p className="relative font-display text-[15px] font-semibold text-ink">{rt.label}</p>
                <ul className="relative mt-2 space-y-1">
                  {rt.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-xs text-muted">
                      <span className="mt-0.5 text-[8px]" style={{ color: rt.color }}>●</span>
                      {b}
                    </li>
                  ))}
                </ul>
                {reportType === rt.key && (
                  <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-md bg-brand text-[10px] font-bold text-[#050710]">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>

          {reportType === "custom" && (
            <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-3">
              <p className="text-sm font-semibold text-ink">Describe your report</p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Analyze revenue performance by region and explain the causes of decline…"
                className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm text-ink placeholder:text-muted-2 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ──────── Step 1: KPI Selection ──────── */}
      {step === 1 && (
        <div className="space-y-4">
          <SectionTitle num="02" title="Select KPIs" sub="Choose the metrics to include in your report" />

          {/* Selected pills */}
          {selectedKpis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedKpis.map((kpi) => (
                <span
                  key={kpi}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 border border-brand/30 px-3 py-1.5 text-xs font-semibold text-brand"
                >
                  {formatLabel(kpi)}
                  <button
                    onClick={() => setSelectedKpis((p) => p.filter((k) => k !== kpi))}
                    className="ml-0.5 text-brand/60 hover:text-brand"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedKpis([])}
                className="text-xs text-muted hover:text-accent-rose transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Available metrics */}
          <div className="rounded-2xl border border-border bg-surface-1 p-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Available Metrics</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {numericCols.map((col) => {
                const sel = selectedKpis.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() =>
                      setSelectedKpis((p) => (sel ? p.filter((k) => k !== col) : [...p, col]))
                    }
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                      sel
                        ? "border-brand/40 bg-brand/10 text-brand"
                        : "border-border text-ink hover:bg-surface-2"
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${sel ? "bg-brand text-[#050710]" : "bg-surface-3 text-muted"}`}>
                      {sel ? "✓" : "#"}
                    </span>
                    <span className="truncate">{formatLabel(col)}</span>
                  </button>
                );
              })}
            </div>
            {numericCols.length === 0 && (
              <p className="text-sm text-muted-2 text-center py-6">No numeric columns detected in the dataset.</p>
            )}
          </div>
        </div>
      )}

      {/* ──────── Step 2: Filters ──────── */}
      {step === 2 && (
        <div className="space-y-4">
          <SectionTitle num="03" title="Business Filters" sub="Narrow down the data scope for your report" />

          <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
            {Object.keys(filterMeta).length === 0 && (
              <p className="text-sm text-muted-2 text-center py-6">No filterable columns detected. You can skip this step.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(filterMeta).map(([col, meta]) => (
                <FilterControl
                  key={col}
                  column={col}
                  meta={meta}
                  value={appliedFilters[col]}
                  onChange={(val) =>
                    setAppliedFilters((prev) => {
                      const next = { ...prev };
                      if (!val || (Array.isArray(val) && !val.length)) delete next[col];
                      else next[col] = val;
                      return next;
                    })
                  }
                />
              ))}
            </div>

            {Object.keys(appliedFilters).length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-xs text-muted">
                  {Object.keys(appliedFilters).length} filter{Object.keys(appliedFilters).length > 1 ? "s" : ""} applied
                </p>
                <button
                  onClick={() => setAppliedFilters({})}
                  className="text-xs text-accent-rose hover:text-accent-rose/80 font-medium"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────── Step 3: Visuals & AI ──────── */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Visualization Options */}
          <div className="space-y-3">
            <SectionTitle num="04" title="Visualization Options" sub="Choose which visuals to include" />
            <div className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VISUAL_TYPES.map((vt) => {
                  const sel = selectedVisuals.includes(vt.key);
                  return (
                    <button
                      key={vt.key}
                      onClick={() =>
                        setSelectedVisuals((p) =>
                          sel ? p.filter((v) => v !== vt.key) : [...p, vt.key]
                        )
                      }
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        sel
                          ? "border-brand/40 bg-brand/10 text-brand"
                          : "border-border text-ink hover:bg-surface-2"
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold font-mono ${sel ? "bg-brand text-[#050710]" : "bg-surface-3 text-muted"}`}>
                        {vt.icon}
                      </span>
                      {vt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Features */}
          <div className="space-y-3">
            <SectionTitle num="05" title="AI Features" sub="Enable AI-powered enhancements" />
            <div className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_FEATURES.map((af) => {
                  const on = aiFeatures.includes(af.key);
                  return (
                    <button
                      key={af.key}
                      onClick={() =>
                        setAiFeatures((p) =>
                          on ? p.filter((f) => f !== af.key) : [...p, af.key]
                        )
                      }
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all ${
                        on
                          ? "border-accent-indigo/40 bg-accent-indigo/[0.06] text-ink"
                          : "border-border text-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold transition-colors ${on ? "bg-accent-indigo text-white" : "bg-surface-3 text-muted-2"}`}>
                        {on ? "✓" : ""}
                      </span>
                      <span className="font-medium">{af.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <SectionTitle num="06" title="Export Format" sub="Choose the output format" />
            <div className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="flex flex-wrap gap-2">
                {EXPORT_FORMATS.map((ef) => (
                  <button
                    key={ef.key}
                    onClick={() => setExportFormat(ef.key)}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      exportFormat === ef.key
                        ? "border-transparent ring-2 text-ink"
                        : "border-border text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                    style={
                      exportFormat === ef.key
                        ? { ringColor: ef.color, boxShadow: `0 0 0 2px ${ef.color}50` }
                        : {}
                    }
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold font-mono text-white"
                      style={{ background: ef.color }}
                    >
                      {ef.ext.replace(".", "").slice(0, 3).toUpperCase()}
                    </span>
                    {ef.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Step 4: Preview & Generate ──────── */}
      {step === 4 && (
        <div className="space-y-5">
          <SectionTitle num="07" title="Report Preview" sub="Live preview of your report" />

          {generatingPreview ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-border bg-surface-1">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand/30 border-t-brand mb-4" />
              <p className="text-sm text-muted">Generating preview…</p>
              <p className="text-xs text-muted-2 mt-1">Analyzing your data with AI</p>
            </div>
          ) : previewData ? (
            <div className="space-y-4">
              {/* KPI Cards */}
              {previewData.kpis.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {previewData.kpis.map((kpi, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-surface-1 p-4 hover:border-border-2 transition-colors">
                      <p className="text-xs text-muted truncate">{kpi.label}</p>
                      <p className="text-xl font-bold text-ink mt-1 font-display">{kpi.value}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-[10px] font-medium text-accent-emerald bg-accent-emerald/10 rounded-full px-1.5 py-0.5">
                          {kpi.aggregation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Charts */}
              {previewData.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {previewData.charts.map((chart, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
                      <AutoChart spec={chart} height={240} />
                    </div>
                  ))}
                </div>
              )}

              {/* AI Summary */}
              {previewData.aiSummary && (
                <div className="rounded-2xl border border-accent-indigo/25 bg-accent-indigo/[0.04] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-indigo/15 text-[10px] font-bold font-mono text-[#A5B4FC]">
                      AI
                    </div>
                    <p className="text-sm font-semibold text-ink">AI Executive Summary</p>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">{previewData.aiSummary}</p>
                </div>
              )}

              {/* Recommendations */}
              {previewData.recommendations.length > 0 && (
                <div className="rounded-2xl border border-accent-emerald/25 bg-accent-emerald/[0.04] p-5 space-y-3">
                  <p className="text-sm font-semibold text-ink">Key Insights & Recommendations</p>
                  <ul className="space-y-2">
                    {previewData.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink/80">
                        <span className="mt-0.5 text-xs text-accent-emerald">●</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generate CTA */}
              <div className="rounded-2xl border border-border bg-surface-1 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-bold text-ink">Ready to generate?</p>
                  <p className="text-sm text-muted mt-1">
                    {REPORT_TYPES.find((r) => r.key === reportType)?.label || "Report"} with{" "}
                    {selectedKpis.length} KPIs, {selectedVisuals.length} visuals, {aiFeatures.length} AI features
                  </p>
                </div>
                <button
                  onClick={generateReport}
                  disabled={generating}
                  className="shrink-0 rounded-xl bg-gradient-brand px-8 py-3 text-sm font-bold text-[#050710] shadow-glow hover:-translate-y-0.5 disabled:opacity-60 transition-transform"
                >
                  {generating ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" />
                      Generating Report…
                    </span>
                  ) : (
                    "Generate AI Report"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-border bg-surface-1">
              <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/25 flex items-center justify-center font-mono text-sm font-bold text-brand mb-4">
                AI
              </div>
              <p className="font-semibold text-ink">Preview not loaded</p>
              <p className="mt-1 text-sm text-muted">Click &quot;Generate Preview&quot; to see your report</p>
              <button
                onClick={generatePreview}
                className="mt-5 rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
              >
                Generate Preview
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────── Bottom Nav ──────── */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 transition-colors"
        >
          ← Previous
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5">
          {STEP_LABELS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-brand" : i < step ? "w-1.5 bg-brand/40" : "w-1.5 bg-surface-3"
              }`}
            />
          ))}
        </div>

        {step < STEP_LABELS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!canNext()}
            className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-40 transition-transform"
          >
            {step === 3 ? "Preview Report →" : "Next →"}
          </button>
        ) : (
          <div className="w-[100px]" />
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function Header({ onBack }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink transition-colors">
          ← Back to Tools
        </button>
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          AI Report Generator
        </h2>
        <p className="text-sm text-muted mt-1">
          Create intelligent, data-driven business reports with AI-powered insights
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
        <span className="text-[11px] font-medium text-[#A5B4FC]">AI-Powered</span>
      </div>
    </div>
  );
}

function SectionTitle({ num, title, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold font-mono text-muted">
        {num}
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
    </div>
  );
}

function FilterControl({ column, meta, value, onChange }) {
  if (meta.type === "categorical") {
    const vals = meta.values || [];
    const selected = value || [];
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted">{formatLabel(column)}</label>
        <div className="relative">
          <select
            multiple
            value={selected}
            onChange={(e) => {
              const chosen = [...e.target.selectedOptions].map((o) => o.value);
              onChange(chosen);
            }}
            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            style={{ minHeight: 38, maxHeight: 120 }}
          >
            {vals.slice(0, 50).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                {s}
                <button onClick={() => onChange(selected.filter((v) => v !== s))} className="text-brand/50 hover:text-brand">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (meta.type === "datetime") {
    const cur = value || {};
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted">{formatLabel(column)}</label>
        <div className="flex gap-2">
          <input
            type="date"
            value={cur.min || ""}
            onChange={(e) => onChange({ ...cur, min: e.target.value })}
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
          />
          <input
            type="date"
            value={cur.max || ""}
            onChange={(e) => onChange({ ...cur, max: e.target.value })}
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
          />
        </div>
      </div>
    );
  }

  if (meta.type === "numeric") {
    const cur = value || {};
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted">{formatLabel(column)}</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={`Min (${meta.min})`}
            value={cur.min ?? ""}
            onChange={(e) => onChange({ ...cur, min: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
          />
          <input
            type="number"
            placeholder={`Max (${meta.max})`}
            value={cur.max ?? ""}
            onChange={(e) => onChange({ ...cur, max: e.target.value ? Number(e.target.value) : undefined })}
            className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-brand/50"
          />
        </div>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════════ */

function formatLabel(col) {
  return col
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
