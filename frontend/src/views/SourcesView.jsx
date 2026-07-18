import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { listSources, listDashboards, getHistory, deleteSource } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import useConfirm from "../hooks/useConfirm";

/* ═══════════════════════════════════════════════════════════════════
   TOOL DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */

const TOOLS = [
  { key: "excel",     badge: "CSV", title: "Chat with Data",    desc: "Ask questions in plain English",           example: '"Top selling products last month?"',  accent: "#34D399", glow: "rgba(52,211,153,0.4)", cta: "Open chat" },
  { key: "pdf",       badge: "PDF", title: "Chat with PDF",     desc: "Upload a PDF and ask questions",           example: '"Summarize this contract"',            accent: "#FB7185", glow: "rgba(251,113,133,0.4)", cta: "Upload PDF" },
  { key: "sql",       badge: "SQL", title: "SQL Analytics",     desc: "Connect a database and query with AI",     example: '"Revenue by region this quarter"',     accent: "#38BDF8", glow: "rgba(56,189,248,0.4)", cta: "Connect DB" },
  { key: "mongodb",   badge: "DB",  title: "MongoDB Analytics", desc: "Query MongoDB collections with AI",        example: '"Find users who signed up this week"', accent: "#4ADE80", glow: "rgba(74,222,128,0.4)", cta: "Connect" },
  { key: "dashboard", badge: "BI",  title: "Dashboard Builder", desc: "Drag-and-drop charts, KPIs & templates",   example: '"Build a sales performance dashboard"',accent: "#A78BFA", glow: "rgba(167,139,250,0.4)", cta: "Start building" },
  { key: "api",       badge: "API", title: "API Analytics",     desc: "Connect any REST API and analyze data",     example: '"Analyze this endpoint response"',     accent: "#FBBF24", glow: "rgba(251,191,36,0.4)", cta: "Connect API" },
  { key: "report",    badge: "RPT", title: "Report Generator",  desc: "AI-powered executive reports with charts",  example: '"Generate a quarterly summary"',       accent: "#818CF8", glow: "rgba(129,140,248,0.4)", cta: "Create report" },
  { key: "cleaning",  badge: "FIX", title: "Data Cleaning",     desc: "Detect and fix data quality issues",        example: '"Find missing values and outliers"',   accent: "#FB923C", glow: "rgba(251,146,60,0.4)", cta: "Upload data" },
  { key: "export",    badge: "OUT", title: "Export Center",      desc: "Export results to CSV, Excel or PDF",       example: '"Download cleaned dataset"',           accent: "#2DD4BF", glow: "rgba(45,212,191,0.4)", cta: "Open export" },
  { key: "excel-live", badge: "XLS", title: "Excel Live",        desc: "Work on your open Excel files with AI",     example: '"Add a profit margin column to my sheet"', accent: "#22D3EE", glow: "rgba(34,211,238,0.4)", cta: "Connect Excel", route: "/tools/excel-live" },
];

const QUICK_ACTIONS = [
  { key: "excel",     label: "Upload Dataset",    icon: "↑", color: "#34D399" },
  { key: "dashboard", label: "Create Dashboard",  icon: "□", color: "#A78BFA" },
  { key: "report",    label: "Generate Report",   icon: "◩", color: "#818CF8" },
  { key: "sql",       label: "Connect Database",  icon: "⊞", color: "#38BDF8" },
  { key: "cleaning",  label: "Clean Data",        icon: "◇", color: "#FB923C" },
  { key: "api",       label: "Connect API",       icon: "⟡", color: "#FBBF24" },
];

const KIND_BADGE = {
  csv: "CSV", excel: "XLS", json: "JSON", pdf: "PDF", tsv: "TSV",
  parquet: "PAR", mongodb: "DB", sql: "SQL", xml: "XML", text: "TXT",
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function SourcesView({ onOpenTool }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm, modalProps } = useConfirm();
  const [stats, setStats] = useState({ sources: 0, dashboards: 0, queries: 0, sourceList: [], dashboardList: [], historyList: [] });
  const [loading, setLoading] = useState(true);
  const [copilotQuery, setCopilotQuery] = useState("");

  useEffect(() => {
    Promise.all([
      listSources().catch(() => []),
      listDashboards().catch(() => []),
      getHistory().catch(() => []),
    ]).then(([sources, dashboards, history]) => {
      setStats({
        sources: sources.length,
        dashboards: dashboards.length,
        queries: history.length,
        sourceList: sources.slice(0, 5),
        dashboardList: dashboards.slice(0, 3),
        historyList: history.slice(0, 5),
      });
      setLoading(false);
    });
  }, []);

  const [deleting, setDeleting] = useState(null);

  const handleDeleteSource = async (srcId) => {
    const ok = await confirm({ title: "Delete Dataset", message: "This dataset and all its data will be permanently deleted. This action cannot be undone." });
    if (!ok) return;
    setDeleting(srcId);
    try {
      await deleteSource(srcId);
      setStats((prev) => ({
        ...prev,
        sources: prev.sources - 1,
        sourceList: prev.sourceList.filter((s) => s.id !== srcId),
      }));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const handleCopilotSubmit = (e) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    onOpenTool("excel");
  };

  return (
    <div className="max-w-[1280px] mx-auto animate-fade-in space-y-7">
      <ConfirmModal {...modalProps} />

      {/* ──── Hero + Copilot ──── */}
      <div className="relative rounded-2xl border border-border bg-surface-1 p-6 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-[70px] opacity-25 bg-gradient-brand pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full blur-[60px] opacity-15 bg-accent-indigo pointer-events-none" />

        <div className="relative">
          <h1 className="font-display text-[26px] font-bold tracking-tight">
            {greeting}, <span className="text-brand">{firstName}</span>
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Analyze data, generate insights, build dashboards, and automate reporting with AI.
          </p>

          {/* AI Copilot Input */}
          <form onSubmit={handleCopilotSubmit} className="mt-5 flex gap-2">
            <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border px-4 py-2.5 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 transition-all">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-brand text-[9px] font-bold text-[#050710] shrink-0">AI</span>
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask AI anything — &quot;What insights exist in my sales data?&quot;"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
            >
              Ask AI
            </button>
          </form>
        </div>
      </div>

      {/* ──── KPI Cards ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Datasets" value={loading ? "—" : stats.sources} icon="◫" color="#22D3EE" />
        <KpiCard label="Dashboards" value={loading ? "—" : stats.dashboards} icon="▦" color="#818CF8" />
        <KpiCard label="Queries" value={loading ? "—" : stats.queries} icon="◈" color="#34D399" />
        <KpiCard label="Tools Available" value={String(TOOLS.length)} icon="⟐" color="#FB923C" />
      </div>

      {/* ──── Quick Actions ──── */}
      <div>
        <p className="text-sm font-semibold text-ink mb-3">Quick Actions</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.key}
              onClick={() => onOpenTool(qa.key)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-1 p-3.5 hover:border-border-2 hover:-translate-y-0.5 transition-all"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-transform group-hover:scale-110"
                style={{ background: `${qa.color}15`, color: qa.color, border: `1px solid ${qa.color}30` }}
              >
                {qa.icon}
              </span>
              <span className="text-[11px] font-medium text-muted group-hover:text-ink transition-colors text-center leading-tight">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ──── Recent Activity + Datasets Side-by-Side ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Recent Activity */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-surface-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">Recent Activity</p>
            <button onClick={() => {}} className="text-xs text-brand hover:text-brand/80 font-medium transition-colors">View all</button>
          </div>
          {loading ? (
            <div className="space-y-2.5">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-surface-2 animate-pulse" />)}</div>
          ) : stats.historyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted">No activity yet</p>
              <p className="text-xs text-muted-2 mt-1">Start by uploading a dataset or connecting a database.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.historyList.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-[9px] font-bold font-mono text-brand border border-brand/20">
                    {KIND_BADGE[item.source_kind] || "AI"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{item.question || "Query"}</p>
                    <p className="text-[11px] text-muted-2 truncate">{item.source_name || "Source"} · {relativeTime(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Datasets */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink">Datasets</p>
            <button onClick={() => onOpenTool("excel")} className="text-xs text-brand hover:text-brand/80 font-medium transition-colors">Upload new</button>
          </div>
          {loading ? (
            <div className="space-y-2.5">{[1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-surface-2 animate-pulse" />)}</div>
          ) : stats.sourceList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted">No datasets</p>
              <p className="text-xs text-muted-2 mt-1">Upload your first file to get started.</p>
              <button onClick={() => onOpenTool("excel")} className="mt-3 rounded-xl bg-brand/10 border border-brand/25 px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors">
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {stats.sourceList.map((src) => (
                <div key={src.id} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-2 transition-colors">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-emerald/10 text-[9px] font-bold font-mono text-accent-emerald border border-accent-emerald/20">
                    {KIND_BADGE[src.kind] || "F"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{src.name}</p>
                    <p className="text-[11px] text-muted-2">
                      {src.row_count ? `${src.row_count.toLocaleString()} rows` : src.kind || "file"}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete ${src.name}`}
                    onClick={() => handleDeleteSource(src.id)}
                    disabled={deleting === src.id}
                    className="shrink-0 rounded-lg p-1.5 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose disabled:opacity-50 transition-all"
                  >
                    {deleting === src.id ? (
                      <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-rose/30 border-t-accent-rose" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ──── Dashboards Row ──── */}
      {!loading && stats.dashboardList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Recent Dashboards</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.dashboardList.map((d) => (
              <button
                key={d.id}
                onClick={() => onOpenTool("dashboard")}
                className="group rounded-2xl border border-border bg-surface-1 p-4 text-left hover:border-accent-indigo/30 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo/10 text-[9px] font-bold font-mono text-[#A5B4FC] border border-accent-indigo/20">BI</span>
                  <span className="text-sm font-semibold text-ink truncate">{d.name}</span>
                </div>
                <p className="text-xs text-muted">
                  {d.config?.charts?.length || 0} charts · {d.config?.kpis?.length || 0} KPIs
                </p>
                <span className="mt-2 inline-flex text-xs font-medium text-accent-indigo opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ──── Tools Grid ──── */}
      <div>
        <p className="text-sm font-semibold text-ink mb-3">All Tools</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {TOOLS.map((tool, i) => (
            <ToolCard
              key={tool.key}
              tool={tool}
              index={i}
              onOpen={(key) => (tool.route ? navigate(tool.route) : onOpenTool(key))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function KpiCard({ label, value, icon, color }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 hover:border-border-2 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted font-medium">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-sm" style={{ background: `${color}12`, color }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold font-display" style={{ color }}>{value}</p>
    </div>
  );
}

function ToolCard({ tool, index, onOpen }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
      whileHover={{ y: -3, borderColor: `${tool.accent}50` }}
      onClick={() => onOpen(tool.key)}
      className="tool-card group relative flex w-full flex-col rounded-[18px] bg-surface-1 border border-border p-5 text-left overflow-hidden transition-all"
    >
      <div className="absolute -top-8 -right-8 w-[100px] h-[100px] rounded-full blur-[35px] opacity-40 pointer-events-none" style={{ background: tool.glow }} />

      <div className="relative flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl font-mono text-[11px] font-bold"
          style={{ background: `${tool.accent}14`, color: tool.accent, border: `1px solid ${tool.accent}30`, boxShadow: `0 0 16px ${tool.glow}` }}
        >
          {tool.badge}
        </div>
        <div>
          <h3 className="font-display text-[15px] font-semibold text-[#EEF2FB]">{tool.title}</h3>
          <p className="text-[12px] text-muted">{tool.desc}</p>
        </div>
      </div>

      <p className="relative text-[12px] text-muted-2 italic mb-3 line-clamp-1">{tool.example}</p>

      <span className="relative inline-flex items-center gap-1.5 text-[12px] font-semibold mt-auto" style={{ color: tool.accent }}>
        {tool.cta} <span className="text-sm">→</span>
      </span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════ */

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
