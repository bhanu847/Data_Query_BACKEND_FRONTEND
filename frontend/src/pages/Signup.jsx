import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthShell, Field } from "./Login";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await signup(form);
      navigate("/app");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start querying your data in minutes" onSubmit={submit}>
      <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
      <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
      {error && <p className="text-sm text-accent-rose">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gradient-brand py-3 font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60"
      >
        {busy ? "Creating..." : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        Have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
