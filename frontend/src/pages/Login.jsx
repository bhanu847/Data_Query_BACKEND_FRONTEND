import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await login(form);
      navigate("/app");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your workspace" onSubmit={submit}>
      <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
      {error && <p className="text-sm text-accent-rose">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-brand py-3 font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {busy ? "Logging in..." : "Log in"}
      </button>
      <p className="text-center text-sm text-muted">
        No account? <Link to="/signup" className="font-semibold text-brand hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, onSubmit }) {
  return (
    <div className="relative grid min-h-screen place-items-center px-5">
      <div className="bg-scene">
        <div className="orb-a" />
        <div className="orb-b" />
        <div className="orb-c" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-[rgba(8,11,20,0.7)] backdrop-blur-xl p-7 shadow-card"
      >
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-brand text-sm font-bold text-[#050710] shadow-[0_0_18px_rgba(34,211,238,0.4)] font-display">Q</span>
          <span className="font-display text-lg font-semibold">DataQuery<span className="text-brand"> AI</span></span>
        </Link>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{subtitle}</p>
        <div className="space-y-4">{children}</div>
      </form>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-surface-2 border border-border px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 transition-all"
      />
    </label>
  );
}
