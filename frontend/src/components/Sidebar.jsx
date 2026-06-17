// const SECTIONS = [
//   { key: "sources", label: "Sources", icon: "SRC" },
//   { key: "dashboards", label: "Dashboards", icon: "DB" },
//   { key: "reports", label: "Reports", icon: "RPT" },
//   { key: "history", label: "History", icon: "HIS" },
//   { key: "settings", label: "Settings", icon: "SET" },
// ];

// export default function Sidebar({ active, onSelect }) {
//   return (
//     <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/60 p-3 md:block">
//       <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
//         Explorer
//       </p>
//       <nav className="space-y-1">
//         {SECTIONS.map((section) => (
//           <button
//             key={section.key}
//             onClick={() => onSelect(section.key)}
//             className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
//               active === section.key ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-100"
//             }`}
//           >
//             <span className="w-7 text-[11px] font-semibold tracking-wide text-current/70">{section.icon}</span>
//             {section.label}
//           </button>
//         ))}
//       </nav>
//     </aside>
//   );
// }
const SECTIONS = [
  { key: "sources", label: "Sources", icon: "⊞" },
  { key: "dashboards", label: "Dashboards", icon: "◫" },
  { key: "reports", label: "Reports", icon: "≡" },
  { key: "history", label: "History", icon: "⟳" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/60 p-3 md:flex md:flex-col">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Explorer
      </p>
      <nav className="space-y-0.5">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            onClick={() => onSelect(section.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active === section.key
                ? "bg-brand-soft text-brand"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className="w-5 text-base leading-none">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}