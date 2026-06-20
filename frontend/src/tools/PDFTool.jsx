import { useState, useRef } from "react";
import { uploadPDF, askPDF, downloadAsExcel, downloadAsPDF, downloadAsJSON } from "../services/api";
import AutoChart from "../charts/AutoChart";

export default function PDFTool({ onBack }) {
  const [file, setFile] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setSourceId(null);
    setMessages([]);
    setUploadError("");
    setUploading(true);
    try {
      const res = await uploadPDF(f);
      const id = res.source_id || res.id;
      setSourceId(id);

      const cols = res.columns || [];
      const rowCount = res.source?.row_count || 0;
      const isTabular = cols.length >= 3 && !(cols.length === 2 && cols.includes("page") && cols.includes("content"));

      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: isTabular
            ? `"${f.name}" uploaded successfully!\n\nRows: ${rowCount.toLocaleString()} | Columns: ${cols.length}\nColumns: ${cols.join(", ")}\n\nI detected tabular data in this PDF. Ask me anything about it!`
            : `"${f.name}" uploaded successfully!\n\nPages: ${rowCount}\n\nAsk me anything about this document!`,
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
      const res = await askPDF(sourceId, q);

      // Text-based response (document PDFs)
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
        // Tabular response (PDFs with table data)
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
          <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
            ← Back to Tools
          </button>
          <h2 className="font-display text-xl font-semibold text-ink">Chat with PDF</h2>
          <p className="text-sm text-muted">Upload a PDF — works with tables, reports, and documents.</p>
        </div>
      </div>

      {!sourceId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-2 bg-surface-1 px-8 py-14 text-center transition-colors hover:border-brand hover:bg-brand/10/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-rose/10 text-2xl font-bold text-accent-rose">
            PDF
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-muted">Uploading & analyzing PDF…</p>
          ) : (
            <>
              <p className="font-medium text-ink">Drop your PDF file here</p>
              <p className="text-sm text-muted-2">.pdf supported · max 50 MB</p>
            </>
          )}
          {uploadError && <p className="text-sm text-accent-rose">{uploadError}</p>}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {sourceId && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-accent-rose/25 bg-accent-rose/10 px-4 py-2">
            <span className="text-sm font-medium text-accent-rose">📄 {file?.name}</span>
            <button
              onClick={() => { setFile(null); setSourceId(null); setMessages([]); }}
              className="text-xs text-muted hover:text-accent-rose"
            >
              Change file
            </button>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface-1 p-4 space-y-3 min-h-[300px] max-h-[65vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={sourceId} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted animate-pulse">
                  Analyzing…
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
              placeholder="Ask about this PDF…"
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
            />
            <button
              onClick={sendQuestion}
              disabled={!question.trim() || asking}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
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
    <div className="flex gap-2 pt-2 border-t border-border">
      <span className="text-xs text-muted-2 self-center">Download:</span>
      {[
        { fmt: "excel", label: "Excel", bg: "bg-accent-emerald/10 text-accent-emerald hover:bg-green-100" },
        { fmt: "pdf", label: "PDF", bg: "bg-accent-rose/10 text-accent-rose hover:bg-red-100" },
        { fmt: "json", label: "JSON", bg: "bg-brand/10 text-brand hover:bg-blue-100" },
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
  const color = pct >= 80 ? "bg-green-100 text-accent-emerald"
    : pct >= 50 ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-accent-rose";
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
        <div className="max-w-[80%] rounded-2xl bg-accent-rose/10 border border-accent-rose/25 px-4 py-2.5 text-sm text-accent-rose">{msg.text}</div>
      </div>
    );
  }

  // Info message
  if (msg.type === "info") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-ink whitespace-pre-wrap">{msg.answer}</div>
      </div>
    );
  }

  // Text-based response (document PDFs without tables)
  if (msg.type === "text") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl bg-surface-1 border border-border p-4 space-y-3">
          <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{msg.answer}</div>
          {msg.excerpts?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">Source References</h4>
              {msg.excerpts.map((exc, i) => (
                <div key={i} className="rounded-lg bg-surface-1 border border-border p-3">
                  <span className="text-xs font-medium text-brand">Section {exc.section}</span>
                  <p className="text-xs text-muted mt-1 line-clamp-3">{exc.content}</p>
                </div>
              ))}
            </div>
          )}
          {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
        </div>
      </div>
    );
  }

  // ─── Tabular response (PDFs with table data) ───
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-full w-full rounded-2xl bg-surface-1 border border-border p-4 space-y-3">

        {/* Answer + confidence */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap flex-1">{msg.answer}</div>
          <ConfidenceBadge score={msg.confidence} />
        </div>

        {/* Insights */}
        {msg.insights?.length > 0 && (
          <div className="rounded-xl bg-brand/10 border border-blue-100 p-3">
            <h4 className="text-xs font-semibold text-brand uppercase tracking-wide mb-1.5">Insights</h4>
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
          <div className="overflow-auto rounded-lg border border-border max-h-[300px]">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2 sticky top-0 z-10">
                <tr>
                  {Object.keys(msg.table[0]).map((col) => (
                    <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-muted whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {msg.table.map((row, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-surface-1">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-3 py-2 text-ink whitespace-nowrap">
                        {value === null ? <span className="text-muted-2 italic">null</span> : String(value)}
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
            <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
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
