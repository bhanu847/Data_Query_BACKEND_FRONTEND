import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const TOGGLES = [
  { label: "AI insights", desc: "Auto-generate insights with every answer.", on: true },
  { label: "Show generated SQL", desc: "Reveal the query behind each result.", on: true },
  { label: "Email me finished reports", desc: "Get a notification when a report is ready.", on: false },
  { label: "Anonymous usage analytics", desc: "Help improve DataQuery AI.", on: true },
];

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || "http://localhost:8000");
  const [saved, setSaved] = useState(false);
  const [toggles, setToggles] = useState(TOGGLES.map((t) => t.on));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const flipToggle = (i) => {
    setToggles((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <div className="max-w-[760px] mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">Workspace, account and preferences.</p>
      </div>

      {/* Account card */}
      <div className="flex items-center gap-4 rounded-[18px] bg-surface-1 border border-border p-5">
        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-accent-emerald to-brand text-lg font-bold text-[#050710]">
          {user?.email?.slice(0, 2).toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold text-[#EEF2FB]">{user?.full_name || user?.email || "User"}</p>
          <p className="text-[13px] text-muted">{user?.email} · Free workspace</p>
        </div>
        <button className="rounded-[10px] bg-accent-indigo/[0.14] border border-accent-indigo/30 px-4 py-2 text-[13px] font-semibold text-[#C7CDFF] hover:bg-accent-indigo/[0.22] transition-colors">
          Upgrade plan
        </button>
      </div>

      {/* Toggles */}
      <div className="rounded-[18px] bg-surface-1 border border-border overflow-hidden">
        {TOGGLES.map((t, i) => (
          <div key={t.label} className="flex items-center justify-between gap-4 px-5 py-4 border-t border-border first:border-t-0">
            <div>
              <p className="text-sm font-semibold text-ink">{t.label}</p>
              <p className="text-[12.5px] text-muted mt-0.5">{t.desc}</p>
            </div>
            <button
              onClick={() => flipToggle(i)}
              className="shrink-0 w-[46px] h-[26px] rounded-full p-[3px] flex transition-colors"
              style={{ background: toggles[i] ? "linear-gradient(135deg,#22D3EE,#6366F1)" : "rgba(255,255,255,0.12)" }}
            >
              <div
                className="w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: toggles[i] ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* API Config */}
      <div className="rounded-[18px] bg-surface-1 border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ink">API Configuration</h3>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Backend URL</span>
          <input
            type="url"
            value={apiUrl}
            maxLength={512}
            pattern="https?://.*"
            placeholder="http://localhost:8000"
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full rounded-xl bg-surface-2 border border-border px-4 py-2.5 text-sm text-ink font-mono outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
          >
            Save
          </button>
          {saved && <span className="text-sm text-accent-emerald font-medium">Saved</span>}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={logout}
        className="rounded-xl border border-accent-rose/25 bg-accent-rose/10 px-5 py-2.5 text-[13.5px] font-semibold text-accent-rose hover:bg-accent-rose/20 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
