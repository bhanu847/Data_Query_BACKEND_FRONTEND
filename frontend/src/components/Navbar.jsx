import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar({ onUploadFile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !onUploadFile) return;
    setUploading(true);
    try {
      await onUploadFile(file);
    } catch {
      /* tool will show its own error */
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[rgba(8,11,20,0.55)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-gradient-brand text-sm font-bold text-[#050710] shadow-[0_0_18px_rgba(34,211,238,0.4)] font-display">
            Q
          </span>
          <span className="font-display text-base font-semibold tracking-tight">
            DataQuery<span className="text-brand"> AI</span>
          </span>
        </Link>

        {user && (
          <div className="hidden flex-1 max-w-[420px] mx-7 items-center gap-2.5 rounded-xl bg-surface-1 border border-border px-3.5 py-2 sm:flex">
            <span className="text-muted-2 text-sm">&#x1F50D;</span>
            <span className="text-[13.5px] text-muted-2">Search sources, dashboards, history…</span>
          </div>
        )}

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand px-4 py-2 text-[13.5px] font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform disabled:opacity-60"
              >
                {uploading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" />
                    Uploading…
                  </span>
                ) : (
                  <>&#xFF0B; Upload data</>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,.jsonl,.tsv,.parquet,.xml,.pdf,.docx,.txt,.html"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-accent-emerald to-brand text-[13px] font-bold text-[#050710]">
                {user.email?.slice(0, 2).toUpperCase() || "U"}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-muted hover:text-ink transition-colors">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-xl bg-surface-2 border border-border-2 px-4 py-2 font-semibold text-ink hover:bg-surface-3 transition-colors">
                Launch app
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
