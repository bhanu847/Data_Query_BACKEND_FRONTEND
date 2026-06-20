import { useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listSources, listDashboards, getHistory } from "../services/api";

export default function Navbar({ onUploadFile, onOpenTool, onSelectSection }) {
  const { user } = useAuth();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ sources: [], dashboards: [], history: [] });
  const [searching, setSearching] = useState(false);
  const searchRef = useRef();
  const inputRef = useRef();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !onUploadFile) return;
    setUploading(true);
    try { await onUploadFile(file); } catch { /* tool shows error */ }
    finally { setUploading(false); e.target.value = ""; }
  };

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    setSearching(true);
    Promise.all([
      listSources().catch(() => []),
      listDashboards().catch(() => []),
      getHistory().catch(() => []),
    ]).then(([s, d, h]) => {
      setResults({ sources: s, dashboards: d, history: h });
      setSearching(false);
    });
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [openSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const q = searchQuery.toLowerCase();
  const filtered = {
    sources:    results.sources.filter((s) => (s.name || "").toLowerCase().includes(q)),
    dashboards: results.dashboards.filter((d) => (d.name || "").toLowerCase().includes(q)),
    history:    results.history.filter((h) => (h.question || "").toLowerCase().includes(q)).slice(0, 5),
  };
  const hasResults = filtered.sources.length + filtered.dashboards.length + filtered.history.length > 0;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-[rgba(8,11,20,0.55)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-brand text-sm font-bold text-[#050710] shadow-[0_0_18px_rgba(34,211,238,0.4)] font-display">Q</span>
            <span className="font-display text-base font-semibold tracking-tight">DataQuery<span className="text-brand"> AI</span></span>
          </Link>

          {user && (
            <button
              onClick={openSearch}
              className="hidden flex-1 max-w-[420px] mx-7 items-center gap-2.5 rounded-xl bg-surface-1 border border-border px-3.5 py-2 sm:flex hover:border-border-2 transition-colors"
            >
              <span className="text-muted-2 text-sm">&#x1F50D;</span>
              <span className="text-[13.5px] text-muted-2 flex-1 text-left">Search sources, dashboards, history…</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md bg-surface-2 border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-2">Ctrl K</kbd>
            </button>
          )}

          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand px-4 py-2 text-[13.5px] font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60">
                  {uploading ? (<span className="inline-flex items-center gap-1.5"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" />Uploading…</span>) : (<>&#xFF0B; Upload data</>)}
                </button>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.jsonl,.tsv,.parquet,.xml,.pdf,.docx,.txt,.html" className="hidden" onChange={handleFileChange} />
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-accent-emerald to-brand text-[13px] font-bold text-[#050710]">
                  {user.email?.slice(0, 2).toUpperCase() || "U"}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-muted hover:text-ink transition-colors">Sign in</Link>
                <Link to="/signup" className="rounded-xl bg-surface-2 border border-border-2 px-4 py-2 font-semibold text-ink hover:bg-surface-3 transition-colors">Launch app</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ──── Search Modal ──── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/50 backdrop-blur-sm animate-fade-in">
          <div ref={searchRef} className="w-full max-w-[560px] rounded-2xl border border-border bg-[rgba(12,16,28,0.97)] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="text-muted-2 text-sm">&#x1F50D;</span>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search datasets, dashboards, queries…"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted-2 outline-none"
              />
              <button onClick={() => setSearchOpen(false)} className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs text-muted-2 font-mono">Esc</button>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                </div>
              ) : !hasResults && searchQuery ? (
                <p className="text-center text-sm text-muted py-8">No results for &ldquo;{searchQuery}&rdquo;</p>
              ) : (
                <>
                  {filtered.sources.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Datasets</p>
                      {filtered.sources.map((s) => (
                        <button key={s.id} onClick={() => { setSearchOpen(false); onOpenTool?.("excel"); }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 transition-colors">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-emerald/10 text-[9px] font-bold font-mono text-accent-emerald border border-accent-emerald/20">{(s.kind || "F").slice(0, 3).toUpperCase()}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                            <p className="text-[11px] text-muted-2">{s.row_count ? `${s.row_count.toLocaleString()} rows` : s.kind}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {filtered.dashboards.length > 0 && (
                    <div className="mb-2">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Dashboards</p>
                      {filtered.dashboards.map((d) => (
                        <button key={d.id} onClick={() => { setSearchOpen(false); onOpenTool?.("dashboard"); }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 transition-colors">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-indigo/10 text-[9px] font-bold font-mono text-[#A5B4FC] border border-accent-indigo/20">BI</span>
                          <p className="text-sm font-medium text-ink truncate">{d.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {filtered.history.length > 0 && (
                    <div>
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Recent Queries</p>
                      {filtered.history.map((h) => (
                        <button key={h.id} onClick={() => { setSearchOpen(false); onSelectSection?.("history"); }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2 transition-colors">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-[9px] font-bold font-mono text-brand border border-brand/20">Q</span>
                          <p className="text-sm font-medium text-ink truncate">{h.question || "Query"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searchQuery && !hasResults && (
                    <p className="text-center text-sm text-muted py-8">Start typing to search…</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
