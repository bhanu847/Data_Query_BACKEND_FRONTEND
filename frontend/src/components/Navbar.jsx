import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
              <Link
                to="/app"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand px-4 py-2 text-[13.5px] font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform"
              >
                &#xFF0B; Upload data
              </Link>
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
