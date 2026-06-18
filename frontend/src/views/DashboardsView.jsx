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
    try {
      await deleteDashboard(id);
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Dashboards</h2>
          <p className="mt-1 text-sm text-slate-500">Your saved dashboards.</p>
        </div>
        <button onClick={() => onOpenTool("dashboard")}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          + New Dashboard
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 animate-pulse">Loading dashboards...</p>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <span className="text-4xl">◫</span>
          <p className="mt-3 font-medium text-slate-600">No dashboards yet</p>
          <p className="mt-1 text-sm text-slate-400">Create your first dashboard from a data source.</p>
          <button onClick={() => onOpenTool("dashboard")}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
            Create Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((db) => (
            <div key={db.id}
              onClick={() => onOpenTool("dashboard")}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-brand/40 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base font-semibold text-slate-800 truncate">{db.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {db.config?.charts?.length || 0} charts · {db.config?.kpis?.length || 0} KPIs
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Updated {new Date(db.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={(e) => handleDelete(db.id, e)}
                  className="shrink-0 rounded p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {db.template && (
                <span className="mt-2 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-600">{db.template}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}