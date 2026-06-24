import { useState, useRef, useCallback, useEffect } from "react";
import {
  uploadAny,
  listSources,
  profileDataset,
  applyCleanFixes,
  downloadCleanedFile,
  getRowDetail,
} from "../services/api";
import DatabaseConnector from "../components/DatabaseConnector";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const PALETTE = ["#22D3EE", "#818CF8", "#34D399", "#FB923C", "#FB7185", "#38BDF8", "#FBBF24", "#A78BFA", "#F87171", "#2DD4BF"];

const FEATURES = [
  { key: "missing",     icon: "?",  label: "Missing Values",       desc: "Detect null, empty and NaN values" },
  { key: "duplicates",  icon: "D",  label: "Duplicate Records",    desc: "Find exact duplicate rows" },
  { key: "emails",      icon: "@",  label: "Email Validation",     desc: "Validate email address formats" },
  { key: "phones",      icon: "#",  label: "Phone Validation",     desc: "Check phone number formats" },
  { key: "dates",       icon: "T",  label: "Date Standardization", desc: "Normalize date formats" },
  { key: "empty",       icon: "E",  label: "Empty Rows & Columns", desc: "Find completely empty data" },
  { key: "trim",        icon: "S",  label: "Text Cleanup",         desc: "Trim whitespace and normalize" },
  { key: "categories",  icon: "C",  label: "Category Standardize", desc: "Fix inconsistent casing/spacing" },
  { key: "outliers",    icon: "O",  label: "Outlier Detection",    desc: "Statistical IQR outlier detection" },
  { key: "types",       icon: "V",  label: "Data Type Validation", desc: "Detect mixed-type columns" },
];

const SEVERITY_COLORS = { high: "#FB7185", medium: "#FBBF24", low: "#34D399" };
const SEVERITY_BG     = { high: "rgba(251,113,133,0.1)", medium: "rgba(251,191,36,0.1)", low: "rgba(52,211,153,0.1)" };
const PRIORITY_COLORS = { high: "#FB7185", medium: "#FBBF24", low: "#34D399" };

const STEPS = [
  { label: "Uploading Dataset",          icon: "1" },
  { label: "Profiling Columns",          icon: "2" },
  { label: "Detecting Issues",           icon: "3" },
  { label: "Generating Recommendations", icon: "4" },
  { label: "Ready for Cleaning",         icon: "5" },
];

export default function DataCleaningTool({ onBack }) {
  const [file, setFile] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const [profile, setProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const [appliedFixes, setAppliedFixes] = useState([]);
  const [cleaning, setCleaning] = useState(null);
  const [cleanResult, setCleanResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [fixError, setFixError] = useState("");

  const [tab, setTab] = useState("overview");
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const fileRef = useRef();

  useEffect(() => {
    listSources().then(setSources).catch(() => []).finally(() => setLoadingSources(false));
  }, []);

  const handleSourceSelected = async (src) => {
    setSourceId(src.id);
    setFile({ name: src.name || `Source ${src.id}` });
    setProfile(null); setCleanResult(null); setAppliedFixes([]);
    setUploadError(""); setCurrentStep(1);
    await runProfile(src.id);
  };

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f); setSourceId(null); setProfile(null); setCleanResult(null);
    setAppliedFixes([]); setUploadError(""); setUploading(true); setCurrentStep(0);
    try {
      const res = await uploadAny(f);
      const id = res.source_id || res.id;
      setSourceId(id);
      setSources((prev) => [{ id, name: f.name, kind: f.name.split(".").pop(), row_count: res.source?.row_count }, ...prev]);
      setCurrentStep(1);
      await runProfile(id);
    } catch (e) { setUploadError(e.message); setCurrentStep(-1); } finally { setUploading(false); }
  };

  const runProfile = async (id) => {
    setAnalyzing(true); setCurrentStep(2);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep(3);
      const result = await profileDataset(id);
      setCurrentStep(4);
      setProfile(result);
      setTab("overview");
    } catch (e) { setUploadError(e.message); } finally { setAnalyzing(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const applyFix = useCallback(async (fixId) => {
    if (!sourceId) return;
    const newFixes = [...appliedFixes, fixId];
    setAppliedFixes(newFixes); setCleaning(fixId); setFixError("");
    try {
      const result = await applyCleanFixes(sourceId, newFixes);
      setCleanResult(result);
    } catch (e) { setFixError(`Fix failed: ${e.message}`); setAppliedFixes(appliedFixes); } finally { setCleaning(null); }
  }, [sourceId, appliedFixes]);

  const applyAllFixes = useCallback(async () => {
    if (!sourceId || !profile) return;
    const unique = [...new Set(profile.recommendations.map((r) => r.fix))];
    setAppliedFixes(unique); setCleaning("all"); setFixError("");
    try {
      const result = await applyCleanFixes(sourceId, unique);
      setCleanResult(result);
    } catch (e) { setFixError(`Auto-fix failed: ${e.message}`); setAppliedFixes([]); } finally { setCleaning(null); }
  }, [sourceId, profile]);

  const handleDownload = useCallback(async () => {
    if (!sourceId) return;
    setDownloading(true); setFixError("");
    try {
      const fixes = appliedFixes.length ? appliedFixes : profile.recommendations.map((r) => r.fix);
      await downloadCleanedFile(sourceId, [...new Set(fixes)]);
    } catch (e) { setFixError(`Download failed: ${e.message}`); } finally { setDownloading(false); }
  }, [sourceId, appliedFixes, profile]);

  const resetAll = () => {
    setFile(null); setSourceId(null); setProfile(null); setCleanResult(null);
    setAppliedFixes([]); setCurrentStep(-1); setUploadError(""); setTab("overview");
    setExpandedIssue(null); setSelectedRow(null);
  };

  /* ── Derived data ── */
  const issueChartData = profile ? Object.entries(profile.issues).map(([key, val]) => ({
    name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: val.total || val.count || 0,
  })).filter((d) => d.value > 0) : [];

  const colQualityData = profile ? Object.entries(profile.column_quality)
    .map(([col, q]) => ({ name: col.length > 14 ? col.slice(0, 14) + "…" : col, score: q.score, full: col }))
    .slice(0, 12) : [];

  const detectedFeatures = profile ? FEATURES.map((f) => {
    const map = {
      missing: "missing_values", duplicates: "duplicates", emails: "invalid_emails",
      phones: "invalid_phones", dates: "date_format", empty: "empty_rows",
      trim: "whitespace", categories: "category_inconsistency", outliers: "outliers", types: "type_mismatch",
    };
    const found = profile.issues[map[f.key]];
    return { ...f, found: !!found, count: found ? (found.total || found.count || 0) : 0 };
  }) : FEATURES.map((f) => ({ ...f, found: false, count: 0 }));

  const qb = profile?.quality_breakdown;
  const qualityBreakdownData = qb ? [
    { metric: "Completeness", score: qb.completeness },
    { metric: "Accuracy", score: qb.accuracy },
    { metric: "Consistency", score: qb.consistency },
    { metric: "Validity", score: qb.validity },
    { metric: "Uniqueness", score: qb.uniqueness },
  ] : [];

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "issues", label: `Issues (${profile?.total_issues || 0})` },
    { key: "problem_rows", label: `Problem Records (${profile?.problem_rows?.length || 0})` },
    { key: "recommendations", label: `AI Fixes (${profile?.recommendations?.length || 0})` },
    { key: "preview", label: "Data Preview" },
  ];

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink transition-colors">&larr; Back to Tools</button>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">AI Data Quality Platform</h2>
          <p className="text-sm text-muted mt-1">Upload your data and let AI detect, analyze, explain, and fix quality issues with row-level precision.</p>
        </div>
        {profile && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[11px] font-medium text-accent-emerald">AI Analysis Complete</span>
          </div>
        )}
      </div>

      {/* ── Source selection ── */}
      {!sourceId && !uploading && !analyzing && (
        <>
          <DatabaseConnector sources={sources} loadingSources={loadingSources} onSourceSelected={handleSourceSelected}>
            <div
              role="button" tabIndex={0} aria-label="Upload data file"
              onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              onClick={() => fileRef.current?.click()}
              className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-2 bg-surface-1 px-8 py-10 text-center transition-all hover:border-brand hover:bg-brand/[0.03] overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-25 bg-gradient-brand pointer-events-none group-hover:opacity-40 transition-opacity" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-lg font-bold text-[#050710] shadow-glow-sm font-display">FIX</div>
              <div className="relative">
                <p className="font-medium text-ink">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-2 mt-1">.csv, .xlsx, .json, .tsv, .parquet, .xml</p>
              </div>
              {uploadError && <p className="relative text-sm text-accent-rose">{uploadError}</p>}
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.tsv,.parquet,.xml" className="hidden" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }} />
            </div>
          </DatabaseConnector>
          <div>
            <p className="text-sm font-semibold text-ink mb-3">AI Detection Features</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
              {FEATURES.map((f) => (
                <div key={f.key} className="rounded-xl border border-border bg-surface-1 p-3.5 hover:border-border-2 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-[10px] font-bold font-mono text-brand border border-brand/20">{f.icon}</span>
                    <span className="text-xs font-semibold text-ink truncate">{f.label}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Scanning animation ── */}
      {(uploading || analyzing) && (
        <div className="rounded-2xl border border-border bg-surface-1 p-8">
          <div className="flex flex-col items-center gap-6">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-brand/30 border-t-brand" />
            <div className="w-full max-w-md space-y-3">
              {STEPS.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i <= currentStep ? "opacity-100" : "opacity-30"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ${
                    i < currentStep ? "bg-accent-emerald text-white" : i === currentStep ? "bg-brand text-[#050710] animate-pulse" : "bg-surface-3 text-muted-2"
                  }`}>{i < currentStep ? "✓" : s.icon}</span>
                  <span className={`text-sm ${i === currentStep ? "text-ink font-medium" : i < currentStep ? "text-accent-emerald" : "text-muted-2"}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Results Dashboard ═══ */}
      {profile && !uploading && !analyzing && (
        <>
          {/* File bar */}
          <div className="flex items-center justify-between rounded-xl border border-brand/25 bg-brand/[0.05] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 font-mono text-xs font-bold text-brand">CSV</div>
              <div>
                <p className="text-sm font-medium text-ink">{file?.name}</p>
                <p className="text-[11px] text-muted">{profile.total_rows.toLocaleString()} rows &times; {profile.total_columns} columns</p>
              </div>
            </div>
            <button onClick={resetAll} className="text-xs text-muted hover:text-accent-rose transition-colors">Change file</button>
          </div>

          {/* AI Executive Summary */}
          {profile.executive_summary && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-[10px] font-bold text-brand">AI</span>
                Executive Summary
              </h3>
              <p className="text-sm text-ink leading-relaxed">{profile.executive_summary.text}</p>
              {profile.executive_summary.major_findings?.length > 0 && (
                <ul className="space-y-1">
                  {profile.executive_summary.major_findings.map((f, i) => (
                    <li key={i} className="text-sm text-muted flex items-start gap-2">
                      <span className="text-accent-rose mt-0.5 text-xs shrink-0">&bull;</span>{f}
                    </li>
                  ))}
                </ul>
              )}
              {profile.executive_summary.estimated_post_clean_score && (
                <p className="text-xs text-accent-emerald font-medium">
                  Expected quality score after cleaning: {profile.executive_summary.estimated_post_clean_score}%
                </p>
              )}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryCard label="Total Rows" value={profile.total_rows.toLocaleString()} color="#22D3EE" />
            <SummaryCard label="Total Columns" value={profile.total_columns.toString()} color="#818CF8" />
            <SummaryCard label="Quality Score" value={`${profile.quality_score}%`} color={profile.quality_score >= 80 ? "#34D399" : profile.quality_score >= 50 ? "#FBBF24" : "#FB7185"} />
            <SummaryCard label="Issues Found" value={profile.total_issues.toLocaleString()} color={profile.total_issues > 0 ? "#FB923C" : "#34D399"} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
              >{t.label}</button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quality Score Breakdown */}
              {qualityBreakdownData.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface-1 p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Quality Score Breakdown</p>
                  <div className="space-y-3">
                    {qualityBreakdownData.map((d) => (
                      <div key={d.metric}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-ink">{d.metric}</span>
                          <span className="text-xs font-bold" style={{ color: d.score >= 90 ? "#34D399" : d.score >= 70 ? "#FBBF24" : "#FB7185" }}>{d.score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.score}%`, background: d.score >= 90 ? "#34D399" : d.score >= 70 ? "#FBBF24" : "#FB7185" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issue distribution pie */}
              {issueChartData.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface-1 p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Issue Distribution</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={issueChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3}
                        label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}>
                        {issueChartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Column quality bars */}
              {colQualityData.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface-1 p-5 lg:col-span-2">
                  <p className="text-sm font-semibold text-ink mb-4">Column Quality Scores</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={colQualityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8A94A8" }} interval={0} angle={-30} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8A94A8" }} />
                      <Tooltip />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {colQualityData.map((entry, i) => (
                          <Cell key={i} fill={entry.score >= 90 ? "#34D399" : entry.score >= 70 ? "#FBBF24" : "#FB7185"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Business Impact */}
              {profile.business_impact?.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface-1 p-5 lg:col-span-2">
                  <p className="text-sm font-semibold text-ink mb-3">Business Impact Analysis</p>
                  <div className="space-y-2">
                    {profile.business_impact.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: SEVERITY_BG[item.priority] || SEVERITY_BG.medium }}>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: PRIORITY_COLORS[item.priority], background: `${PRIORITY_COLORS[item.priority]}20` }}>
                          {item.priority}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-ink">{item.issue}</p>
                          <p className="text-xs text-muted mt-0.5">{item.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detection grid */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-ink mb-3">Detection Results</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                  {detectedFeatures.map((f) => (
                    <div key={f.key} className={`rounded-xl border p-3 transition-colors ${f.found ? "border-accent-rose/30 bg-accent-rose/[0.04]" : "border-border bg-surface-1"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-3 text-[9px] font-bold font-mono text-muted">{f.icon}</span>
                        {f.found
                          ? <span className="rounded-full bg-accent-rose/15 px-2 py-0.5 text-[10px] font-semibold text-accent-rose">{f.count}</span>
                          : <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">OK</span>}
                      </div>
                      <p className="text-[11px] font-medium text-ink truncate">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Issues (Interactive Explorer) ── */}
          {tab === "issues" && (
            <div className="space-y-3">
              {Object.entries(profile.issues).length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-surface-1 py-12 text-center">
                  <p className="text-lg font-semibold text-accent-emerald">No issues detected!</p>
                  <p className="text-sm text-muted mt-1">Your dataset looks clean.</p>
                </div>
              )}
              {Object.entries(profile.issues).map(([key, val]) => {
                const isExpanded = expandedIssue === key;
                const rowDetails = val.affected_rows;
                return (
                  <div key={key} className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
                    <button onClick={() => setExpandedIssue(isExpanded ? null : key)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-2/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-semibold text-ink">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-accent-rose/15 px-2.5 py-0.5 text-xs font-semibold text-accent-rose">
                          {val.total || val.count || 0} found
                        </span>
                        <span className={`text-muted text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>&darr;</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border p-5 space-y-4">
                        {/* Column breakdown */}
                        {val.columns && typeof val.columns === "object" && !Array.isArray(val.columns) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(val.columns).slice(0, 9).map(([col, info]) => (
                              <div key={col} className="rounded-lg bg-surface-2 px-3 py-2">
                                <p className="text-xs font-medium text-ink truncate">{col}</p>
                                <p className="text-[11px] text-muted">
                                  {typeof info === "number" ? `${info} issues` : typeof info === "object" ? `${info.count || ""} ${info.pct ? `(${info.pct}%)` : "issues"}` : String(info)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Affected rows detail */}
                        {rowDetails && typeof rowDetails === "object" && !Array.isArray(rowDetails) && Object.keys(rowDetails).length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-ink mb-2">Affected Records</p>
                            {Object.entries(rowDetails).map(([col, rows]) => (
                              <div key={col} className="mb-3">
                                <p className="text-[11px] font-medium text-brand mb-1">Column: {col}</p>
                                <div className="overflow-auto rounded-lg border border-border max-h-[200px]">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-surface-2 sticky top-0">
                                      <tr>
                                        <th className="px-3 py-1.5 text-left font-semibold text-muted">Row</th>
                                        <th className="px-3 py-1.5 text-left font-semibold text-muted">Value</th>
                                        {rows[0]?.problem && <th className="px-3 py-1.5 text-left font-semibold text-muted">Problem</th>}
                                        {rows[0]?.expected_range && <th className="px-3 py-1.5 text-left font-semibold text-muted">Expected Range</th>}
                                        {rows[0]?.severity && <th className="px-3 py-1.5 text-left font-semibold text-muted">Severity</th>}
                                        {rows[0]?.fixed && <th className="px-3 py-1.5 text-left font-semibold text-muted">Fixed</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => (
                                        <tr key={i} className="border-t border-border hover:bg-surface-1 cursor-pointer" onClick={() => setSelectedRow({ sourceId, row: r.row })}>
                                          <td className="px-3 py-1.5 text-ink font-mono">{r.row}</td>
                                          <td className="px-3 py-1.5 text-accent-rose font-mono">{r.value === null || r.value === undefined ? <span className="italic">NULL</span> : String(r.value)}</td>
                                          {r.problem && <td className="px-3 py-1.5 text-muted">{r.problem}</td>}
                                          {r.expected_range && <td className="px-3 py-1.5 text-muted">{r.expected_range}</td>}
                                          {r.severity && <td className="px-3 py-1.5"><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${r.severity === "extreme" ? "bg-accent-rose/15 text-accent-rose" : "bg-amber-100 text-amber-700"}`}>{r.severity}</span></td>}
                                          {r.fixed && <td className="px-3 py-1.5 text-accent-emerald">{r.fixed}</td>}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Affected row indices (for duplicates etc) */}
                        {rowDetails && Array.isArray(rowDetails) && rowDetails.length > 0 && typeof rowDetails[0] === "number" && (
                          <div>
                            <p className="text-xs font-semibold text-ink mb-1">Affected Rows</p>
                            <div className="flex flex-wrap gap-1">
                              {rowDetails.slice(0, 30).map((r) => (
                                <button key={r} onClick={() => setSelectedRow({ sourceId, row: r })}
                                  className="rounded bg-surface-2 px-2 py-0.5 text-[11px] font-mono text-ink hover:bg-brand/10 hover:text-brand transition-colors">
                                  Row {r}
                                </button>
                              ))}
                              {rowDetails.length > 30 && <span className="text-[11px] text-muted px-2 py-0.5">+{rowDetails.length - 30} more</span>}
                            </div>
                          </div>
                        )}

                        {/* Category inconsistency examples */}
                        {key === "category_inconsistency" && rowDetails && typeof rowDetails === "object" && (
                          <div>
                            <p className="text-xs font-semibold text-ink mb-1">Inconsistent Values</p>
                            {Object.entries(rowDetails).map(([col, examples]) => (
                              <div key={col} className="mb-2">
                                <p className="text-[11px] text-brand font-medium mb-1">{col}</p>
                                <div className="space-y-1">
                                  {examples.map((ex, i) => (
                                    <div key={i} className="text-xs text-muted">
                                      <span className="font-mono">{ex.normalized}</span> &rarr; {ex.variants?.join(", ")}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tab: Problem Records ── */}
          {tab === "problem_rows" && (
            <div className="space-y-3">
              {(!profile.problem_rows || profile.problem_rows.length === 0) && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-surface-1 py-12 text-center">
                  <p className="text-lg font-semibold text-accent-emerald">No problem rows!</p>
                </div>
              )}
              {profile.problem_rows?.length > 0 && (
                <div className="overflow-auto rounded-2xl border border-border bg-surface-1">
                  <table className="min-w-full text-xs">
                    <thead className="bg-surface-2 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold text-muted">Row</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-muted">Issues</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-muted">Problem Columns</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-muted">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.problem_rows.map((pr) => (
                        <tr key={pr.row} className="border-t border-border hover:bg-surface-1 cursor-pointer" onClick={() => setSelectedRow({ sourceId, row: pr.row, record: pr.record, problemCols: pr.problem_columns })}>
                          <td className="px-3 py-2 font-mono text-ink">{pr.row}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pr.issue_count > 2 ? "bg-accent-rose/15 text-accent-rose" : pr.issue_count > 1 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                              {pr.issue_count} {pr.issue_count > 1 ? "issues" : "issue"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted max-w-[200px] truncate">{pr.problem_columns.join(", ")}</td>
                          <td className="px-3 py-2 text-muted max-w-[300px] truncate">{pr.issues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Row Detail Modal ── */}
          {selectedRow && selectedRow.record && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRow(null)}>
              <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-1 p-6 shadow-xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-ink">Record Detail &mdash; Row {selectedRow.row}</h3>
                  <button onClick={() => setSelectedRow(null)} className="text-muted hover:text-ink text-lg">&times;</button>
                </div>
                <div className="space-y-1">
                  {Object.entries(selectedRow.record).map(([col, val]) => {
                    const isProblematic = selectedRow.problemCols?.includes(col);
                    return (
                      <div key={col} className={`flex justify-between rounded-lg px-3 py-2 ${isProblematic ? "bg-accent-rose/10 border border-accent-rose/20" : "bg-surface-2"}`}>
                        <span className="text-xs font-medium text-muted">{col}</span>
                        <span className={`text-xs font-mono ${isProblematic ? "text-accent-rose font-bold" : val === null ? "text-muted-2 italic" : "text-ink"}`}>
                          {val === null || val === undefined ? "NULL" : String(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: AI Fixes ── */}
          {tab === "recommendations" && (
            <div className="space-y-3">
              {fixError && <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-3 text-sm text-accent-rose">{fixError}</div>}
              {profile.recommendations.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={applyAllFixes} disabled={!!cleaning}
                    className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform">
                    {cleaning === "all" ? <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" /> Fixing All&hellip;</span> : "Apply All AI Fixes"}
                  </button>
                </div>
              )}
              {profile.recommendations.map((rec) => {
                const isApplied = appliedFixes.includes(rec.fix);
                return (
                  <div key={rec.id} className={`rounded-2xl border bg-surface-1 p-5 transition-all ${isApplied ? "border-accent-emerald/30 bg-accent-emerald/[0.03]" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEVERITY_BG[rec.severity], color: SEVERITY_COLORS[rec.severity] }}>{rec.severity}</span>
                          <span className="text-[11px] text-muted">Confidence: {rec.confidence}%</span>
                          {isApplied && <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">Applied</span>}
                        </div>
                        <h4 className="text-sm font-semibold text-ink">{rec.title}</h4>
                        <p className="text-xs text-muted leading-relaxed">{rec.description}</p>

                        {/* AI Root Cause */}
                        {rec.root_cause && (
                          <div className="rounded-lg bg-brand/5 border border-brand/10 px-3 py-2">
                            <p className="text-[11px] font-semibold text-brand mb-0.5">AI Root Cause Analysis</p>
                            <p className="text-[11px] text-muted">{rec.root_cause}</p>
                          </div>
                        )}

                        {/* Suggested value */}
                        {rec.suggested_value && (
                          <div className="rounded-lg bg-accent-emerald/5 border border-accent-emerald/15 px-3 py-2">
                            <p className="text-[11px] font-semibold text-accent-emerald mb-0.5">Suggested Fix</p>
                            <p className="text-[11px] text-ink">Value: <span className="font-mono font-bold">{rec.suggested_value}</span></p>
                            {rec.ai_reason && <p className="text-[11px] text-muted mt-0.5">{rec.ai_reason}</p>}
                          </div>
                        )}
                      </div>
                      {!isApplied && (
                        <button onClick={() => applyFix(rec.fix)} disabled={!!cleaning}
                          className="shrink-0 rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/15 disabled:opacity-50 transition-colors">
                          {cleaning === rec.fix ? <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> Fixing&hellip;</span> : rec.fix_label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {cleanResult && (
                <div className="rounded-2xl border border-accent-emerald/30 bg-accent-emerald/[0.04] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-emerald/15 text-xs font-bold text-accent-emerald">&check;</span>
                    <p className="text-sm font-semibold text-ink">Cleaning Applied</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-surface-1 border border-border p-3 text-center">
                      <p className="text-xs text-muted">Original Rows</p>
                      <p className="text-lg font-bold text-ink font-display">{cleanResult.original_rows.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-surface-1 border border-border p-3 text-center">
                      <p className="text-xs text-muted">Cleaned Rows</p>
                      <p className="text-lg font-bold text-accent-emerald font-display">{cleanResult.cleaned_rows.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-surface-1 border border-border p-3 text-center">
                      <p className="text-xs text-muted">Rows Removed</p>
                      <p className="text-lg font-bold text-accent-rose font-display">{cleanResult.rows_removed.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Data Preview ── */}
          {tab === "preview" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-ink">Original Data Preview</p>
                  <span className="text-[11px] text-muted">First {profile.preview.length} rows</span>
                </div>
                <DataTable data={profile.preview} columns={profile.columns} />
              </div>
              {cleanResult?.preview && (
                <div className="rounded-2xl border border-accent-emerald/25 bg-accent-emerald/[0.03] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-emerald/15 text-[10px] font-bold text-accent-emerald">&check;</span>
                      <p className="text-sm font-semibold text-ink">Cleaned Data Preview</p>
                    </div>
                    <span className="text-[11px] text-accent-emerald font-medium">{cleanResult.cleaned_rows.toLocaleString()} rows</span>
                  </div>
                  <DataTable data={cleanResult.preview} columns={cleanResult.columns} />
                </div>
              )}
            </div>
          )}

          {/* ── Action Bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex gap-2">
              <button onClick={() => runProfile(sourceId)} disabled={analyzing} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 disabled:opacity-40 transition-colors">
                Re-analyze
              </button>
            </div>
            <div className="flex gap-2">
              {cleanResult && (
                <button onClick={() => { setCleanResult(null); setAppliedFixes([]); }} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 transition-colors">
                  Undo Changes
                </button>
              )}
              <button onClick={handleDownload} disabled={downloading}
                className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform">
                {downloading ? "Downloading…" : "Download Cleaned File"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function SummaryCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 hover:border-border-2 transition-colors">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold font-display mt-1" style={{ color }}>{value}</p>
    </div>
  );
}

function DataTable({ data, columns }) {
  if (!data?.length) return <p className="text-sm text-muted-2 text-center py-4">No data to display</p>;
  const cols = columns || Object.keys(data[0]);
  return (
    <div className="overflow-auto rounded-lg border border-border max-h-[300px]">
      <table className="min-w-full text-xs">
        <thead className="bg-surface-2 sticky top-0 z-10">
          <tr>
            {cols.slice(0, 12).map((col) => (
              <th key={col} className="px-3 py-2 text-left font-semibold text-muted whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border hover:bg-surface-1">
              {cols.slice(0, 12).map((col) => (
                <td key={col} className="px-3 py-1.5 text-ink whitespace-nowrap max-w-[200px] truncate">
                  {row[col] === null || row[col] === undefined || row[col] === "" || row[col] === "nan" || row[col] === "None"
                    ? <span className="text-accent-rose/60 italic">null</span>
                    : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
