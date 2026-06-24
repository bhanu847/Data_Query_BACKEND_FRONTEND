import { useState } from "react";
import { connectPostgres, connectMySQL, askQuestion, downloadAsExcel, downloadAsPDF, downloadAsJSON } from "../services/api";

const DB_TYPES = [
  { key: "postgres", label: "PostgreSQL", color: "bg-accent-sky/10 text-accent-sky" },
  { key: "mysql", label: "MySQL", color: "bg-accent-orange/10 text-accent-orange" },
  { key: "sqlite", label: "SQLite (file)", color: "bg-surface-2 text-ink" },
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
        { role: "assistant", type: "info", answer: `Connected to "${form.database}" on ${form.host}. Ask me anything!` },
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
        {
          role: "assistant",
          type: "tabular",
          answer: res.answer,
          table: res.table || [],
          columns: res.columns || [],
          charts: res.charts || [],
          insights: res.insights || [],
          sql: res.sql,
          question: q,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `${e.message}`, error: true }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">SQL Analytics</h2>
        <p className="text-sm text-muted">Connect your database and query it using plain English.</p>
      </div>

      {!sourceId && (
        <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-5">
          <div className="flex gap-2">
            {DB_TYPES.map((db) => (
              <button
                key={db.key}
                onClick={() => setDbType(db.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                  dbType === db.key
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted hover:bg-surface-1"
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
                  <span className="mb-1 block text-xs font-medium text-muted">{f.label}</span>
                  <input
                    type="text"
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                  />
                </label>
              ))}
              <label className="col-span-2 block">
                <span className="mb-1 block text-xs font-medium text-muted">Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted">SQLite file upload coming soon. Use PostgreSQL or MySQL for now.</p>
          )}

          {connectError && <p className="text-sm text-accent-rose">{connectError}</p>}

          {dbType !== "sqlite" && (
            <button
              onClick={connect}
              disabled={connecting || !form.host || !form.database}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      )}

      {sourceId && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-accent-sky/10 px-4 py-2">
            <span className="text-sm font-medium text-accent-sky">🗄 Connected: {form.database}@{form.host}</span>
            <button onClick={() => setSourceId(null)} className="text-xs text-muted hover:text-accent-rose">
              Disconnect
            </button>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface-1 p-4 space-y-3 min-h-[300px] max-h-[55vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={sourceId} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted animate-pulse">
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
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
            <button
              onClick={sendQuestion}
              disabled={!question.trim() || asking}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
            >
              Ask
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DownloadButtons({ sourceId, question }) {
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  const handleDownload = async (format) => {
    if (!question || !sourceId) return;
    setDownloading(true);
    setDlError("");
    try {
      if (format === "excel") await downloadAsExcel(sourceId, question);
      else if (format === "pdf") await downloadAsPDF(sourceId, question);
      else await downloadAsJSON(sourceId, question);
    } catch (e) {
      setDlError(`Download failed: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-1 pt-2 border-t border-border">
      <div className="flex gap-2">
        <span className="text-xs text-muted-2 self-center">Download:</span>
        <button onClick={() => handleDownload("excel")} disabled={downloading} aria-label="Download as Excel"
          className="rounded-lg bg-accent-emerald/10 px-3 py-1 text-xs font-medium text-accent-emerald hover:bg-accent-emerald/20 disabled:opacity-50">Excel</button>
        <button onClick={() => handleDownload("pdf")} disabled={downloading} aria-label="Download as PDF"
          className="rounded-lg bg-accent-rose/10 px-3 py-1 text-xs font-medium text-accent-rose hover:bg-accent-rose/20 disabled:opacity-50">PDF</button>
        <button onClick={() => handleDownload("json")} disabled={downloading} aria-label="Download as JSON"
          className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-medium text-brand hover:bg-brand/20 disabled:opacity-50">JSON</button>
      </div>
      {dlError && <p className="text-[11px] text-accent-rose">{dlError}</p>}
    </div>
  );
}

function ChatBubble({ msg, sourceId }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-brand px-4 py-2.5 text-sm text-white">{msg.text}</div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-2.5 text-sm text-accent-rose">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.type === "info") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-ink whitespace-pre-wrap">
          {msg.answer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-full rounded-2xl bg-surface-1 border border-border p-4 space-y-3">
        {msg.answer && (
          <div className="text-sm text-ink leading-relaxed">{msg.answer}</div>
        )}

        {msg.insights?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Insights</h4>
            <ul className="list-disc ml-5 text-sm text-ink space-y-1">
              {msg.insights.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {msg.table?.length > 0 && (
          <div className="overflow-auto rounded-lg border border-border max-h-[300px]">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2 sticky top-0">
                <tr>
                  {Object.keys(msg.table[0]).map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {msg.table.map((row, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-surface-1">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-3 py-2 text-ink">
                        {value === null ? <span className="text-muted-2">null</span> : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {msg.sql && (
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">SQL</h4>
            <pre className="rounded-lg bg-slate-900 text-green-400 p-3 text-xs overflow-x-auto">{msg.sql}</pre>
          </div>
        )}

        {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
      </div>
    </div>
  );
}
