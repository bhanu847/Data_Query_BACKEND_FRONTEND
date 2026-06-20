import { motion } from "framer-motion";

const TOOLS = [
  {
    key: "excel", badge: "CSV", title: "Chat with Data",
    description: "Upload CSV, Excel, JSON, PDF and ask questions in plain English.",
    accent: "#34D399", iconBg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", glow: "rgba(52,211,153,0.4)", cta: "Open chat",
  },
  {
    key: "pdf", badge: "PDF", title: "Chat with PDF",
    description: "Upload a PDF and ask questions about the document.",
    accent: "#FB7185", iconBg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.35)", glow: "rgba(251,113,133,0.4)", cta: "Upload PDF",
  },
  {
    key: "sql", badge: "SQL", title: "SQL Analytics",
    description: "Connect a database and query it with AI.",
    accent: "#38BDF8", iconBg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)", glow: "rgba(56,189,248,0.4)", cta: "Connect DB",
  },
  {
    key: "mongodb", badge: "DB", title: "MongoDB Analytics",
    description: "Connect to MongoDB and query your collections with AI.",
    accent: "#4ADE80", iconBg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.35)", glow: "rgba(74,222,128,0.4)", cta: "Connect DB",
  },
  {
    key: "dashboard", badge: "BI", title: "Dashboard Builder",
    description: "Build dashboards with drag-and-drop charts, KPIs and templates.",
    accent: "#A78BFA", iconBg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)", glow: "rgba(167,139,250,0.4)", cta: "Start building",
  },
  {
    key: "api", badge: "API", title: "API Analytics",
    description: "Connect any REST API and analyze the response data.",
    accent: "#FBBF24", iconBg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", glow: "rgba(251,191,36,0.4)", cta: "Connect API",
  },
  {
    key: "report", badge: "RPT", title: "Report Generator",
    description: "Generate a polished PDF report from your data.",
    accent: "#818CF8", iconBg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)", glow: "rgba(129,140,248,0.4)", cta: "Upload data",
  },
  {
    key: "cleaning", badge: "FIX", title: "Data Cleaning",
    description: "Detect and fix messy, inconsistent or duplicate data.",
    accent: "#FB923C", iconBg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)", glow: "rgba(251,146,60,0.4)", cta: "Upload data",
  },
  {
    key: "export", badge: "OUT", title: "Export Center",
    description: "Export your results to CSV, Excel or PDF instantly.",
    accent: "#2DD4BF", iconBg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.35)", glow: "rgba(45,212,191,0.4)", cta: "Open export",
  },
];

export default function SourcesView({ onOpenTool }) {
  return (
    <div className="max-w-[1180px] mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-bold tracking-tight">Sources & Tools</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">Choose a tool to connect a source and start working with your data.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((tool, i) => (
          <ToolCard key={tool.key} tool={tool} index={i} onOpen={onOpenTool} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool, index, onOpen }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
      whileHover={{ y: -4, borderColor: tool.border, boxShadow: `0 14px 40px rgba(0,0,0,0.4), 0 0 0 1px ${tool.border}` }}
      onClick={() => onOpen(tool.key)}
      className="tool-card group relative flex w-full flex-col rounded-[18px] bg-surface-1 border border-border p-5 text-left overflow-hidden transition-all"
    >
      {/* Glow blob */}
      <div
        className="absolute -top-10 -right-10 w-[130px] h-[130px] rounded-full blur-[40px] opacity-50 pointer-events-none"
        style={{ background: tool.glow }}
      />

      {/* Badge */}
      <div
        className="relative flex h-[46px] w-[46px] items-center justify-center rounded-[13px] font-mono text-sm font-bold"
        style={{ background: tool.iconBg, color: tool.accent, border: `1px solid ${tool.border}`, boxShadow: `0 0 20px ${tool.glow}` }}
      >
        {tool.badge}
      </div>

      <h3 className="relative font-display text-[16.5px] font-semibold text-[#EEF2FB] mt-4">{tool.title}</h3>
      <p className="relative text-[13.5px] leading-relaxed text-muted mt-1.5 flex-1">{tool.description}</p>

      <span
        className="relative inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold"
        style={{ color: tool.accent }}
      >
        {tool.cta} <span className="text-sm">&#x2192;</span>
      </span>
    </motion.button>
  );
}
