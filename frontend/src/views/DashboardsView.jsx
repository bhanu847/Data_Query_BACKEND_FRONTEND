import { useState, useEffect } from "react";
//import DashboardView from "./DashboardView";
import DashboardView from "../pages/DashboardView";

export default function DashboardsView({ onOpenTool }) {
  // Dashboards would normally be fetched from the API.
  // For now we show an empty state that directs users to create one.
  const [dashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(null);

  if (activeDashboard) {
    return <DashboardView dashboard={activeDashboard} onBack={() => setActiveDashboard(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Dashboards</h2>
          <p className="mt-1 text-sm text-slate-500">Your saved AI-generated dashboards.</p>
        </div>
        <button
          onClick={() => onOpenTool("dashboard")}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New Dashboard
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <span className="text-4xl">◫</span>
          <p className="mt-3 font-medium text-slate-600">No dashboards yet</p>
          <p className="mt-1 text-sm text-slate-400">Generate your first dashboard from a data source.</p>
          <button
            onClick={() => onOpenTool("dashboard")}
            className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Create Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((db, i) => (
            <button
              key={db.id || i}
              onClick={() => setActiveDashboard(db)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-brand/40 hover:shadow-md transition-all"
            >
              <p className="font-display text-base font-semibold text-slate-800">{db.title}</p>
              <p className="mt-1 text-sm text-slate-500">{db.charts?.length || 0} charts · {db.kpis?.length || 0} KPIs</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
