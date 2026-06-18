import { useState } from "react";
import { connectPostgres, connectMySQL, askQuestion, downloadAsExcel, downloadAsPDF, downloadAsJSON } from "../services/api";

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
        <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-slate-900">SQL Analytics</h2>
        <p className="text-sm text-slate-500">Connect your database and query it using plain English.</p>
      </div>

      {!sourceId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
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

          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 space-y-3 min-h-[300px] max-h-[55vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={sourceId} />
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

function DownloadButtons({ sourceId, question }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format) => {
    if (!question || !sourceId) return;
    setDownloading(true);
    try {
      if (format === "excel") await downloadAsExcel(sourceId, question);
      else if (format === "pdf") await downloadAsPDF(sourceId, question);
      else await downloadAsJSON(sourceId, question);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex gap-2 pt-2 border-t border-slate-200">
      <span className="text-xs text-slate-400 self-center">Download:</span>
      <button
        onClick={() => handleDownload("excel")}
        disabled={downloading}
        className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
      >
        Excel
      </button>
      <button
        onClick={() => handleDownload("pdf")}
        disabled={downloading}
        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        PDF
      </button>
      <button
        onClick={() => handleDownload("json")}
        disabled={downloading}
        className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        JSON
      </button>
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
        <div className="max-w-[80%] rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.type === "info") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">
          {msg.answer}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        {msg.answer && (
          <div className="text-sm text-slate-800 leading-relaxed">{msg.answer}</div>
        )}

        {msg.insights?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Insights</h4>
            <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
              {msg.insights.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {msg.table?.length > 0 && (
          <div className="overflow-auto rounded-lg border border-slate-200 max-h-[300px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-200 sticky top-0">
                <tr>
                  {Object.keys(msg.table[0]).map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {msg.table.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-3 py-2 text-slate-700">
                        {value === null ? <span className="text-slate-300">null</span> : String(value)}
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
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SQL</h4>
            <pre className="rounded-lg bg-slate-900 text-green-400 p-3 text-xs overflow-x-auto">{msg.sql}</pre>
          </div>
        )}

        {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
      </div>
    </div>
  );
}
