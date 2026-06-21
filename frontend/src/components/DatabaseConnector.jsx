import { useState } from "react";
import { connectPostgres, connectMySQL, connectMongoDB, listSources } from "../services/api";

const SOURCE_TABS = [
  { key: "existing", label: "Existing Data",  icon: "◫", color: "#22D3EE" },
  { key: "sql",      label: "SQL Database",   icon: "SQL", color: "#38BDF8" },
  { key: "mongodb",  label: "MongoDB",        icon: "DB",  color: "#4ADE80" },
];

const SQL_TYPES = [
  { key: "postgres", label: "PostgreSQL", port: "5432" },
  { key: "mysql",    label: "MySQL",      port: "3306" },
];

const KIND_BADGE = {
  csv: "CSV", excel: "XLS", json: "JSON", pdf: "PDF", tsv: "TSV",
  parquet: "PAR", mongodb: "DB", sql: "SQL", xml: "XML", text: "TXT",
  postgres: "PG", mysql: "MY",
};

export default function DatabaseConnector({ onSourceSelected, onUploadClick, sources, loadingSources, children }) {
  const [activeTab, setActiveTab] = useState("existing");

  // SQL state
  const [sqlType, setSqlType] = useState("postgres");
  const [sqlForm, setSqlForm] = useState({ host: "", port: "5432", database: "", username: "", password: "" });
  const [sqlConnecting, setSqlConnecting] = useState(false);
  const [sqlError, setSqlError] = useState("");

  // MongoDB state
  const [mongoForm, setMongoForm] = useState({ host: "", port: "27017", database: "", username: "", password: "", auth_source: "admin" });
  const [mongoConnecting, setMongoConnecting] = useState(false);
  const [mongoError, setMongoError] = useState("");

  const handleSqlConnect = async () => {
    setSqlError("");
    setSqlConnecting(true);
    try {
      const fn = sqlType === "mysql" ? connectMySQL : connectPostgres;
      const res = await fn(sqlForm);
      const id = res.source_id || res.id;
      onSourceSelected({ id, name: `${sqlType}://${sqlForm.database}`, kind: sqlType, row_count: res.row_count });
    } catch (e) {
      setSqlError(e.message);
    } finally {
      setSqlConnecting(false);
    }
  };

  const handleMongoConnect = async () => {
    setMongoError("");
    setMongoConnecting(true);
    try {
      const res = await connectMongoDB(mongoForm);
      const id = res.source_id || res.id;
      onSourceSelected({ id, name: `mongodb://${mongoForm.database}`, kind: "mongodb", row_count: res.row_count });
    } catch (e) {
      setMongoError(e.message);
    } finally {
      setMongoConnecting(false);
    }
  };

  const updateSql = (key, val) => setSqlForm((p) => ({ ...p, [key]: val }));
  const updateMongo = (key, val) => setMongoForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {SOURCE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold font-mono" style={{ background: `${t.color}18`, color: t.color }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Existing Data Tab ── */}
      {activeTab === "existing" && (
        <div className="space-y-3">
          {children}

          {loadingSources ? (
            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-surface-2 animate-pulse" />)}</div>
          ) : sources && sources.length > 0 ? (
            <div className="rounded-2xl border border-border bg-surface-1 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Previously uploaded datasets</p>
              <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {sources.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => onSourceSelected(src)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-left hover:border-brand/30 hover:bg-brand/[0.04] transition-all"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-emerald/10 text-[9px] font-bold font-mono text-accent-emerald border border-accent-emerald/20">
                      {KIND_BADGE[src.kind] || "F"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">{src.name || `Source ${src.id}`}</p>
                      <p className="text-[11px] text-muted-2">{src.row_count ? `${src.row_count.toLocaleString()} rows` : src.kind || "file"}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Select →</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── SQL Tab ── */}
      {activeTab === "sql" && (
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
          <div className="flex gap-2">
            {SQL_TYPES.map((db) => (
              <button
                key={db.key}
                onClick={() => { setSqlType(db.key); updateSql("port", db.port); }}
                className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                  sqlType === db.key ? "border-brand bg-brand/10 text-brand" : "border-border text-muted hover:bg-surface-2"
                }`}
              >
                {db.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "host", label: "Host", placeholder: "localhost", full: false },
              { key: "port", label: "Port", placeholder: sqlType === "mysql" ? "3306" : "5432", full: false },
              { key: "database", label: "Database", placeholder: "my_database", full: false },
              { key: "username", label: "Username", placeholder: "postgres", full: false },
            ].map((f) => (
              <label key={f.key} className={f.full ? "col-span-2" : ""}>
                <span className="text-xs font-medium text-muted mb-1 block">{f.label}</span>
                <input
                  type="text"
                  value={sqlForm[f.key]}
                  onChange={(e) => updateSql(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                />
              </label>
            ))}
            <label className="col-span-2">
              <span className="text-xs font-medium text-muted mb-1 block">Password</span>
              <input
                type="password"
                value={sqlForm.password}
                onChange={(e) => updateSql("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
          </div>

          {sqlError && <p className="text-sm text-accent-rose">{sqlError}</p>}

          <button
            onClick={handleSqlConnect}
            disabled={sqlConnecting || !sqlForm.host || !sqlForm.database}
            className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform"
          >
            {sqlConnecting ? (
              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" /> Connecting…</span>
            ) : `Connect to ${sqlType === "mysql" ? "MySQL" : "PostgreSQL"}`}
          </button>
        </div>
      )}

      {/* ── MongoDB Tab ── */}
      {activeTab === "mongodb" && (
        <div className="rounded-2xl border border-border bg-surface-1 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-lime/10 text-[9px] font-bold font-mono text-accent-lime border border-accent-lime/20">DB</span>
            <p className="text-sm font-semibold text-ink">MongoDB Connection</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "host", label: "Host", placeholder: "localhost" },
              { key: "port", label: "Port", placeholder: "27017" },
              { key: "database", label: "Database", placeholder: "my_database" },
              { key: "username", label: "Username (optional)", placeholder: "admin" },
            ].map((f) => (
              <label key={f.key}>
                <span className="text-xs font-medium text-muted mb-1 block">{f.label}</span>
                <input
                  type="text"
                  value={mongoForm[f.key]}
                  onChange={(e) => updateMongo(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
                />
              </label>
            ))}
            <label>
              <span className="text-xs font-medium text-muted mb-1 block">Password (optional)</span>
              <input
                type="password"
                value={mongoForm.password}
                onChange={(e) => updateMongo("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
            <label>
              <span className="text-xs font-medium text-muted mb-1 block">Auth Source</span>
              <input
                type="text"
                value={mongoForm.auth_source}
                onChange={(e) => updateMongo("auth_source", e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
            </label>
          </div>

          {mongoError && <p className="text-sm text-accent-rose">{mongoError}</p>}

          <button
            onClick={handleMongoConnect}
            disabled={mongoConnecting || !mongoForm.host || !mongoForm.database}
            className="rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 disabled:opacity-50 transition-transform"
          >
            {mongoConnecting ? (
              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#050710]/30 border-t-[#050710]" /> Connecting…</span>
            ) : "Connect to MongoDB"}
          </button>
        </div>
      )}
    </div>
  );
}
