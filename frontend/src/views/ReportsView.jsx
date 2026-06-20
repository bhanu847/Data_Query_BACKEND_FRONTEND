export default function ReportsView({ onOpenTool }) {
  return (
    <div className="max-w-[1180px] mx-auto animate-fade-in space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Reports</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">AI-generated PDF reports from your connected sources.</p>
        </div>
        <button
          onClick={() => onOpenTool("report")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-accent-indigo to-[#6366F1] px-4 py-2.5 text-[13.5px] font-semibold text-[#050710] shadow-[0_4px_18px_rgba(129,140,248,0.3)] hover:-translate-y-0.5 transition-transform"
        >
          &#xFF0B; Generate report
        </button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-1 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/30 flex items-center justify-center font-mono text-sm font-bold text-[#A5B4FC] mb-4">
          RPT
        </div>
        <p className="font-semibold text-ink">No reports yet</p>
        <p className="mt-1 text-sm text-muted">Generate a PDF report from any of your uploaded data sources.</p>
        <button
          onClick={() => onOpenTool("report")}
          className="mt-5 rounded-xl bg-gradient-to-br from-accent-indigo to-[#6366F1] px-5 py-2.5 text-sm font-semibold text-[#050710] hover:-translate-y-0.5 transition-transform"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
