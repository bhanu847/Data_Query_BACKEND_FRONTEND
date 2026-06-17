import { useState, useEffect } from "react";
//import { getHistory } from "../api/api";
import { getHistory } from "../services/api";

export default function HistoryView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">History</h2>
        <p className="mt-1 text-sm text-slate-500">Your recent queries and analyses.</p>
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
          Failed to load history: {error}
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
        <div className="space-y-3">
          {history.map((item, i) => (
            <div
              key={item.id || i}
              className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
                {item.type === "excel" ? "XLS" : item.type === "pdf" ? "PDF" : item.type === "sql" ? "SQL" : "AI"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.question || item.query || "Query"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.source_name || item.source_id || "Unknown source"}
                  {item.created_at && (
                    <> · {new Date(item.created_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {item.status || "done"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
