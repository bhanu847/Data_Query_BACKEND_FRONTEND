import { useState, useRef, useEffect } from "react";
import { uploadAny, askQuestion, downloadAsExcel, downloadAsPDF, downloadAsJSON } from "../services/api";
import AutoChart from "../charts/AutoChart";

export default function ExcelTool({ onBack, chatContext }) {
  const [file, setFile] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  // Open from history: pre-load source and replay conversation
  useEffect(() => {
    if (chatContext && chatContext.sourceId) {
      setSourceId(chatContext.sourceId);
      setFile({ name: chatContext.sourceName || "Data source" });
      const msgs = [
        {
          role: "assistant",
          type: "info",
          answer: `Resumed chat with "${chatContext.sourceName || "Data source"}". Ask me anything!`,
        },
      ];
      if (chatContext.question) {
        msgs.push({ role: "user", text: chatContext.question });
      }
      if (chatContext.answer) {
        msgs.push({ role: "assistant", type: "tabular", answer: chatContext.answer, table: [], columns: [], charts: [], insights: [], sql: null, confidence: null, question: chatContext.question });
      }
      setMessages(msgs);
    }
  }, [chatContext]);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setSourceId(null);
    setMessages([]);
    setUploadError("");
    setUploading(true);
    try {
      const res = await uploadAny(f);
      const id = res.source_id || res.id;
      setSourceId(id);

      const cols = res.columns || [];
      const rowCount = res.source?.row_count || res.preview?.length || 0;
      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: `"${f.name}" uploaded successfully!\n\nRows: ${rowCount.toLocaleString()} | Columns: ${cols.length}\nColumns: ${cols.join(", ")}\n\nAsk me anything about this data!`,
        },
      ]);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || !sourceId || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setAsking(true);
    try {
      const res = await askQuestion(sourceId, q);

      // Text-based response (PDF/DOCX via smart endpoint)
      if (res.excerpts !== undefined) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            type: "text",
            answer: res.answer,
            excerpts: res.excerpts || [],
            question: q,
          },
        ]);
      } else {
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
            confidence: res.confidence,
            question: q,
          },
        ]);
      }
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
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
            ← Back to Tools
          </button>
          <h2 className="font-display text-xl font-semibold text-slate-900">Chat with Data</h2>
          <p className="text-sm text-slate-500">Upload a file and ask questions about it in plain English.</p>
        </div>
      </div>

      {!sourceId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-14 text-center transition-colors hover:border-brand hover:bg-brand-soft/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-2xl font-bold text-emerald-700">
            📂
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-slate-600">Uploading…</p>
          ) : (
            <>
              <p className="font-medium text-slate-700">Drop any data file here</p>
              <p className="text-sm text-slate-400">.csv · .xlsx · .xls · .json · .tsv · .parquet · .xml · .pdf · .docx</p>
            </>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.jsonl,.tsv,.parquet,.xml,.pdf,.docx,.txt,.html"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {sourceId && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
            <span className="text-sm font-medium text-emerald-700">📄 {file?.name}</span>
            <button
              onClick={() => { setFile(null); setSourceId(null); setMessages([]); }}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Change file
            </button>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 space-y-3 min-h-[300px] max-h-[65vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={sourceId} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500 animate-pulse">
                  Analyzing your data…
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
              placeholder="Ask a question about your data…"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              onClick={sendQuestion}
              disabled={!question.trim() || asking}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Download Buttons ─── */

function DownloadButtons({ sourceId, question }) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async (format) => {
    if (!question || !sourceId) return;
    setDownloading(true);
    try {
      if (format === "excel") await downloadAsExcel(sourceId, question);
      else if (format === "pdf") await downloadAsPDF(sourceId, question);
      else await downloadAsJSON(sourceId, question);
    } catch { /* ignore */ } finally { setDownloading(false); }
  };
  return (
    <div className="flex gap-2 pt-2 border-t border-slate-200">
      <span className="text-xs text-slate-400 self-center">Download:</span>
      {[
        { fmt: "excel", label: "Excel", bg: "bg-green-50 text-green-700 hover:bg-green-100" },
        { fmt: "pdf", label: "PDF", bg: "bg-red-50 text-red-700 hover:bg-red-100" },
        { fmt: "json", label: "JSON", bg: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
      ].map(({ fmt, label, bg }) => (
        <button key={fmt} onClick={() => handleDownload(fmt)} disabled={downloading}
          className={`rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50 ${bg}`}>{label}</button>
      ))}
    </div>
  );
}

/* ─── Confidence Badge ─── */

function ConfidenceBadge({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-green-100 text-green-700"
    : pct >= 50 ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {pct}% confidence
    </span>
  );
}

/* ─── Chat Bubble ─── */

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
        <div className="max-w-[80%] rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{msg.text}</div>
      </div>
    );
  }

  // Text-based response (PDF, DOCX)
  if (msg.type === "text") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.answer}</div>
          {msg.excerpts?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Source References</h4>
              {msg.excerpts.map((exc, i) => (
                <div key={i} className="rounded-lg bg-white border border-slate-200 p-3">
                  <span className="text-xs font-medium text-brand">Section {exc.section}</span>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3">{exc.content}</p>
                </div>
              ))}
            </div>
          )}
          {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
        </div>
      </div>
    );
  }

  // Info message
  if (msg.type === "info") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">{msg.answer}</div>
      </div>
    );
  }

  // ─── Tabular response ───
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-full w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">

        {/* Answer + confidence */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap flex-1">{msg.answer}</div>
          <ConfidenceBadge score={msg.confidence} />
        </div>

        {/* Insights */}
        {msg.insights?.length > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Insights</h4>
            <ul className="space-y-1">
              {msg.insights.map((item, idx) => (
                <li key={idx} className="text-sm text-blue-800 flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5 text-xs">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Charts */}
        {msg.charts?.length > 0 && (
          <div className="space-y-3">
            {msg.charts.map((chart, idx) => (
              <AutoChart key={idx} spec={chart} height={260} />
            ))}
          </div>
        )}

        {/* Table */}
        {msg.table?.length > 0 && (
          <div className="overflow-auto rounded-lg border border-slate-200 max-h-[300px]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-200 sticky top-0 z-10">
                <tr>
                  {Object.keys(msg.table[0]).map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {msg.table.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {value === null ? <span className="text-slate-300 italic">null</span> : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SQL */}
        {msg.sql && (
          <details className="group">
            <summary className="text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700">
              Generated SQL
            </summary>
            <pre className="mt-2 rounded-lg bg-slate-900 text-green-400 p-3 text-xs overflow-x-auto">{msg.sql}</pre>
          </details>
        )}

        {/* Download */}
        {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
      </div>
    </div>
  );
}
