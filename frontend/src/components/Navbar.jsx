import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            DQ
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">DataQuery AI</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link to="/app" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:text-ink">
                Workspace
              </Link>
              <span className="hidden text-slate-400 sm:inline">{user.email}</span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:text-ink">
                Log in
              </Link>
              <Link to="/signup" className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
