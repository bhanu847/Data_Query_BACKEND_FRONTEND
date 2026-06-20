const SECTIONS = [
  { key: "sources",    label: "Sources & Tools", badge: "SRC", color: "rgba(34,211,238,0.14)", textColor: "#22D3EE" },
  { key: "dashboards", label: "Dashboards",      badge: "DSH", color: "rgba(99,102,241,0.14)", textColor: "#818CF8" },
  { key: "reports",    label: "Reports",          badge: "RPT", color: "rgba(129,140,248,0.14)", textColor: "#A5B4FC" },
  { key: "history",    label: "History",           badge: "HST", color: "rgba(148,163,184,0.14)", textColor: "#CBD5E1" },
  { key: "settings",   label: "Settings",          badge: "SET", color: "rgba(148,163,184,0.14)", textColor: "#CBD5E1" },
];

export default function Sidebar({ active, onSelect, onNewAnalysis }) {
  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-border bg-[rgba(8,11,20,0.35)] p-3.5 md:flex md:flex-col gap-1.5">
      <button
        onClick={onNewAnalysis}
        className="flex items-center gap-2.5 w-full rounded-xl bg-gradient-brand px-3.5 py-2.5 text-sm font-semibold text-[#050710] shadow-[0_6px_20px_rgba(34,211,238,0.28)] hover:-translate-y-0.5 transition-transform mb-2.5"
      >
        <span className="text-[15px]">&#xFF0B;</span> New analysis
      </button>

      <nav className="space-y-0.5 flex-1">
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand/10 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span
                className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[11px] font-bold font-mono"
                style={{ background: s.color, color: s.textColor }}
              >
                {s.badge}
              </span>
              <span className="flex-1 text-left">{s.label}</span>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_#22D3EE]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl bg-accent-indigo/[0.08] border border-accent-indigo/20 p-3.5">
        <div className="text-[12.5px] font-semibold text-[#A5B0FF] mb-1">Free workspace</div>
        <div className="text-[11.5px] text-muted-2 leading-relaxed">3 of 5 sources used</div>
        <div className="h-[5px] rounded-full bg-surface-3 mt-2 overflow-hidden">
          <div className="w-3/5 h-full bg-gradient-brand rounded-full" />
        </div>
      </div>
    </aside>
  );
}
