import { motion } from "framer-motion";

export default function ToolCard({ icon, title, description, badge, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="group relative w-full rounded-[18px] border border-border bg-surface-1 p-5 text-left overflow-hidden hover:border-brand/40 hover:shadow-[0_14px_40px_rgba(0,0,0,0.4)]"
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-accent-amber/10 border border-accent-amber/30 px-2 py-0.5 text-[11px] font-semibold text-accent-amber">
          {badge}
        </span>
      )}
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 border border-brand/30 text-sm font-bold font-mono text-brand shadow-[0_0_20px_rgba(34,211,238,0.3)]">
        {icon}
      </div>
      <h3 className="font-display text-[16.5px] font-semibold text-[#EEF2FB]">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
        Open &#x2192;
      </span>
    </motion.button>
  );
}
