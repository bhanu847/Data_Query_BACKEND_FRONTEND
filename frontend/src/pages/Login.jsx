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
      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Logging in..." : "Log in"}
      </button>
      <p className="text-center text-sm text-slate-500">
        No account? <Link to="/signup" className="font-medium text-brand">Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, onSubmit }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-card"
      >
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">DQ</span>
          <span className="font-display text-lg font-semibold">DataQuery AI</span>
        </Link>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="space-y-4">{children}</div>
      </form>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
