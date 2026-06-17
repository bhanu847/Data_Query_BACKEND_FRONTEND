// import AutoChart from "../charts/AutoChart";

// export default function DashboardView({ dashboard, onBack }) {
//   if (!dashboard) return null;

//   const kpis = dashboard.kpis || [];
//   const charts = dashboard.charts || [];

//   return (
//     <div className="space-y-5">
//       <div className="flex items-center justify-between">
//         <h2 className="font-display text-xl font-semibold">{dashboard.title}</h2>
//         {onBack && (
//           <button
//             onClick={onBack}
//             className="text-sm text-slate-600 hover:text-ink"
//           >
//             ← Back
//           </button>
//         )}
//       </div>

//       <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
//         {kpis.map((kpi) => (
//           <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
//             <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
//             <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpi.value}</p>
//             {kpi.delta && <p className="mt-1 text-xs text-emerald-600">{kpi.delta}</p>}
//           </div>
//         ))}
//       </div>

//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//         {charts.map((chart, index) => (
//           <AutoChart key={`${chart.title || chart.type}-${index}`} spec={chart} />
//         ))}
//       </div>

//       {dashboard.insights?.length > 0 && (
//         <div className="rounded-2xl border border-slate-200 bg-brand-soft p-5">
//           <h3 className="mb-2 font-display text-sm font-semibold text-brand-dark">AI Insights</h3>
//           <ul className="space-y-1.5 text-sm text-slate-700">
//             {dashboard.insights.map((insight, index) => (
//               <li key={`${insight}-${index}`} className="flex gap-2">
//                 <span className="text-brand">-</span>
//                 {insight}
//               </li>
//             ))}
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }
//import AutoChart from "./AutoChart";
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
          <button
            onClick={onBack}
            className="text-sm text-slate-600 hover:text-ink"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{kpi.value}</p>
            {kpi.delta && <p className="mt-1 text-xs text-emerald-600">{kpi.delta}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {charts.map((chart, index) => (
          <AutoChart key={`${chart.title || chart.type}-${index}`} spec={chart} />
        ))}
      </div>

      {dashboard.insights?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-brand-soft p-5">
          <h3 className="mb-2 font-display text-sm font-semibold text-brand-dark">AI Insights</h3>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {dashboard.insights.map((insight, index) => (
              <li key={`${insight}-${index}`} className="flex gap-2">
                <span className="text-brand">-</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
