import { useState } from "react";
import { askQuestion, uploadAny } from "../services/api";

const AUTH_TYPES = ["None", "Bearer Token", "API Key (header)", "Basic Auth"];

export default function APITool({ onBack }) {
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [authType, setAuthType] = useState("None");
  const [authValue, setAuthValue] = useState("");
  const [headerKey, setHeaderKey] = useState("");
  const [response, setResponse] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [sourceId, setSourceId] = useState(null);

  const fetchAPI = async () => {
    if (!url) return;
    setError("");
    setResponse(null);
    setAnalysis("");
    setSourceId(null);
    setFetching(true);
    try {
      const headers = {};
      if (authType === "Bearer Token") headers["Authorization"] = `Bearer ${authValue}`;
      if (authType === "API Key (header)") headers[headerKey || "X-API-Key"] = authValue;
      if (authType === "Basic Auth") headers["Authorization"] = `Basic ${btoa(authValue)}`;

      const res = await fetch(url, { method, headers });
      const json = await res.json();
      setResponse(json);

      // Auto-upload the JSON response as a source for AI analysis
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const file = new File([blob], "api_response.json", { type: "application/json" });
      try {
        const uploadRes = await uploadAny(file);
        setSourceId(uploadRes.source_id || uploadRes.id);
      } catch {
        // AI analysis won't be available but the response is still shown
      }
    } catch (e) {
      setError(`Failed to fetch: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  const analyseWithAI = async () => {
    if (!question.trim()) return;
    setAnalysing(true);
    setAnalysis("");
    try {
      if (sourceId) {
        const res = await askQuestion(sourceId, question);
        setAnalysis(res.answer || "No response from AI.");
      } else {
        setAnalysis("Could not analyze: API response was not uploaded as a data source. Try fetching again.");
      }
    } catch (e) {
      setAnalysis(`Error: ${e.message}`);
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-ink">API Analytics</h2>
        <p className="text-sm text-muted">Connect any REST API and ask AI to analyze the response.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-4">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50"
          >
            <option>GET</option>
            <option>POST</option>
          </select>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/data"
            className="flex-1 rounded-xl border border-border px-4 py-2 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
          />
        </div>

        {/* Auth */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Authentication</label>
          <div className="flex flex-wrap gap-2">
            {AUTH_TYPES.map((a) => (
              <button
                key={a}
                onClick={() => setAuthType(a)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  authType === a ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:bg-surface-1"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {authType !== "None" && (
            <div className="flex gap-2">
              {authType === "API Key (header)" && (
                <input
                  type="text"
                  value={headerKey}
                  onChange={(e) => setHeaderKey(e.target.value)}
                  placeholder="Header name (e.g. X-API-Key)"
                  className="w-48 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50"
                />
              )}
              <input
                type={authType === "Basic Auth" ? "text" : "password"}
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder={authType === "Basic Auth" ? "user:password" : "Token / Key"}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-brand/50"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-accent-rose">{error}</p>}

        <button
          onClick={fetchAPI}
          disabled={fetching || !url}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
        >
          {fetching ? "Fetching…" : "Fetch Data"}
        </button>
      </div>

      {response && (
        <>
          <div className="rounded-2xl border border-border bg-surface-1 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">API Response</h3>
              <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-xs font-medium text-accent-emerald">200 OK</span>
            </div>
            <pre className="max-h-48 overflow-y-auto rounded-xl bg-surface-1 p-3 text-xs text-ink">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Ask AI about this data</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyseWithAI()}
                placeholder="e.g. Summarize this data, find patterns, count records…"
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
              <button
                onClick={analyseWithAI}
                disabled={analysing || !question.trim()}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50"
              >
                {analysing ? "Analysing…" : "Analyse"}
              </button>
            </div>
            {analysis && (
              <div className="rounded-xl bg-surface-1 border border-border p-4 text-sm text-ink whitespace-pre-wrap">
                {analysis}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
