import { useState, useRef } from "react";
import {
  connectMongoDB,
  askMongoDB,
  listMongoCollections,
  switchMongoCollection,
  refreshMongoDB,
  downloadAsExcel,
  downloadAsPDF,
  downloadAsJSON,
} from "../services/api";

export default function MongoDBTool({ onBack }) {
  const [form, setForm] = useState({
    host: "",
    port: "27017",
    database: "",
    username: "",
    password: "",
    auth_source: "admin",
    collection: "",
  });
  const [sourceId, setSourceId] = useState(null);
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const bottomRef = useRef();

  const connect = async () => {
    setConnectError("");
    setConnecting(true);
    try {
      const res = await connectMongoDB({
        ...form,
        port: parseInt(form.port, 10) || 27017,
      });
      setSourceId(res.source_id);
      setCollections(res.collections || []);
      setActiveCollection(res.active_collection || "");
      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: `Connected to MongoDB "${form.database}" on ${form.host}!\n\nCollection: ${res.active_collection}\nDocuments: ${res.document_count}\nFields: ${(res.columns || []).join(", ")}\n\nAsk me anything about this data!`,
        },
      ]);
    } catch (e) {
      setConnectError(e.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSwitchCollection = async (coll) => {
    if (!sourceId || coll === activeCollection) return;
    try {
      const res = await switchMongoCollection(sourceId, coll);
      setActiveCollection(coll);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "info",
          answer: `Switched to collection "${coll}".\nDocuments: ${res.document_count}\nFields: ${(res.columns || []).join(", ")}`,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error switching collection: ${e.message}`, error: true },
      ]);
    }
  };

  const handleRefresh = async () => {
    if (!sourceId) return;
    try {
      const res = await refreshMongoDB(sourceId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", type: "info", answer: res.message },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${e.message}`, error: true },
      ]);
    }
  };

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || !sourceId || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setAsking(true);
    try {
      const res = await askMongoDB(sourceId, q, activeCollection);
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
          question: q,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error: ${e.message}`, error: true },
      ]);
    } finally {
      setAsking(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">MongoDB Analytics</h2>
        <p className="text-sm text-muted">Connect to MongoDB and query your collections using plain English.</p>
      </div>

      {!sourceId && (
        <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-emerald/10">
              <span className="text-lg font-bold text-accent-emerald">M</span>
            </div>
            <span className="font-medium text-ink">MongoDB Connection</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "host", label: "Host", placeholder: "localhost" },
              { key: "port", label: "Port", placeholder: "27017" },
              { key: "database", label: "Database", placeholder: "my_database" },
              { key: "username", label: "Username (optional)", placeholder: "admin" },
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Password (optional)</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Auth Source</span>
              <input
                type="text"
                value={form.auth_source}
                placeholder="admin"
                onChange={(e) => setForm({ ...form, auth_source: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-muted">Collection (optional — defaults to first)</span>
              <input
                type="text"
                value={form.collection}
                placeholder="Leave empty to auto-select"
                onChange={(e) => setForm({ ...form, collection: e.target.value })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
          </div>

          {connectError && <p className="text-sm text-accent-rose">{connectError}</p>}

          <button
            onClick={connect}
            disabled={connecting || !form.host || !form.database}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect to MongoDB"}
          </button>
        </div>
      )}

      {sourceId && (
        <>
          <div className="rounded-xl border border-green-200 bg-accent-emerald/10 px-4 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-accent-emerald">
                🍃 {form.database}@{form.host}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={() => { setSourceId(null); setMessages([]); setCollections([]); }}
                  className="text-xs text-muted hover:text-accent-rose"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {collections.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                {collections.map((coll) => (
                  <button
                    key={coll}
                    onClick={() => handleSwitchCollection(coll)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      coll === activeCollection
                        ? "bg-green-600 text-white"
                        : "bg-surface-1 text-accent-emerald border border-green-300 hover:bg-green-100"
                    }`}
                  >
                    {coll}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface-1 p-4 space-y-3 min-h-[300px] max-h-[55vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={sourceId} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted animate-pulse">
                  Querying MongoDB…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
              placeholder="e.g. Show all users created this month, Count documents by status…"
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
            <button
              onClick={sendQuestion}
              disabled={!question.trim() || asking}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
    <div className="flex gap-2 pt-2 border-t border-border">
      <span className="text-xs text-muted-2 self-center">Download:</span>
      <button
        onClick={() => handleDownload("excel")}
        disabled={downloading}
        className="rounded-lg bg-accent-emerald/10 px-3 py-1 text-xs font-medium text-accent-emerald hover:bg-green-100 disabled:opacity-50"
      >
        Excel
      </button>
      <button
        onClick={() => handleDownload("pdf")}
        disabled={downloading}
        className="rounded-lg bg-accent-rose/10 px-3 py-1 text-xs font-medium text-accent-rose hover:bg-red-100 disabled:opacity-50"
      >
        PDF
      </button>
      <button
        onClick={() => handleDownload("json")}
        disabled={downloading}
        className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-medium text-brand hover:bg-blue-100 disabled:opacity-50"
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
        <div className="max-w-[80%] rounded-2xl bg-green-600 px-4 py-2.5 text-sm text-white">
          {msg.text}
        </div>
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
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted">
                      {col}
                    </th>
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

        {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
      </div>
    </div>
  );
}
