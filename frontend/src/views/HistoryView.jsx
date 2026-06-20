import { useState, useEffect } from "react";
import { getHistory, deleteHistoryItem, clearHistory } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import useConfirm from "../hooks/useConfirm";

const KIND_STYLES = {
  excel:   { badge: "CSV", accent: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  csv:     { badge: "CSV", accent: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  tsv:     { badge: "TSV", accent: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)" },
  pdf:     { badge: "PDF", accent: "#FB7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)" },
  json:    { badge: "JSON",accent: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)" },
  jsonl:   { badge: "JSON",accent: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)" },
  mongodb: { badge: "DB",  accent: "#4ADE80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)" },
  sql:     { badge: "SQL", accent: "#38BDF8", bg: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.3)" },
  api:     { badge: "API", accent: "#FBBF24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)" },
};
const DEFAULT_STYLE = { badge: "AI", accent: "#22D3EE", bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)" };

export default function HistoryView({ onOpenTool, onOpenChat }) {
  const { confirm, modalProps } = useConfirm();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    getHistory()
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleClearAll = async () => {
    const ok = await confirm({ title: "Clear All History", message: "All your query history will be permanently deleted. This action cannot be undone." });
    if (!ok) return;
    setClearing(true);
    try {
      await clearHistory();
      setHistory([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setClearing(false);
    }
  };

  const handleClickItem = (item) => {
    if (onOpenChat && item.source_id) {
      onOpenChat({
        sourceId: item.source_id,
        sourceName: item.source_name,
        sourceKind: item.source_kind,
        question: item.question,
        answer: item.answer,
      });
    }
  };

  const getKindStyle = (kind) => KIND_STYLES[kind] || DEFAULT_STYLE;

  const relativeTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="max-w-[1180px] mx-auto animate-fade-in space-y-6">
      <ConfirmModal {...modalProps} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight">History</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">Resume any past conversation — picks up right where you left off.</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="rounded-xl border border-accent-rose/25 bg-accent-rose/10 px-3.5 py-1.5 text-xs font-semibold text-accent-rose hover:bg-accent-rose/20 disabled:opacity-50 transition-colors"
          >
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-surface-1" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-accent-rose/25 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-1 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center text-2xl text-muted mb-4">&#x27F3;</div>
          <p className="font-semibold text-ink">No history yet</p>
          <p className="mt-1 text-sm text-muted">Your queries will appear here after you use any tool.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {history.map((item) => {
            const style = getKindStyle(item.source_kind);
            return (
              <button
                key={item.id}
                onClick={() => handleClickItem(item)}
                className="group flex items-center gap-4 text-left rounded-[15px] bg-surface-1 border border-border p-4 hover:border-brand/35 hover:bg-brand/[0.04] transition-all"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-bold"
                  style={{ background: style.bg, color: style.accent, border: `1px solid ${style.border}` }}
                >
                  {style.badge}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#EEF2FB] truncate">
                    {item.question || "Query"}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-muted truncate">
                    {item.source_name || "Unknown source"} · {relativeTime(item.created_at)}
                  </p>
                </div>

                <span className="shrink-0 text-[12.5px] font-semibold text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  Resume &#x2192;
                </span>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  className="shrink-0 rounded-lg p-1.5 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose transition-all"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
