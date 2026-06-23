import { useState, useRef, useEffect } from "react";
import { uploadAny, askQuestion, askMultiQuestion, listSources, deleteSource, downloadAsExcel, downloadAsPDF, downloadAsJSON } from "../services/api";
import AutoChart from "../charts/AutoChart";
import ConfirmModal from "../components/ConfirmModal";
import useConfirm from "../hooks/useConfirm";

const KIND_BADGE = {
  csv: "CSV", excel: "XLS", json: "JSON", pdf: "PDF", tsv: "TSV",
  parquet: "PAR", mongodb: "DB", xml: "XML", text: "TXT", html: "HTM",
  jsonl: "JSON", docx: "DOC",
};

export default function ExcelTool({ onBack, chatContext }) {
  const { confirm, modalProps } = useConfirm();
  const [file, setFile] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [selectedSources, setSelectedSources] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef();
  const bottomRef = useRef();

  // existing sources
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const hasActiveSession = sourceId || (selectedSources.length > 0 && messages.length > 0);
  const activeSourceIds = selectedSources.length > 0
    ? selectedSources.map((s) => s.id)
    : sourceId ? [sourceId] : [];

  useEffect(() => {
    listSources()
      .then(setSources)
      .catch(() => [])
      .finally(() => setLoadingSources(false));
  }, []);

  useEffect(() => {
    if (chatContext && chatContext.sourceId) {
      setSourceId(chatContext.sourceId);
      setSelectedSources([]);
      setFile({ name: chatContext.sourceName || "Data source" });
      const msgs = [
        {
          role: "assistant",
          type: "info",
          answer: chatContext.info || `Resumed chat with "${chatContext.sourceName || "Data source"}". Ask me anything!`,
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

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) return;

    setSourceId(null);
    setSelectedSources([]);
    setMessages([]);
    setUploadError("");
    setUploading(true);

    const uploaded = [];
    const errors = [];

    for (const f of files) {
      try {
        const res = await uploadAny(f);
        const id = res.source_id || res.id;
        const cols = res.columns || [];
        const rowCount = res.source?.row_count || res.preview?.length || 0;
        const newSrc = { id, name: f.name, kind: f.name.split(".").pop(), row_count: rowCount, columns: cols };
        uploaded.push(newSrc);
      } catch (e) {
        errors.push(`${f.name}: ${e.message}`);
      }
    }

    if (uploaded.length > 0) {
      setSources((prev) => [...uploaded, ...prev]);
    }

    if (uploaded.length === 1) {
      const src = uploaded[0];
      setSourceId(src.id);
      setFile({ name: src.name });
      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: `"${src.name}" uploaded successfully!\n\nRows: ${(src.row_count || 0).toLocaleString()} | Columns: ${(src.columns || []).length}\nColumns: ${(src.columns || []).join(", ")}\n\nAsk me anything about this data!`,
        },
      ]);
    } else if (uploaded.length > 1) {
      setSelectedSources(uploaded);
      const names = uploaded.map((s) => s.name);
      const totalRows = uploaded.reduce((sum, s) => sum + (s.row_count || 0), 0);
      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: `${uploaded.length} files uploaded successfully!\n\n${names.map((n) => `  - ${n}`).join("\n")}\n\nTotal rows: ~${totalRows.toLocaleString()}\n\nMulti-file chat is active. I'll merge these datasets and answer questions across all of them!`,
        },
      ]);
    }

    if (errors.length > 0) {
      setUploadError(errors.join("\n"));
    }

    setUploading(false);
  };

  const handleSelectSource = (src) => {
    setSourceId(src.id);
    setSelectedSources([]);
    setFile({ name: src.name || `Source ${src.id}` });
    setMessages([
      {
        role: "assistant",
        type: "info",
        answer: `Loaded "${src.name || `Source ${src.id}`}"${src.row_count ? ` (${src.row_count.toLocaleString()} rows)` : ""}. Ask me anything about this data!`,
      },
    ]);
    setQuestion("");
    setUploadError("");
  };

  const handleToggleMultiSource = (src, e) => {
    e.stopPropagation();
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.id === src.id);
      if (exists) return prev.filter((s) => s.id !== src.id);
      if (prev.length >= 10) return prev;
      return [...prev, src];
    });
  };

  const handleRemoveMultiSource = (srcId) => {
    setSelectedSources((prev) => {
      const next = prev.filter((s) => s.id !== srcId);
      if (next.length === 0) {
        setMessages([]);
      }
      return next;
    });
  };

  const handleDeleteSource = async (srcId, e) => {
    e.stopPropagation();
    const ok = await confirm({ title: "Delete Dataset", message: "This dataset and all its data will be permanently deleted. This action cannot be undone." });
    if (!ok) return;
    setDeleting(srcId);
    try {
      await deleteSource(srcId);
      setSources((prev) => prev.filter((s) => s.id !== srcId));
      setSelectedSources((prev) => prev.filter((s) => s.id !== srcId));
      if (sourceId === srcId) {
        setSourceId(null);
        setFile(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const sendQuestion = async () => {
    const q = question.trim();
    if (!q || activeSourceIds.length === 0 || asking) return;
    setQuestion("");

    // Auto-start session if sending from the selection screen
    if (messages.length === 0 && selectedSources.length > 0) {
      const names = selectedSources.map((s) => s.name || `Source ${s.id}`);
      setMessages([
        {
          role: "assistant",
          type: "info",
          answer: `Multi-file chat started with ${selectedSources.length} dataset${selectedSources.length > 1 ? "s" : ""}:\n${names.map((n) => `  - ${n}`).join("\n")}`,
        },
        { role: "user", text: q },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: "user", text: q }]);
    }
    setAsking(true);
    try {
      const res = activeSourceIds.length > 1
        ? await askMultiQuestion(activeSourceIds, q)
        : await askQuestion(activeSourceIds[0], q);

      if (res.excerpts !== undefined) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant", type: "text", answer: res.answer, excerpts: res.excerpts || [], question: q,
            executive_summary: res.executive_summary || null,
            key_findings: res.key_findings || [],
            risks: res.risks || [],
            opportunities: res.opportunities || [],
            recommendations: res.recommendations || [],
            confidence: res.confidence || null,
            confidence_reason: res.confidence_reason || null,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant", type: "tabular", answer: res.answer,
            table: res.table || [], columns: res.columns || [], charts: res.charts || [],
            insights: res.insights || [], confidence: res.confidence, question: q,
            metric_used: res.metric_used || null, group_by: res.group_by || null,
            aggregation: res.aggregation || null, reasoning: res.reasoning || [],
            planner: res.planner || null,
            executive_summary: res.executive_summary || null,
            business_impact: res.business_impact || null,
            recommendations: res.recommendations || [],
            chart_narrative: res.chart_narrative || null,
            confidence_explanation: res.confidence_explanation || null,
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
      <ConfirmModal {...modalProps} />
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">← Back to Tools</button>
          <h2 className="font-display text-xl font-semibold text-ink">Chat with Data</h2>
          <p className="text-sm text-muted">Upload one or multiple files, select existing datasets, then ask questions in plain English.</p>
        </div>
      </div>

      {!hasActiveSession && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div
            role="button" tabIndex={0} aria-label="Upload data file"
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current.click(); } }}
            onClick={() => !uploading && fileRef.current.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-2 bg-surface-1 px-8 py-10 text-center transition-colors hover:border-brand hover:bg-brand/[0.03] ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-emerald/10 text-xl font-bold text-accent-emerald" aria-hidden="true">+</div>
            {uploading ? (
              <p className="text-sm font-medium text-muted animate-pulse">Uploading…</p>
            ) : (
              <>
                <p className="font-medium text-ink">Drop files here or click to browse</p>
                <p className="text-sm text-muted-2">Select one or multiple files · .csv · .xlsx · .json · .tsv · .parquet · .xml · .pdf · .docx</p>
              </>
            )}
            {uploadError && <p className="text-sm text-accent-rose whitespace-pre-wrap">{uploadError}</p>}
            <input ref={fileRef} type="file" multiple accept=".csv,.xlsx,.xls,.json,.jsonl,.tsv,.parquet,.xml,.pdf,.docx,.txt,.html" className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
          </div>

          {/* Existing datasets */}
          {loadingSources ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-surface-1 animate-pulse" />)}</div>
          ) : sources.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-1 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Select dataset(s)</p>
                {selectedSources.length > 0 && (
                  <span className="text-xs font-medium text-brand">{selectedSources.length} selected</span>
                )}
              </div>
              <div className="grid gap-1.5 max-h-[280px] overflow-y-auto pr-1">
                {sources.map((src) => {
                  const isChecked = selectedSources.some((s) => s.id === src.id);
                  return (
                    <div
                      key={src.id}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all cursor-pointer ${isChecked ? "border-brand/40 bg-brand/[0.06]" : "border-border hover:border-brand/30 hover:bg-brand/[0.04]"}`}
                    >
                      {/* Multi-select checkbox */}
                      <button
                        onClick={(e) => handleToggleMultiSource(src, e)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${isChecked ? "border-brand bg-brand text-white" : "border-border-2 hover:border-brand/50"}`}
                        aria-label={`${isChecked ? "Deselect" : "Select"} ${src.name}`}
                      >
                        {isChecked && (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleSelectSource(src)}
                        className="flex flex-1 items-center gap-3 min-w-0"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-emerald/10 text-[10px] font-bold font-mono text-accent-emerald border border-accent-emerald/20">
                          {KIND_BADGE[src.kind] || "F"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{src.name || `Source ${src.id}`}</p>
                          <p className="text-[11px] text-muted-2">
                            {src.row_count ? `${src.row_count.toLocaleString()} rows` : ""}{src.row_count && src.kind ? " · " : ""}{src.kind || "file"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Chat →</span>
                      </button>
                      <button
                        aria-label={`Delete ${src.name}`}
                        onClick={(e) => handleDeleteSource(src.id, e)}
                        disabled={deleting === src.id}
                        className="shrink-0 rounded-lg p-1.5 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose disabled:opacity-50 transition-all"
                      >
                        {deleting === src.id ? (
                          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-rose/30 border-t-accent-rose" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected files summary + inline chat input */}
          {selectedSources.length > 0 && (
            <div className="rounded-2xl border border-brand/30 bg-brand/[0.04] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand">{selectedSources.length} dataset{selectedSources.length > 1 ? "s" : ""} selected</span>
                <button onClick={() => setSelectedSources([])} className="text-xs text-muted hover:text-accent-rose">Clear all</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedSources.map((src) => (
                  <span key={src.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 border border-border px-2.5 py-1 text-xs font-medium text-ink">
                    <span className="text-[9px] font-bold font-mono text-accent-emerald">{KIND_BADGE[src.kind] || "F"}</span>
                    <span className="max-w-[120px] truncate">{src.name}</span>
                    <button onClick={() => handleRemoveMultiSource(src.id)} className="text-muted-2 hover:text-accent-rose ml-0.5">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                  placeholder={selectedSources.length > 1 ? `Ask a question across ${selectedSources.length} datasets…` : "Ask a question about this dataset…"}
                  className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                />
                <button
                  onClick={sendQuestion}
                  disabled={!question.trim() || asking}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {asking ? "…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasActiveSession && (
        <>
          {/* Active source(s) header */}
          {selectedSources.length >= 1 ? (
            <div className="rounded-xl border border-brand/30 bg-brand/[0.06] px-4 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand">{selectedSources.length} dataset{selectedSources.length > 1 ? "s" : ""} active</span>
                <button
                  onClick={() => { setSelectedSources([]); setSourceId(null); setFile(null); setMessages([]); }}
                  className="text-xs text-muted hover:text-accent-rose"
                >
                  Change files
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedSources.map((src) => (
                  <span key={src.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 border border-border px-2.5 py-1 text-xs font-medium text-ink">
                    <span className="text-[9px] font-bold font-mono text-accent-emerald">{KIND_BADGE[src.kind] || "F"}</span>
                    <span className="max-w-[120px] truncate">{src.name}</span>
                    <button onClick={() => handleRemoveMultiSource(src.id)} className="text-muted-2 hover:text-accent-rose ml-0.5">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-accent-emerald/10 px-4 py-2">
              <span className="text-sm font-medium text-accent-emerald">{file?.name}</span>
              <button
                onClick={() => { setFile(null); setSourceId(null); setSelectedSources([]); setMessages([]); }}
                className="text-xs text-muted hover:text-accent-rose"
              >
                Change file
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-surface-1 p-4 space-y-3 min-h-[300px] max-h-[65vh]">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sourceId={activeSourceIds[0]} />
            ))}
            {asking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-2 px-4 py-2 text-sm text-muted animate-pulse">
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
              placeholder={activeSourceIds.length > 1 ? `Ask a question across ${activeSourceIds.length} datasets…` : "Ask a question about your data…"}
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
    } finally { setDownloading(false); }
  };
  return (
    <div className="space-y-1 pt-2 border-t border-border">
      <div className="flex gap-2">
        <span className="text-xs text-muted-2 self-center">Download:</span>
        {[
          { fmt: "excel", label: "Excel", bg: "bg-accent-emerald/10 text-accent-emerald hover:bg-green-100" },
          { fmt: "pdf", label: "PDF", bg: "bg-accent-rose/10 text-accent-rose hover:bg-red-100" },
          { fmt: "json", label: "JSON", bg: "bg-brand/10 text-brand hover:bg-blue-100" },
        ].map(({ fmt, label, bg }) => (
          <button key={fmt} onClick={() => handleDownload(fmt)} disabled={downloading} aria-label={`Download as ${label}`}
            className={`rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50 ${bg}`}>{label}</button>
        ))}
      </div>
      {dlError && <p className="text-[11px] text-accent-rose">{dlError}</p>}
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

  // Text-based response (PDF, DOCX) — AI Document Intelligence
  if (msg.type === "text") {
    return (
      <div className="flex justify-start w-full">
        <div className="max-w-full w-full rounded-2xl bg-surface-1 border border-border p-4 space-y-3">

          {/* Direct Answer */}
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap flex-1">{msg.answer}</div>
            {msg.confidence && (
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                msg.confidence === "High" ? "bg-emerald-100 text-emerald-700" :
                msg.confidence === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>{msg.confidence} Confidence</span>
            )}
          </div>

          {/* Executive Summary */}
          {msg.executive_summary && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Executive Summary</h4>
              <p className="text-sm text-slate-800 leading-relaxed">{msg.executive_summary}</p>
            </div>
          )}

          {/* Key Findings */}
          {msg.key_findings?.length > 0 && (
            <div className="rounded-xl bg-brand/10 border border-blue-100 p-3">
              <h4 className="text-xs font-semibold text-brand uppercase tracking-wide mb-1.5">Key Findings</h4>
              <ul className="space-y-1">
                {msg.key_findings.map((item, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5 text-xs">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {msg.risks?.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">Risks Identified</h4>
              <ul className="space-y-1">
                {msg.risks.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-800 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5 text-xs">&#x26A0;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Opportunities */}
          {msg.opportunities?.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">Opportunities</h4>
              <ul className="space-y-1">
                {msg.opportunities.map((item, idx) => (
                  <li key={idx} className="text-sm text-emerald-800 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5 text-xs">&#x2191;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {msg.recommendations?.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Recommendations</h4>
              <ul className="space-y-1">
                {msg.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-amber-900 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5 text-xs font-bold">{idx + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Evidence */}
          {msg.excerpts?.length > 0 && (
            <details className="group">
              <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
                Source Evidence ({msg.excerpts.length} references)
              </summary>
              <div className="mt-2 space-y-2">
                {msg.excerpts.map((exc, i) => (
                  <div key={i} className="rounded-lg bg-surface-2 border border-border p-3">
                    <span className="text-xs font-medium text-brand">Page {exc.section}</span>
                    <p className="text-xs text-muted mt-1 line-clamp-3">{exc.content}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Confidence Explanation */}
          {msg.confidence_reason && (
            <details className="group">
              <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
                Confidence: {msg.confidence}
              </summary>
              <p className="mt-1 text-xs text-gray-500">{msg.confidence_reason}</p>
            </details>
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
        <div className="max-w-[80%] rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-ink whitespace-pre-wrap">{msg.answer}</div>
      </div>
    );
  }

  // ─── Tabular response (Business Analytics Copilot) ───
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-full w-full rounded-2xl bg-surface-1 border border-border p-4 space-y-3">

        {/* 1. Direct Answer + Confidence */}
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap flex-1">{msg.answer}</div>
          <ConfidenceBadge score={msg.confidence} />
        </div>

        {/* 2. Executive Summary */}
        {msg.executive_summary && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Executive Summary</h4>
            <p className="text-sm text-slate-800 leading-relaxed">{msg.executive_summary}</p>
          </div>
        )}

        {/* 3. Key Insights */}
        {msg.insights?.length > 0 && (
          <div className="rounded-xl bg-brand/10 border border-blue-100 p-3">
            <h4 className="text-xs font-semibold text-brand uppercase tracking-wide mb-1.5">Key Findings</h4>
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

        {/* 4. Business Impact */}
        {msg.business_impact && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Business Impact</h4>
            <p className="text-sm text-amber-900 leading-relaxed">{msg.business_impact}</p>
          </div>
        )}

        {/* 5. Recommendations */}
        {msg.recommendations?.length > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">Recommendations</h4>
            <ul className="space-y-1">
              {msg.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-emerald-800 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5 text-xs font-bold">{idx + 1}.</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6. Charts + Chart Narrative */}
        {msg.charts?.length > 0 && (
          <div className="space-y-2">
            {msg.charts.map((chart, idx) => (
              <AutoChart key={idx} spec={chart} height={260} />
            ))}
            {msg.chart_narrative && (
              <p className="text-xs text-muted italic px-1">{msg.chart_narrative}</p>
            )}
          </div>
        )}

        {/* 7. Supporting Data Table */}
        {msg.table?.length > 0 && (
          <details className="group">
            <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
              Supporting Data ({msg.table.length} rows)
            </summary>
            <div className="mt-2 overflow-auto rounded-lg border border-border max-h-[300px]">
              <table className="min-w-full text-sm">
                <thead className="bg-surface-2 sticky top-0 z-10">
                  <tr>
                    {Object.keys(msg.table[0]).map((col) => (
                      <th key={col} scope="col" className="px-3 py-2 text-left text-xs font-semibold text-muted whitespace-nowrap">{col}</th>
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
          </details>
        )}

        {/* 8. Confidence Explanation */}
        {msg.confidence_explanation && (
          <details className="group">
            <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
              Confidence: {msg.confidence_explanation.level} ({msg.confidence_explanation.score}%)
            </summary>
            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-3">
              <ul className="space-y-0.5">
                {msg.confidence_explanation.reasons?.map((reason, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-gray-400 mt-0.5">&#x2713;</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        )}

        {/* Analysis Planner (Debug) */}
        {(msg.planner || msg.metric_used) && (
          <details className="group">
            <summary className="text-xs font-semibold text-muted uppercase tracking-wide cursor-pointer hover:text-ink">
              Analysis Planner
            </summary>
            <div className="mt-2 rounded-lg bg-slate-100 border border-slate-200 p-3 space-y-2">
              {msg.metric_used && (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                    Metric: {msg.aggregation || "SUM"}({msg.metric_used})
                  </span>
                  {msg.group_by && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                      Group By: {msg.group_by}
                    </span>
                  )}
                  {msg.planner?.calculation_type && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                      {msg.planner.calculation_type}
                    </span>
                  )}
                </div>
              )}
              {msg.planner?.filters?.length > 0 && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold">Filters:</span> {msg.planner.filters.join(" | ")}
                </div>
              )}
              {msg.reasoning?.length > 0 && (
                <ul className="space-y-0.5 pt-1 border-t border-slate-200">
                  {msg.reasoning.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-slate-400 mt-0.5">&#x2192;</span>
                      {step}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        )}

        {/* Download */}
        {msg.question && <DownloadButtons sourceId={sourceId} question={msg.question} />}
      </div>
    </div>
  );
}
