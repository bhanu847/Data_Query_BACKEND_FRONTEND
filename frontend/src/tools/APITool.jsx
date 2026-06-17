import { useState } from "react";

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

  const fetchAPI = async () => {
    if (!url) return;
    setError("");
    setResponse(null);
    setAnalysis("");
    setFetching(true);
    try {
      const headers = {};
      if (authType === "Bearer Token") headers["Authorization"] = `Bearer ${authValue}`;
      if (authType === "API Key (header)") headers[headerKey || "X-API-Key"] = authValue;
      if (authType === "Basic Auth") headers["Authorization"] = `Basic ${btoa(authValue)}`;

      const res = await fetch(url, { method, headers });
      const json = await res.json();
      setResponse(json);
    } catch (e) {
      setError(`Failed to fetch: ${e.message}`);
    } finally {
      setFetching(false);
    }
  };

  const analyseWithAI = async () => {
    if (!response || !question.trim()) return;
    setAnalysing(true);
    setAnalysis("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Here is API response data:\n\n${JSON.stringify(response, null, 2)}\n\nUser question: ${question}`,
            },
          ],
        }),
      });
      const data = await res.json();
      setAnalysis(data.content?.[0]?.text || "No response");
    } catch (e) {
      setAnalysis(`Error: ${e.message}`);
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-slate-500 hover:text-slate-800">
          ← Back to Tools
        </button>
        <h2 className="font-display text-xl font-semibold text-slate-900">API Analytics</h2>
        <p className="text-sm text-slate-500">Connect any REST API and ask AI to analyze the response.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option>GET</option>
            <option>POST</option>
          </select>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/data"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Auth */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Authentication</label>
          <div className="flex flex-wrap gap-2">
            {AUTH_TYPES.map((a) => (
              <button
                key={a}
                onClick={() => setAuthType(a)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  authType === a ? "border-brand bg-brand-soft text-brand" : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
                  className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              )}
              <input
                type={authType === "Basic Auth" ? "text" : "password"}
                value={authValue}
                onChange={(e) => setAuthValue(e.target.value)}
                placeholder={authType === "Basic Auth" ? "user:password" : "Token / Key"}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={fetchAPI}
          disabled={fetching || !url}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {fetching ? "Fetching…" : "Fetch Data"}
        </button>
      </div>

      {response && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">API Response</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">200 OK</span>
            </div>
            <pre className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Ask AI about this data</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyseWithAI()}
                placeholder="e.g. Summarize this data, find patterns, count records…"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <button
                onClick={analyseWithAI}
                disabled={analysing || !question.trim()}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {analysing ? "Analysing…" : "Analyse"}
              </button>
            </div>
            {analysis && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {analysis}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
