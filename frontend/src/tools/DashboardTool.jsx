import { useState, useEffect } from "react";
import { listSources, generateDashboard } from "../services/api";
//import DashboardView from "../views/DashboardView";
import DashboardView from "../pages/DashboardView";

export default function DashboardTool({ onBack }) {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false));
  }, []);

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
            <p className="mt-1 text-xs text-slate-400">Upload an Excel or CSV file first using "Chat with Excel".</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sources.map((src) => (
              <button
                key={src.id}
                onClick={() => setSelectedSource(src.id)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  selectedSource === src.id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="font-medium">{src.name || src.filename || `Source ${src.id}`}</span>
                <span className="ml-auto text-xs text-slate-400">{src.type || "file"}</span>
              </button>
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
