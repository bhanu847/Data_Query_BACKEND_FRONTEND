import { useState, useRef, useCallback } from "react";
import {
  uploadAny,
  profileDataset,
  applyCleanFixes,
  downloadCleanedFile,
} from "../services/api";
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

  const [profile, setProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const [appliedFixes, setAppliedFixes] = useState([]);
  const [cleaning, setCleaning] = useState(null);
  const [cleanResult, setCleanResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const [tab, setTab] = useState("overview");

  const fileRef = useRef();

  /* ── Upload & auto-profile ── */
  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setSourceId(null);
    setProfile(null);
    setCleanResult(null);
    setAppliedFixes([]);
    setUploadError("");
    setUploading(true);
    setCurrentStep(0);
    try {
      const res = await uploadAny(f);
      const id = res.source_id || res.id;
      setSourceId(id);
      setCurrentStep(1);
      await runProfile(id);
    } catch (e) {
      setUploadError(e.message);
      setCurrentStep(-1);
    } finally {
      setUploading(false);
    }
  };

  const runProfile = async (id) => {
    setAnalyzing(true);
    setCurrentStep(2);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStep(3);
      const result = await profileDataset(id);
      setCurrentStep(4);
      setProfile(result);
      setTab("overview");
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  /* ── Fix actions ── */
  const [fixError, setFixError] = useState("");

  const applyFix = useCallback(async (fixId) => {
    if (!sourceId) return;
    const newFixes = [...appliedFixes, fixId];
    setAppliedFixes(newFixes);
    setCleaning(fixId);
    setFixError("");
    try {
      const result = await applyCleanFixes(sourceId, newFixes);
      setCleanResult(result);
    } catch (e) {
      setFixError(`Fix failed: ${e.message}`);
      setAppliedFixes(appliedFixes);
    } finally { setCleaning(null); }
  }, [sourceId, appliedFixes]);

  const applyAllFixes = useCallback(async () => {
    if (!sourceId || !profile) return;
    const allFixes = profile.recommendations.map((r) => r.fix);
    const unique = [...new Set(allFixes)];
    setAppliedFixes(unique);
    setCleaning("all");
    setFixError("");
    try {
      const result = await applyCleanFixes(sourceId, unique);
      setCleanResult(result);
    } catch (e) {
      setFixError(`Auto-fix failed: ${e.message}`);
      setAppliedFixes([]);
    } finally { setCleaning(null); }
  }, [sourceId, profile]);

  const handleDownload = useCallback(async () => {
    if (!sourceId) return;
    setDownloading(true);
    setFixError("");
    try {
      const fixes = appliedFixes.length ? appliedFixes : profile.recommendations.map((r) => r.fix);
      await downloadCleanedFile(sourceId, [...new Set(fixes)]);
    } catch (e) {
      setFixError(`Download failed: ${e.message}`);
    } finally { setDownloading(false); }
  }, [sourceId, appliedFixes, profile]);

  const resetAll = () => {
    setFile(null); setSourceId(null); setProfile(null); setCleanResult(null);
    setAppliedFixes([]); setCurrentStep(-1); setUploadError(""); setTab("overview");
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
    const issueKey = map[f.key];
    const found = profile.issues[issueKey];
    return { ...f, found: !!found, count: found ? (found.total || found.count || 0) : 0 };
  }) : FEATURES.map((f) => ({ ...f, found: false, count: 0 }));

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink transition-colors">← Back to Tools</button>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">AI Data Cleaning Assistant</h2>
          <p className="text-sm text-muted mt-1">Upload your Excel or CSV file and let AI automatically detect, analyze, and fix data quality issues.</p>
        </div>
        {profile && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent-emerald/10 border border-accent-emerald/20 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[11px] font-medium text-accent-emerald">AI Analysis Complete</span>
          </div>
        )}
      </div>

      {/* ── Upload state ── */}
      {!sourceId && !uploading && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border-2 bg-surface-1 px-8 py-16 text-center transition-all hover:border-brand hover:bg-brand/[0.03] overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[50px] opacity-30 bg-gradient-brand pointer-events-none group-hover:opacity-50 transition-opacity" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand text-xl font-bold text-[#050710] shadow-glow-sm font-display">
              FIX
            </div>
            <div className="relative">
              <p className="font-display text-lg font-semibold text-ink">Drop your Excel or CSV file here</p>
              <p className="text-sm text-muted-2 mt-1">Supports .xlsx, .xls, and .csv files</p>
            </div>
            <button className="relative rounded-xl bg-surface-2 border border-border-2 px-5 py-2 text-sm font-semibold text-ink hover:bg-surface-3 transition-colors">
              Browse File
            </button>
            {uploadError && <p className="relative text-sm text-accent-rose">{uploadError}</p>}
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.tsv,.parquet,.xml" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {/* Feature cards */}
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
                <p className="text-[11px] text-muted">{profile.total_rows.toLocaleString()} rows × {profile.total_columns} columns</p>
              </div>
            </div>
            <button onClick={resetAll} className="text-xs text-muted hover:text-accent-rose transition-colors">Change file</button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryCard label="Total Rows" value={profile.total_rows.toLocaleString()} color="#22D3EE" />
            <SummaryCard label="Total Columns" value={profile.total_columns.toString()} color="#818CF8" />
            <SummaryCard label="Quality Score" value={`${profile.quality_score}%`} color={profile.quality_score >= 80 ? "#34D399" : profile.quality_score >= 50 ? "#FBBF24" : "#FB7185"} />
            <SummaryCard label="Issues Found" value={profile.total_issues.toLocaleString()} color={profile.total_issues > 0 ? "#FB923C" : "#34D399"} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-0">
            {[
              { key: "overview", label: "Overview" },
              { key: "issues", label: `Issues (${profile.total_issues})` },
              { key: "recommendations", label: `AI Fixes (${profile.recommendations.length})` },
              { key: "preview", label: "Data Preview" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                }`}
              >{t.label}</button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quality gauge */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5">
                <p className="text-sm font-semibold text-ink mb-4">Data Quality Score</p>
                <div className="flex items-center justify-center">
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={profile.quality_score >= 80 ? "#34D399" : profile.quality_score >= 50 ? "#FBBF24" : "#FB7185"}
                        strokeWidth="8" strokeLinecap="round" strokeDasharray={`${profile.quality_score * 2.64} 264`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-ink font-display">{profile.quality_score}</span>
                      <span className="text-xs text-muted">/ 100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Issue distribution pie */}
              {issueChartData.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface-1 p-5">
                  <p className="text-sm font-semibold text-ink mb-4">Issue Distribution</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={issueChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}>
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

              {/* Feature detection status */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5 lg:col-span-2">
                <p className="text-sm font-semibold text-ink mb-3">Detection Results</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                  {detectedFeatures.map((f) => (
                    <div key={f.key} className={`rounded-xl border p-3 transition-colors ${f.found ? "border-accent-rose/30 bg-accent-rose/[0.04]" : "border-border bg-surface-1"}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-3 text-[9px] font-bold font-mono text-muted">{f.icon}</span>
                        {f.found ? (
                          <span className="rounded-full bg-accent-rose/15 px-2 py-0.5 text-[10px] font-semibold text-accent-rose">{f.count}</span>
                        ) : (
                          <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">OK</span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-ink truncate">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Issues ── */}
          {tab === "issues" && (
            <div className="space-y-3">
              {Object.entries(profile.issues).length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-surface-1 py-12 text-center">
                  <p className="text-lg font-semibold text-accent-emerald">No issues detected!</p>
                  <p className="text-sm text-muted mt-1">Your dataset looks clean.</p>
                </div>
              )}
              {Object.entries(profile.issues).map(([key, val]) => (
                <div key={key} className="rounded-2xl border border-border bg-surface-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-ink">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h4>
                    <span className="rounded-full bg-accent-rose/15 px-2.5 py-0.5 text-xs font-semibold text-accent-rose">
                      {val.total || val.count || 0} found
                    </span>
                  </div>
                  {val.columns && typeof val.columns === "object" && !Array.isArray(val.columns) && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(val.columns).slice(0, 9).map(([col, info]) => (
                        <div key={col} className="rounded-lg bg-surface-2 px-3 py-2">
                          <p className="text-xs font-medium text-ink truncate">{col}</p>
                          <p className="text-[11px] text-muted">
                            {typeof info === "number" ? `${info} issues` : typeof info === "object" ? `${info.count || info.pct || info.raw_unique || ""} ${info.pct ? "%" : "issues"}` : String(info)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {val.columns && Array.isArray(val.columns) && (
                    <div className="flex flex-wrap gap-1.5">
                      {val.columns.map((c) => (
                        <span key={c} className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-ink">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Recommendations ── */}
          {tab === "recommendations" && (
            <div className="space-y-3">
              {fixError && (
                <div className="rounded-xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-3 text-sm text-accent-rose">{fixError}</div>
              )}
              {profile.recommendations.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={applyAllFixes}
                    disabled={!!cleaning}
                    className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform"
                  >
                    {cleaning === "all" ? (
                      <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" /> Fixing All…</span>
                    ) : "Auto Fix All Issues"}
                  </button>
                </div>
              )}
              {profile.recommendations.map((rec) => {
                const isApplied = appliedFixes.includes(rec.fix);
                return (
                  <div key={rec.id} className={`rounded-2xl border bg-surface-1 p-5 transition-all ${isApplied ? "border-accent-emerald/30 bg-accent-emerald/[0.03]" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEVERITY_BG[rec.severity], color: SEVERITY_COLORS[rec.severity] }}>
                            {rec.severity}
                          </span>
                          <span className="text-[11px] text-muted">Confidence: {rec.confidence}%</span>
                          {isApplied && <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">Applied</span>}
                        </div>
                        <h4 className="text-sm font-semibold text-ink">{rec.title}</h4>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{rec.description}</p>
                      </div>
                      {!isApplied && (
                        <button
                          onClick={() => applyFix(rec.fix)}
                          disabled={!!cleaning}
                          className="shrink-0 rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/15 disabled:opacity-50 transition-colors"
                        >
                          {cleaning === rec.fix ? (
                            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /> Fixing…</span>
                          ) : rec.fix_label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {cleanResult && (
                <div className="rounded-2xl border border-accent-emerald/30 bg-accent-emerald/[0.04] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-emerald/15 text-xs font-bold text-accent-emerald">✓</span>
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
              {/* Original data */}
              <div className="rounded-2xl border border-border bg-surface-1 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-ink">Original Data Preview</p>
                  <span className="text-[11px] text-muted">First {profile.preview.length} rows</span>
                </div>
                <DataTable data={profile.preview} columns={profile.columns} />
              </div>

              {/* Cleaned data */}
              {cleanResult?.preview && (
                <div className="rounded-2xl border border-accent-emerald/25 bg-accent-emerald/[0.03] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-emerald/15 text-[10px] font-bold text-accent-emerald">✓</span>
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
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform"
              >
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
            {cols.slice(0, 10).map((col) => (
              <th key={col} className="px-3 py-2 text-left font-semibold text-muted whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border hover:bg-surface-1">
              {cols.slice(0, 10).map((col) => (
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
