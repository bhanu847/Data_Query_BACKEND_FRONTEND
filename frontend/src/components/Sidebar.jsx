import { useState, useRef, useEffect } from "react";

const SECTIONS = [
  { key: "sources",    label: "Sources & Tools", badge: "SRC", color: "rgba(34,211,238,0.14)", textColor: "#22D3EE" },
  { key: "dashboards", label: "Dashboards",      badge: "DSH", color: "rgba(99,102,241,0.14)", textColor: "#818CF8" },
  { key: "reports",    label: "Reports",          badge: "RPT", color: "rgba(129,140,248,0.14)", textColor: "#A5B4FC" },
  { key: "history",    label: "History",           badge: "HST", color: "rgba(148,163,184,0.14)", textColor: "#CBD5E1" },
  { key: "settings",   label: "Settings",          badge: "SET", color: "rgba(148,163,184,0.14)", textColor: "#CBD5E1" },
];

const NEW_ANALYSIS_OPTIONS = [
  { key: "excel",     label: "Chat with Data",    badge: "CSV", color: "#34D399" },
  { key: "pdf",       label: "Chat with PDF",     badge: "PDF", color: "#FB7185" },
  { key: "sql",       label: "SQL Analytics",     badge: "SQL", color: "#38BDF8" },
  { key: "mongodb",   label: "MongoDB Analytics", badge: "DB",  color: "#4ADE80" },
  { key: "dashboard", label: "Dashboard Builder", badge: "BI",  color: "#A78BFA" },
  { key: "api",       label: "API Analytics",     badge: "API", color: "#FBBF24" },
];

export default function Sidebar({ active, onSelect, onNewAnalysis, sourceCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const maxSources = 5;
  const pct = Math.min((sourceCount / maxSources) * 100, 100);

  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-border bg-[rgba(8,11,20,0.35)] p-3.5 md:flex md:flex-col gap-1.5">
      <div className="relative mb-2.5" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={menuOpen}
          className="flex items-center gap-2.5 w-full rounded-xl bg-gradient-brand px-3.5 py-2.5 text-sm font-semibold text-[#050710] shadow-[0_6px_20px_rgba(34,211,238,0.28)] hover:-translate-y-0.5 transition-transform"
        >
          <span className="text-[15px]" aria-hidden="true">&#xFF0B;</span> New analysis
        </button>

        {menuOpen && (
          <div role="menu" aria-label="New analysis options" className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-border bg-[rgba(12,16,28,0.95)] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-1.5 animate-fade-in">
            {NEW_ANALYSIS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                role="menuitem"
                onClick={() => { setMenuOpen(false); onNewAnalysis(opt.key); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-2 transition-colors"
              >
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-md text-[9px] font-bold font-mono"
                  style={{ background: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40` }}
                >
                  {opt.badge}
                </span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
        <div className="text-[11.5px] text-muted-2 leading-relaxed">
          {sourceCount} of {maxSources} sources used
        </div>
        <div className="h-[5px] rounded-full bg-surface-3 mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-brand rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
