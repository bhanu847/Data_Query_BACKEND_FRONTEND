import { useState, useEffect } from "react";
import { listSources, generateDashboard, deleteSource } from "../services/api";
import DashboardView from "../pages/DashboardView";

export default function DashboardTool({ onBack }) {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  const loadSources = () => {
    setLoadingSources(true);
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false));
  };

  useEffect(() => { loadSources(); }, []);

  const generate = async () => {
    if (!selectedSource) return;
    setError("");
    setGenerating(true);
    setDashboard(null);
    try {
      const res = await generateDashboard(selectedSource);
      setDashboard(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSource = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      if (selectedSource === id) setSelectedSource(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (dashboard) {
    return (
      <DashboardView
        dashboard={dashboard}
        onBack={() => setDashboard(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-slate-900">AI Dashboard Generator</h2>
        <p className="text-sm text-slate-500">Select an uploaded data source and generate a dashboard automatically.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Select a data source</h3>

        {loadingSources ? (
          <p className="text-sm text-slate-400 animate-pulse">Loading sources…</p>
        ) : sources.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 text-center">
            <p className="text-sm text-slate-500">No data sources yet.</p>
            <p className="mt-1 text-xs text-slate-400">Upload an Excel or CSV file first using "Chat with Data".</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sources.map((src) => (
              <div
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
                  selectedSource === src.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="font-medium flex-1 truncate">{src.name || `Source ${src.id}`}</span>
                <span className="text-xs text-slate-400">{src.kind || "file"}</span>
                <button
                  onClick={(e) => handleDeleteSource(src.id, e)}
                  className="shrink-0 rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Delete source"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={generate}
          disabled={!selectedSource || generating}
          className="rounded-xl bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {generating ? "Generating dashboard…" : "Generate Dashboard"}
        </button>

        {generating && (
          <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <span className="text-sm text-violet-700">AI is analyzing your data and building charts…</span>
          </div>
        )}
      </div>
    </div>
  );
}
