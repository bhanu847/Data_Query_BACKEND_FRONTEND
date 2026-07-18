import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExcelLiveStatus } from "../services/api";

const MANIFEST_DOWNLOAD_PATH = "/dataquery-excel-live-manifest.xml";
const SIDELOAD_DOCS_URL =
  "https://learn.microsoft.com/en-us/office/dev/add-ins/testing/test-debug-office-add-ins";

export default function ExcelLiveOnboarding() {
  const [status, setStatus] = useState({ loading: true, connected: false, last_active_at: null });
  const [devExpanded, setDevExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = () => {
      getExcelLiveStatus()
        .then((data) => { if (active) setStatus({ loading: false, ...data }); })
        .catch(() => { if (active) setStatus((s) => ({ ...s, loading: false })); });
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div className="bg-scene">
        <div className="orb-a" />
        <div className="orb-b" />
        <div className="orb-c" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <Link to="/app" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          ← Back to Workspace
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 border border-brand/30 text-[11px] font-bold font-mono text-brand shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            XLS
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">Excel Live</h1>
        </div>
        <p className="text-sm text-muted mb-6">
          Work on the workbook you already have open in Microsoft Excel — the AI reads, writes,
          and formats live cells through a chat sidebar, with your confirmation before any
          destructive change.
        </p>

        <ConnectionBanner status={status} />

        <div className="space-y-4 mt-6">
          <Step number={1} title="Install DataQuery AI for Excel">
            <p className="text-sm text-muted mb-3">
              Get the add-in from AppSource, or sideload it yourself for local development.
            </p>
            <button
              type="button"
              disabled
              title="AppSource listing coming soon — use Developer install below"
              className="rounded-xl bg-surface-2 border border-border px-4 py-2.5 text-sm font-medium text-muted cursor-not-allowed"
            >
              Install from AppSource (coming soon)
            </button>

            <div className="mt-3 rounded-xl border border-border bg-surface-2/60">
              <button
                type="button"
                onClick={() => setDevExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-ink"
              >
                Developer install
                <span className="text-muted-2">{devExpanded ? "−" : "+"}</span>
              </button>
              {devExpanded && (
                <div className="px-4 pb-4 space-y-2 text-sm text-muted">
                  <a
                    href={MANIFEST_DOWNLOAD_PATH}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 border border-brand/25 px-3.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors"
                  >
                    Download manifest.xml
                  </a>
                  <p>
                    Then follow Microsoft's{" "}
                    <a
                      href={SIDELOAD_DOCS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      sideloading instructions
                    </a>{" "}
                    to load it into Excel Desktop or Excel on the web for local testing.
                  </p>
                </div>
              )}
            </div>
          </Step>

          <Step number={2} title="Open Excel → Home ribbon → DataQuery AI">
            <p className="text-sm text-muted mb-3">
              Once installed, a "DataQuery AI" button appears on the Home ribbon. Click it to
              open the chat sidebar.
            </p>
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border-2 bg-surface-2/40 text-xs text-muted-2">
              Ribbon screenshot placeholder
            </div>
          </Step>

          <Step number={3} title="Sign in with your DataQuery account inside Excel">
            <p className="text-sm text-muted">
              The sidebar shows a sign-in form the first time you use it. Use the same email
              and password as this web app — your Excel connection then appears as a source in
              your workspace.
            </p>
          </Step>
        </div>
      </div>
    </div>
  );
}

function ConnectionBanner({ status }) {
  if (status.loading) {
    return <div className="h-12 rounded-xl bg-surface-1 border border-border animate-pulse" />;
  }
  if (status.connected) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/25 bg-accent-emerald/10 px-4 py-2.5">
        <span className="text-sm font-medium text-accent-emerald">Connected ✓</span>
        <span className="text-xs text-muted-2">— last active {relativeTime(status.last_active_at)}</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface-1 px-4 py-2.5">
      <span className="text-sm text-muted">Not connected yet — finish the steps below in Excel.</span>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 border border-brand/30 text-xs font-bold text-brand">
          {number}
        </span>
        <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function relativeTime(dateStr) {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
