import { useState } from "react";
//import { useAuth } from "../contexts/AuthContext";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsView() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || "http://localhost:8000");
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account and workspace preferences.</p>
      </div>

      {/* Account */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Account</h3>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{user?.full_name || user?.email}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Log out
        </button>
      </div>

      {/* API Config */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">API Configuration</h3>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Backend URL</span>
          <input
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Save
          </button>
          {saved && <span className="text-sm text-emerald-600">✅ Saved</span>}
        </div>
      </div>
    </div>
  );
}
