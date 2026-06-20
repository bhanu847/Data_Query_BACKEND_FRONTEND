import { useState, useEffect } from "react";
import { listDashboards, deleteDashboard } from "../services/api";

export default function DashboardsView({ onOpenTool }) {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listDashboards()
      .then(setDashboards)
      .catch(() => setDashboards([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this dashboard? This cannot be undone.")) return;
    try {
      await deleteDashboard(id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-[1180px] mx-auto animate-fade-in space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Dashboards</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">Live views built from your connected sources.</p>
        </div>
        <button
          onClick={() => onOpenTool("dashboard")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2.5 text-[13.5px] font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
        >
          &#xFF0B; New dashboard
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-1" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-1 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/30 flex items-center justify-center text-2xl text-accent-indigo mb-4">&#x25EB;</div>
          <p className="font-semibold text-ink">No dashboards yet</p>
          <p className="mt-1 text-sm text-muted">Create your first dashboard from a data source.</p>
          <button
            onClick={() => onOpenTool("dashboard")}
            className="mt-5 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
          >
            Create Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((db) => (
            <div
              key={db.id}
              onClick={() => onOpenTool("dashboard")}
              className="group relative rounded-[18px] border border-border bg-surface-1 p-5 text-left overflow-hidden cursor-pointer hover:border-accent-indigo/40 hover:-translate-y-1 transition-all"
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[38px] opacity-40 bg-accent-indigo/50 pointer-events-none" />
              <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[15.5px] font-semibold text-[#EEF2FB] truncate">{db.name}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {db.config?.charts?.length || 0} charts · {db.config?.kpis?.length || 0} KPIs
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-2">
                    Updated {new Date(db.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(db.id, e)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose transition-all"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {db.template && (
                <span className="relative mt-2 inline-block rounded-full bg-accent-violet/10 border border-accent-violet/25 px-2.5 py-0.5 text-[11px] font-semibold text-accent-violet">
                  {db.template}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
