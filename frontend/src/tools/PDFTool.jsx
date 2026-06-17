import { useState, useRef } from "react";
import { uploadPDF, askQuestion } from "../services/api";

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
      setSourceId(res.source_id || res.id);
      setMessages([
        {
          role: "assistant",
          text: `✅ **${f.name}** uploaded. Ask me anything about this document!`,
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer || res.result || JSON.stringify(res) },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `❌ Error: ${e.message}`, error: true },
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
          <h2 className="font-display text-xl font-semibold text-slate-900">Chat with PDF</h2>
          <p className="text-sm text-slate-500">Upload a PDF, then ask questions about its content.</p>
        </div>
      </div>

      {!sourceId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-14 text-center transition-colors hover:border-brand hover:bg-brand-soft/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-2xl font-bold text-red-700">
            PDF
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-slate-600">Uploading…</p>
          ) : (
            <>
              <p className="font-medium text-slate-700">Drop your PDF file here</p>
              <p className="text-sm text-slate-400">.pdf supported · max 20 MB</p>
            </>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
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
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2">
            <span className="text-sm font-medium text-red-700">📄 {file?.name}</span>
            <button
              onClick={() => { setFile(null); setSourceId(null); setMessages([]); }}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Change file
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
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
              placeholder="Ask about this document…"
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

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-brand text-white"
            : msg.error
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-slate-100 text-slate-800"
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}
