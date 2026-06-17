export default function ReportsView({ onOpenTool }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Generated PDF reports from your data.</p>
        </div>
        <button
          onClick={() => onOpenTool("report")}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          + New Report
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <span className="text-4xl">≡</span>
        <p className="mt-3 font-medium text-slate-600">No reports yet</p>
        <p className="mt-1 text-sm text-slate-400">Generate a PDF report from any of your uploaded data sources.</p>
        <button
          onClick={() => onOpenTool("report")}
          className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
