import { useState, useEffect, useCallback } from "react";
import {
  listSources, deleteSource, generateDashboard, getSourceColumns,
  getChartData, getKpiData, saveDashboard, listDashboards, getDashboard, updateDashboard, deleteDashboard,
} from "../services/api";
import DashboardCanvas from "../components/DashboardCanvas";
import AddChartModal from "../components/AddChartModal";
import KpiBuilder from "../components/KpiBuilder";
import FilterPanel from "../components/FilterPanel";
import DashboardTemplates from "../components/DashboardTemplates";

export default function DashboardTool({ onBack }) {
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Dashboard state
  const [mode, setMode] = useState("select"); // select | template | builder
  const [columns, setColumns] = useState([]);
  const [dtypes, setDtypes] = useState({});
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [layout, setLayout] = useState([]);
  const [filters, setFilters] = useState({});
  const [dashboardName, setDashboardName] = useState("My Dashboard");
  const [dashboardId, setDashboardId] = useState(null);
  const [insights, setInsights] = useState([]);

  // Modals
  const [showAddChart, setShowAddChart] = useState(false);
  const [showKpiBuilder, setShowKpiBuilder] = useState(false);
  const [editChartIndex, setEditChartIndex] = useState(null);

  // Saved dashboards
  const [savedDashboards, setSavedDashboards] = useState([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingSources(true);
    listSources()
      .then(setSources)
      .catch(() => setSources([]))
      .finally(() => setLoadingSources(false));
  }, []);

  const loadColumns = useCallback(async (sourceId) => {
    try {
      const res = await getSourceColumns(sourceId);
      setColumns(res.columns);
      setDtypes(res.dtypes);
    } catch {
      setColumns([]);
      setDtypes({});
    }
  }, []);

  const handleSelectSource = useCallback((id) => {
    setSelectedSource(id);
    setError("");
    loadColumns(id);
  }, [loadColumns]);

  // AI Auto Dashboard
  const generateAuto = async () => {
    if (!selectedSource) return;
    setError("");
    setGenerating(true);
    try {
      const res = await generateDashboard(selectedSource);
      const autoCharts = (res.charts || []).map((c) => ({
        ...c, chart_type: c.type, x_column: c.x, y_column: c.y,
      }));
      const autoKpis = (res.kpis || []).map((k, i) => ({
        ...k, icon: ["$", "#", "↑", "★", "●"][i % 5],
        color: ["brand", "green", "purple", "orange", "teal"][i % 5],
      }));
      setCharts(autoCharts);
      setKpis(autoKpis);
      setLayout([]);
      setInsights(res.insights || []);
      setDashboardName(`${res.title || "AI Dashboard"}`);
      setMode("builder");
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Template
  const handleTemplate = useCallback(async (template) => {
    if (!selectedSource) return;
    setGenerating(true);
    setError("");
    try {
      const numCols = columns.filter((c) => dtypes[c] === "numeric");
      const catCols = columns.filter((c) => dtypes[c] === "categorical");
      const dateCols = columns.filter((c) => dtypes[c] === "datetime");

      const resolveCol = (auto) => {
        if (!auto) return null;
        if (auto === "first_numeric") return numCols[0] || null;
        if (auto === "second_numeric") return numCols[1] || numCols[0] || null;
        if (auto === "first_categorical") return catCols[0] || null;
        if (auto === "second_categorical") return catCols[1] || catCols[0] || null;
        if (auto === "datetime") return dateCols[0] || null;
        return auto;
      };

      const resolvedCharts = [];
      for (const tChart of template.config.charts || []) {
        const xCol = resolveCol(tChart.auto_x);
        const yCol = resolveCol(tChart.auto_y);
        if (!xCol && !yCol) continue;
        try {
          const res = await getChartData({
            source_id: selectedSource,
            chart_type: tChart.chart_type,
            x_column: xCol,
            y_column: yCol,
            aggregation: tChart.aggregation || "sum",
            sort_order: tChart.sort_order,
            limit: tChart.limit,
          });
          resolvedCharts.push({ ...res, chart_type: res.chart_type || tChart.chart_type, x_column: xCol, y_column: yCol, aggregation: tChart.aggregation || "sum" });
        } catch {
          // skip chart if data incompatible
        }
      }

      const resolvedKpis = [];
      for (const tKpi of template.config.kpis || []) {
        const col = resolveCol(tKpi.auto_column);
        if (!col) continue;
        try {
          const res = await getKpiData({ source_id: selectedSource, column: col, aggregation: tKpi.aggregation || "sum" });
          resolvedKpis.push({ ...res, label: tKpi.label || res.label, icon: tKpi.icon || "$", color: tKpi.color || "brand" });
        } catch {
          // skip
        }
      }

      setCharts(resolvedCharts);
      setKpis(resolvedKpis);
      setLayout([]);
      setDashboardName(`${template.label}`);
      setMode("builder");
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [selectedSource, columns, dtypes]);

  // Add chart
  const handleAddChart = useCallback((chartData) => {
    if (editChartIndex !== null) {
      setCharts((prev) => prev.map((c, i) => i === editChartIndex ? chartData : c));
      setEditChartIndex(null);
    } else {
      setCharts((prev) => [...prev, chartData]);
    }
    setShowAddChart(false);
  }, [editChartIndex]);

  const handleEditChart = useCallback((index) => {
    setEditChartIndex(index);
    setShowAddChart(true);
  }, []);

  const handleDuplicateChart = useCallback((index) => {
    setCharts((prev) => [...prev, { ...prev[index] }]);
  }, []);

  const handleDeleteChart = useCallback((index) => {
    setCharts((prev) => prev.filter((_, i) => i !== index));
    setLayout((prev) => prev.filter((l) => l.i !== `chart-${index}`));
  }, []);

  const handleAddKpi = useCallback((kpiData) => {
    setKpis((prev) => [...prev, kpiData]);
    setShowKpiBuilder(false);
  }, []);

  const handleDeleteKpi = useCallback((index) => {
    setKpis((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Filters — re-fetch all chart data with filters applied
  const handleFiltersChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    if (Object.keys(newFilters).length === 0 && Object.keys(filters).length === 0) return;

    const updatedCharts = [];
    for (const chart of charts) {
      try {
        const res = await getChartData({
          source_id: selectedSource,
          chart_type: chart.chart_type || chart.type,
          x_column: chart.x_column || chart.x,
          y_column: chart.y_column || chart.y,
          aggregation: chart.aggregation || "sum",
          sort_order: chart.sort_order,
          limit: chart.limit,
          filters: Object.keys(newFilters).length > 0 ? newFilters : undefined,
        });
        updatedCharts.push({ ...chart, ...res, chart_type: chart.chart_type || chart.type });
      } catch {
        updatedCharts.push(chart);
      }
    }
    setCharts(updatedCharts);
  }, [charts, selectedSource, filters]);

  // Save / Load
  const handleSave = async () => {
    if (!selectedSource) return;
    setSaving(true);
    try {
      const config = {
        charts: charts.map(({ data, ...rest }) => rest),
        kpis,
        layout,
        filters,
      };
      if (dashboardId) {
        await updateDashboard(dashboardId, { name: dashboardName, config });
      } else {
        const res = await saveDashboard({ source_id: selectedSource, name: dashboardName, config });
        setDashboardId(res.id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const loadSavedDashboards = async () => {
    try {
      const list = await listDashboards();
      setSavedDashboards(list);
      setShowSavedList(true);
    } catch {
      setSavedDashboards([]);
    }
  };

  const handleLoadDashboard = async (db) => {
    setShowSavedList(false);
    setGenerating(true);
    try {
      setSelectedSource(db.source_id);
      setDashboardId(db.id);
      setDashboardName(db.name);
      await loadColumns(db.source_id);

      const config = db.config;
      setKpis(config.kpis || []);
      setLayout(config.layout || []);
      setFilters(config.filters || {});

      // Re-fetch chart data
      const loadedCharts = [];
      for (const chart of config.charts || []) {
        try {
          const res = await getChartData({
            source_id: db.source_id,
            chart_type: chart.chart_type || chart.type,
            x_column: chart.x_column || chart.x,
            y_column: chart.y_column || chart.y,
            aggregation: chart.aggregation || "sum",
            sort_order: chart.sort_order,
            limit: chart.limit,
            filters: config.filters && Object.keys(config.filters).length > 0 ? config.filters : undefined,
          });
          loadedCharts.push({ ...chart, ...res });
        } catch {
          loadedCharts.push(chart);
        }
      }
      setCharts(loadedCharts);
      setMode("builder");
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteDashboard = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteDashboard(id);
      setSavedDashboards((prev) => prev.filter((d) => d.id !== id));
      if (dashboardId === id) {
        setDashboardId(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBackToSelect = () => {
    setMode("select");
    setCharts([]);
    setKpis([]);
    setLayout([]);
    setFilters({});
    setInsights([]);
    setDashboardId(null);
  };

  // ---- Builder mode ----
  if (mode === "builder") {
    return (
      <div className="space-y-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToSelect} className="text-sm text-muted hover:text-ink">← Back</button>
            <input
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              className="font-display text-xl font-semibold text-ink bg-transparent border-b border-transparent hover:border-border-2 focus:border-brand/50 focus:outline-none px-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowAddChart(true)}
              className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-[#050710] shadow-glow-sm hover:-translate-y-0.5 transition-transform flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Chart
            </button>
            <button onClick={() => setShowKpiBuilder(true)}
              className="rounded-xl bg-accent-violet px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add KPI
            </button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl bg-accent-emerald px-4 py-2 text-sm font-semibold text-[#050710] hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {saving ? "Saving..." : dashboardId ? "Update" : "Save"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-accent-rose">{error}</p>}

        {/* Filters */}
        {columns.length > 0 && (
          <FilterPanel sourceId={selectedSource} columns={columns} dtypes={dtypes} filters={filters} onFiltersChange={handleFiltersChange} />
        )}

        {/* Dashboard Canvas */}
        <DashboardCanvas
          charts={charts}
          kpis={kpis}
          layout={layout}
          onLayoutChange={setLayout}
          onEditChart={handleEditChart}
          onDuplicateChart={handleDuplicateChart}
          onDeleteChart={handleDeleteChart}
          onDeleteKpi={handleDeleteKpi}
          insights={insights}
        />

        {/* Modals */}
        {showAddChart && (
          <AddChartModal
            sourceId={selectedSource}
            columns={columns}
            dtypes={dtypes}
            onAdd={handleAddChart}
            onClose={() => { setShowAddChart(false); setEditChartIndex(null); }}
            editChart={editChartIndex !== null ? charts[editChartIndex] : null}
          />
        )}
        {showKpiBuilder && (
          <KpiBuilder
            sourceId={selectedSource}
            columns={columns}
            dtypes={dtypes}
            onAdd={handleAddKpi}
            onClose={() => setShowKpiBuilder(false)}
          />
        )}
      </div>
    );
  }

  // ---- Template selection mode ----
  if (mode === "template") {
    return (
      <div className="space-y-5">
        <div>
          <button onClick={() => setMode("select")} className="mb-1 text-sm text-muted hover:text-ink">← Back</button>
          <h2 className="font-display text-xl font-semibold text-ink">Dashboard Templates</h2>
          <p className="text-sm text-muted">Choose a template to auto-populate your dashboard.</p>
        </div>
        {generating && (
          <div className="flex items-center gap-3 rounded-xl bg-accent-violet/10 border border-accent-violet/25 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
            <span className="text-sm text-accent-violet">Building dashboard from template...</span>
          </div>
        )}
        {error && <p className="text-sm text-accent-rose">{error}</p>}
        <DashboardTemplates onSelect={handleTemplate} />
      </div>
    );
  }

  // ---- Source selection mode ----
  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="mb-1 text-sm text-muted hover:text-ink">← Back to Tools</button>
        <h2 className="font-display text-xl font-semibold text-ink">Dashboard Builder</h2>
        <p className="text-sm text-muted">Create custom dashboards with full control over charts, KPIs, and layout.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Select a data source</h3>

        {loadingSources ? (
          <p className="text-sm text-muted-2 animate-pulse">Loading sources...</p>
        ) : sources.length === 0 ? (
          <div className="rounded-xl bg-surface-1 border border-border p-5 text-center">
            <p className="text-sm text-muted">No data sources yet.</p>
            <p className="mt-1 text-xs text-muted-2">Upload an Excel or CSV file first using "Chat with Data".</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sources.map((src) => (
              <div key={src.id} onClick={() => handleSelectSource(src.id)}
                className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
                  selectedSource === src.id ? "border-brand bg-brand/10 text-brand" : "border-border hover:bg-surface-1 text-ink"
                }`}>
                <span className="font-medium flex-1 truncate">{src.name || `Source ${src.id}`}</span>
                <span className="text-xs text-muted-2">{src.kind || "file"}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSource(src.id).then(() => setSources((prev) => prev.filter((s) => s.id !== src.id))); }}
                  className="shrink-0 rounded p-1 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose transition-all" title="Delete source">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-accent-rose">{error}</p>}

        {selectedSource && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={generateAuto} disabled={generating}
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white hover:-translate-y-0.5 disabled:opacity-50">
              {generating ? "Generating..." : "AI Auto Dashboard"}
            </button>
            <button onClick={() => setMode("template")} disabled={generating}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              Use Template
            </button>
            <button onClick={() => { setCharts([]); setKpis([]); setLayout([]); setMode("builder"); }} disabled={generating}
              className="rounded-xl bg-surface-2 border border-border px-5 py-2.5 text-sm font-medium text-white hover:bg-surface-3 disabled:opacity-50">
              Blank Dashboard
            </button>
            <button onClick={loadSavedDashboards}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-ink hover:bg-surface-1">
              Load Saved
            </button>
          </div>
        )}

        {generating && (
          <div className="flex items-center gap-3 rounded-xl bg-accent-violet/10 border border-accent-violet/25 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
            <span className="text-sm text-accent-violet">AI is analyzing your data and building charts...</span>
          </div>
        )}
      </div>

      {/* Saved dashboards modal */}
      {showSavedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-2xl bg-surface-1 shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-ink">Saved Dashboards</h3>
              <button onClick={() => setShowSavedList(false)} className="rounded-lg p-1 hover:bg-surface-2 text-muted-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-2">
              {savedDashboards.length === 0 ? (
                <p className="text-sm text-muted-2 text-center py-4">No saved dashboards yet.</p>
              ) : savedDashboards.map((db) => (
                <div key={db.id} onClick={() => handleLoadDashboard(db)}
                  className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer hover:bg-surface-1 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{db.name}</p>
                    <p className="text-xs text-muted-2">{new Date(db.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={(e) => handleDeleteDashboard(db.id, e)}
                    className="shrink-0 rounded p-1 text-muted-2 opacity-0 group-hover:opacity-100 hover:bg-accent-rose/10 hover:text-accent-rose transition-all">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}