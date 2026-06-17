// import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import Navbar from "../components/Navbar";
// import ToolCard from "../components/ToolCard";
// import { useAuth } from "../contexts/AuthContext";

// const TOOLS = [
//   { icon: "PDF", title: "Chat with PDF", description: "Upload a PDF and ask questions about the document.", badge: "Soon" },
//   { icon: "XLS", title: "Chat with Excel", description: "Ask questions from Excel and CSV files in plain English." },
//   { icon: "SQL", title: "SQL Analytics", description: "Connect a database and query it with AI.", badge: "Soon" },
//   { icon: "AI", title: "AI Dashboard Generator", description: "Turn any dataset into a dashboard automatically." },
//   { icon: "API", title: "API Analytics", description: "Connect any REST API and analyze the data.", badge: "Soon" },
//   { icon: "PDF", title: "Report Generator", description: "Generate a polished PDF report from your data." },
//   { icon: "FIX", title: "Data Cleaning", description: "Detect and fix messy data automatically.", badge: "Soon" },
//   { icon: "OUT", title: "Export Center", description: "Export results to CSV, Excel and PDF." },
// ];

// export default function Landing() {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const go = () => navigate(user ? "/app" : "/signup");

//   return (
//     <div className="min-h-screen bg-white">
//       <Navbar />

//       <section className="hero-grid border-b border-slate-200">
//         <div className="mx-auto max-w-4xl px-5 py-20 text-center">
//           <motion.h1
//             initial={{ opacity: 0, y: 16 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5 }}
//             className="font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl"
//           >
//             Ask Your Data Anything
//           </motion.h1>
//           <motion.p
//             initial={{ opacity: 0, y: 16 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5, delay: 0.1 }}
//             className="mx-auto mt-5 max-w-2xl text-lg text-slate-500"
//           >
//             Connect Excel, PDF, SQL, APIs and databases. Use AI to generate
//             dashboards, insights and reports instantly.
//           </motion.p>
//           <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
//             <button
//               onClick={go}
//               className="rounded-xl bg-brand px-6 py-3 font-medium text-white shadow-card hover:bg-brand-dark"
//             >
//               Upload File
//             </button>
//             <button
//               onClick={go}
//               className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium hover:bg-slate-50"
//             >
//               Connect Database
//             </button>
//           </div>
//         </div>
//       </section>

//       <section className="mx-auto max-w-7xl px-5 py-16">
//         <h2 className="mb-2 font-display text-2xl font-semibold">Tools</h2>
//         <p className="mb-8 text-slate-500">Pick a tool to start working with your data.</p>
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           {TOOLS.map((tool) => (
//             <ToolCard key={tool.title} {...tool} onClick={go} />
//           ))}
//         </div>
//       </section>

//       <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
//         DataQuery AI - built with FastAPI + React.
//       </footer>
//     </div>
//   );
// }
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import ToolCard from "../components/ToolCard";
import { useAuth } from "../contexts/AuthContext";

// All tools are now active — no "Soon" badges
const TOOLS = [
  { icon: "PDF", title: "Chat with PDF", description: "Upload a PDF and ask questions about the document." },
  { icon: "XLS", title: "Chat with Excel", description: "Ask questions from Excel and CSV files in plain English." },
  { icon: "SQL", title: "SQL Analytics", description: "Connect a database and query it with AI." },
  { icon: "AI", title: "AI Dashboard Generator", description: "Turn any dataset into a dashboard automatically." },
  { icon: "API", title: "API Analytics", description: "Connect any REST API and analyze the data." },
  { icon: "PDF", title: "Report Generator", description: "Generate a polished PDF report from your data." },
  { icon: "FIX", title: "Data Cleaning", description: "Detect and fix messy data automatically." },
  { icon: "OUT", title: "Export Center", description: "Export results to CSV, Excel and PDF." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = () => navigate(user ? "/app" : "/signup");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="hero-grid border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl font-bold tracking-tight text-ink sm:text-6xl"
          >
            Ask Your Data Anything
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-lg text-slate-500"
          >
            Connect Excel, PDF, SQL, APIs and databases. Use AI to generate
            dashboards, insights and reports instantly.
          </motion.p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={go}
              className="rounded-xl bg-brand px-6 py-3 font-medium text-white shadow-card hover:bg-brand-dark"
            >
              Upload File
            </button>
            <button
              onClick={go}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium hover:bg-slate-50"
            >
              Connect Database
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="mb-2 font-display text-2xl font-semibold">Tools</h2>
        <p className="mb-8 text-slate-500">Pick a tool to start working with your data.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.title} {...tool} onClick={go} />
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        DataQuery AI — built with FastAPI + React.
      </footer>
    </div>
  );
}