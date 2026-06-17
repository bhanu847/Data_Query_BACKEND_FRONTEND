import { useState } from "react";
import { connectPostgres, connectMySQL, askQuestion } from "../services/api";

const DB_TYPES = [
  { key: "postgres", label: "PostgreSQL", color: "bg-sky-50 text-sky-700" },
  { key: "mysql", label: "MySQL", color: "bg-orange-50 text-orange-700" },
  { key: "sqlite", label: "SQLite (file)", color: "bg-slate-100 text-slate-700" },
];

export default function SQLTool({ onBack }) {
  const [dbType, setDbType] = useState("postgres");
  const [form, setForm] = useState({ host: "", port: "", database: "", username: "", password: "" });
  const [sourceId, setSourceId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const bottomRef = { current: null };

  const connect = async () => {
    setConnectError("");
    setConnecting(true);
    try {
      const fn = dbType === "mysql" ? connectMySQL : connectPostgres;
      const res = await fn(form);
      setSourceId(res.source_id || res.id);
      setMessages([
        { role: "assistant", text: `✅ Connected to **${form.database}** on ${form.host}. Ask me anything!` },
      ]);
    } catch (e) {
      setConnectError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || !sourceId || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setAsking(true);
    try {
      const res = await askQuestion(sourceId, q);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer || res.result || JSON.stringify(res) },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `❌ ${e.message}`, error: true }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-slate-900">SQL Analytics</h2>
        <p className="text-sm text-slate-500">Connect your database and query it using plain English.</p>
      </div>

      {!sourceId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          {/* DB type selector */}
          <div className="flex gap-2">
            {DB_TYPES.map((db) => (
              <button
                key={db.key}
                onClick={() => setDbType(db.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                  dbType === db.key
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {db.label}
              </button>
            ))}
          </div>

          {dbType !== "sqlite" ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "host", label: "Host", placeholder: "localhost" },
                { key: "port", label: "Port", placeholder: dbType === "mysql" ? "3306" : "5432" },
                { key: "database", label: "Database", placeholder: "my_database" },
                { key: "username", label: "Username", placeholder: "admin" },
              ].map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
                  <input
                    type="text"
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </label>
              ))}
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-slate-500">SQLite file upload coming soon. Use PostgreSQL or MySQL for now.</p>
          )}

          {connectError && <p className="text-sm text-red-600">{connectError}</p>}

          {dbType !== "sqlite" && (
            <button
              onClick={connect}
              disabled={connecting || !form.host || !form.database}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      )}

      {sourceId && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2">
            <span className="text-sm font-medium text-sky-700">🗄 Connected: {form.database}@{form.host}</span>
            <button onClick={() => setSourceId(null)} className="text-xs text-slate-500 hover:text-red-600">
              Disconnect
            </button>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 space-y-3 min-h-[300px] max-h-[50vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500 animate-pulse">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={(el) => (bottomRef.current = el)} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
              placeholder="e.g. Show total sales by region for last month"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={sendQuestion}
              disabled={!question.trim() || asking}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Ask
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-brand text-white" : msg.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-800"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}
