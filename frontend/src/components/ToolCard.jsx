import { motion } from "framer-motion";

export default function ToolCard({ icon, title, description, badge, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="group relative w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card transition-colors hover:border-brand/40"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          {badge}
        </span>
      )}
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-2xl">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      <span className="mt-4 inline-block text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
        Open &rarr;
      </span>
    </motion.button>
  );
}
