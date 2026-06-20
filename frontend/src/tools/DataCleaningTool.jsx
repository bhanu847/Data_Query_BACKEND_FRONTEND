import { useState, useRef } from "react";
import { uploadAny, askQuestion } from "../services/api";

export default function DataCleaningTool({ onBack }) {
  const [file, setFile] = useState(null);
  const [sourceId, setSourceId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [issues, setIssues] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef();

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setSourceId(null);
    setIssues(null);
    setUploadError("");
    setUploading(true);
    try {
      const res = await uploadAny(f);
      const id = res.source_id || res.id;
      setSourceId(id);
      // Auto-start analysis
      analyzeData(id);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const analyzeData = async (id) => {
    setAnalyzing(true);
    setIssues(null);
    try {
      const res = await askQuestion(
        id,
        "Analyze this dataset for data quality issues. List: missing values, duplicates, outliers, formatting inconsistencies, and data type problems. Be concise and structured."
      );
      setIssues(res.answer || res.result || JSON.stringify(res));
    } catch (e) {
      setIssues(`Error during analysis: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">Data Cleaning</h2>
        <p className="text-sm text-muted">Upload your file and AI will detect and suggest fixes for messy data.</p>
      </div>

      {!sourceId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-2 bg-surface-1 px-8 py-14 text-center transition-colors hover:border-brand hover:bg-brand/10/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-orange/10 text-2xl font-bold text-accent-orange">
            FIX
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-muted animate-pulse">Uploading and analyzing…</p>
          ) : (
            <>
              <p className="font-medium text-ink">Drop your Excel or CSV file here</p>
              <p className="text-sm text-muted-2">AI will immediately scan for data quality issues</p>
            </>
          )}
          {uploadError && <p className="text-sm text-accent-rose">{uploadError}</p>}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json,.jsonl,.tsv,.parquet,.xml,.pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {sourceId && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-accent-orange/10 px-4 py-2">
            <span className="text-sm font-medium text-accent-orange">📄 {file?.name}</span>
            <button
              onClick={() => { setFile(null); setSourceId(null); setIssues(null); }}
              className="text-xs text-muted hover:text-accent-rose"
            >
              Change file
            </button>
          </div>

          {analyzing && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-accent-orange/10 px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <span className="text-sm text-accent-orange">Scanning for data quality issues…</span>
            </div>
          )}

          {issues && (
            <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-ink">🔍 Analysis Results</h3>
              <div className="rounded-xl bg-surface-1 border border-border p-4 text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {issues}
              </div>
              <button
                onClick={() => analyzeData(sourceId)}
                className="rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand/10"
              >
                Re-analyze
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
