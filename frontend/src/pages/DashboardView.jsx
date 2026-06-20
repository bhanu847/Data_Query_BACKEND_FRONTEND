import AutoChart from "../charts/AutoChart";

export default function DashboardView({ dashboard, onBack }) {
  if (!dashboard) return null;

  const kpis = dashboard.kpis || [];
  const charts = dashboard.charts || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{dashboard.title}</h2>
        {onBack && (
          <button onClick={onBack} className="text-sm text-muted hover:text-ink">
            ← Back
          </button>
        )}
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpis.map((kpi, i) => (
            <div key={`${kpi.label}-${i}`} className="rounded-2xl border border-border bg-surface-1 p-4 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-2">{kpi.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpi.value}</p>
              {kpi.delta && <p className="mt-1 text-xs text-accent-emerald">{kpi.delta}</p>}
            </div>
          ))}
        </div>
      )}

      {charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {charts.map((chart, index) => (
            <AutoChart key={`${chart.title || chart.type}-${index}`} spec={chart} />
          ))}
        </div>
      )}
    </div>
  );
}
