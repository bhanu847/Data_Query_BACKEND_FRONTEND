import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

const STATS = [
  { value: "30+", label: "file & DB formats" },
  { value: "<5s", label: "to first insight" },
  { value: "0", label: "SQL required" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = () => navigate(user ? "/app" : "/signup");

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background */}
      <div className="bg-scene">
        <div className="orb-a" />
        <div className="orb-b" />
        <div className="orb-c" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-20 max-w-[920px] mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/[0.08] border border-brand/[0.22] text-[13px] font-medium text-[#7DE7F5] mb-8"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_10px_#22D3EE] animate-pulse" />
            AI-native analytics workspace
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-display text-5xl sm:text-[68px] font-bold leading-[1.02] tracking-tight mb-6"
          >
            Ask your data<br />
            <span className="bg-gradient-to-r from-brand via-accent-indigo to-accent-emerald bg-clip-text text-transparent">
              anything.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg leading-relaxed text-muted max-w-[600px] mb-10"
          >
            Upload Excel, CSV, PDF or connect SQL, MongoDB and APIs.
            Chat with your data in plain English and turn it into dashboards,
            insights and reports — instantly.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <button
              onClick={go}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-7 py-4 text-[15px] font-semibold text-[#050710] shadow-glow hover:shadow-[0_10px_38px_rgba(34,211,238,0.5)] hover:-translate-y-0.5 transition-all"
            >
              Get Started Free
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex gap-8 flex-wrap justify-center mt-14"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl font-bold text-ink">{s.value}</div>
                <div className="text-[13px] text-muted-2 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
