import { motion } from "framer-motion";

const TOOLS = [
  {
    key: "excel",
    icon: "📂",
    title: "Chat with Data",
    description: "Upload CSV, Excel, JSON, PDF, and more — ask questions in plain English.",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "pdf",
    icon: "PDF",
    title: "Chat with PDF",
    description: "Upload a PDF and ask questions about the document.",
    color: "bg-red-50 text-red-700",
  },
  {
    key: "sql",
    icon: "SQL",
    title: "SQL Analytics",
    description: "Connect a database and query it with AI.",
    color: "bg-sky-50 text-sky-700",
  },
  {
    key: "mongodb",
    icon: "🍃",
    title: "MongoDB Analytics",
    description: "Connect to MongoDB and query your collections with AI.",
    color: "bg-green-50 text-green-700",
  },
  {
    key: "dashboard",
    icon: "AI",
    title: "Dashboard Builder",
    description: "Build custom dashboards with drag-and-drop charts, KPIs, and templates.",
    color: "bg-violet-50 text-violet-700",
  },
  {
    key: "api",
    icon: "API",
    title: "API Analytics",
    description: "Connect any REST API and analyze the response data.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    key: "report",
    icon: "RPT",
    title: "Report Generator",
    description: "Generate a polished PDF report from your data.",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    key: "cleaning",
    icon: "FIX",
    title: "Data Cleaning",
    description: "Detect and fix messy, inconsistent, or duplicate data.",
    color: "bg-orange-50 text-orange-700",
  },
  {
    key: "export",
    icon: "OUT",
    title: "Export Center",
    description: "Export your results to CSV, Excel or PDF instantly.",
    color: "bg-teal-50 text-teal-700",
  },
];

export default function SourcesView({ onOpenTool }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">Sources & Tools</h2>
        <p className="mt-1 text-sm text-slate-500">Choose a tool to start working with your data.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -3 }}
      onClick={() => onOpen(tool.key)}
      className="group relative flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
    >
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${tool.color}`}>
        {tool.icon}
      </div>
      <h3 className="font-display text-base font-semibold text-slate-900">{tool.title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{tool.description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
        Open →
      </span>
    </motion.button>
  );
}
