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
        <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-slate-900">Data Cleaning</h2>
        <p className="text-sm text-slate-500">Upload your file and AI will detect and suggest fixes for messy data.</p>
      </div>

      {!sourceId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-14 text-center transition-colors hover:border-brand hover:bg-brand-soft/30"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 text-2xl font-bold text-orange-700">
            FIX
          </div>
          {uploading ? (
            <p className="text-sm font-medium text-slate-600 animate-pulse">Uploading and analyzing…</p>
          ) : (
            <>
              <p className="font-medium text-slate-700">Drop your Excel or CSV file here</p>
              <p className="text-sm text-slate-400">AI will immediately scan for data quality issues</p>
            </>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
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
          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-2">
            <span className="text-sm font-medium text-orange-700">📄 {file?.name}</span>
            <button
              onClick={() => { setFile(null); setSourceId(null); setIssues(null); }}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Change file
            </button>
          </div>

          {analyzing && (
            <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <span className="text-sm text-orange-700">Scanning for data quality issues…</span>
            </div>
          )}

          {issues && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">🔍 Analysis Results</h3>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {issues}
              </div>
              <button
                onClick={() => analyzeData(sourceId)}
                className="rounded-xl border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-soft"
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
