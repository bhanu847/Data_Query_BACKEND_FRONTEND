import { useState, useEffect } from "react";
import { getHistory, deleteHistoryItem, clearHistory } from "../services/api";

export default function HistoryView({ onOpenTool, onOpenChat }) {
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
    if (!confirm("Delete all history? This cannot be undone.")) return;
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

  const kindIcon = (kind) => {
    if (!kind) return "AI";
    if (kind === "excel" || kind === "csv" || kind === "tsv") return "XLS";
    if (kind === "pdf") return "PDF";
    if (kind === "json" || kind === "jsonl") return "JSON";
    if (kind === "mongodb") return "MDB";
    return kind.slice(0, 3).toUpperCase();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">History</h2>
          <p className="mt-1 text-sm text-slate-500">Your recent queries and analyses.</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {clearing ? "Clearing…" : "Clear All"}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <span className="text-4xl">⟳</span>
          <p className="mt-3 font-medium text-slate-600">No history yet</p>
          <p className="mt-1 text-sm text-slate-400">Your queries will appear here after you use any tool.</p>
        </div>
      )}

      {!loading && history.length > 0 && (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand/30 hover:bg-slate-50 transition-colors"
            >
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[10px] font-bold text-brand">
                {kindIcon(item.source_kind)}
              </div>

              {/* Content — clickable */}
              <button
                onClick={() => handleClickItem(item)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.question || "Query"}
                </p>
                {item.answer && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.answer.slice(0, 120)}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  {item.source_name || "Unknown source"}
                  {item.created_at && (
                    <>
                      {" · "}
                      {new Date(item.created_at).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </>
                  )}
                </p>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                title="Delete"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
