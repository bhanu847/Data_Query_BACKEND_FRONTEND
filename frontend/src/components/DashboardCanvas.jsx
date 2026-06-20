import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GridLayout } from "react-grid-layout";
import AutoChart from "../charts/AutoChart";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const KPI_COLORS = {
  brand:  { bg: "bg-brand/10",          text: "text-brand",          border: "border-brand/25" },
  green:  { bg: "bg-accent-emerald/10", text: "text-accent-emerald", border: "border-accent-emerald/25" },
  purple: { bg: "bg-accent-violet/10",  text: "text-accent-violet",  border: "border-accent-violet/25" },
  orange: { bg: "bg-accent-orange/10",  text: "text-accent-orange",  border: "border-accent-orange/25" },
  red:    { bg: "bg-accent-rose/10",    text: "text-accent-rose",    border: "border-accent-rose/25" },
  teal:   { bg: "bg-accent-teal/10",    text: "text-accent-teal",    border: "border-accent-teal/25" },
};

const COLS = 12;

export default function DashboardCanvas({
  charts, kpis, layout, onLayoutChange,
  onEditChart, onDuplicateChart, onDeleteChart, onDeleteKpi,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const w = containerRef.current?.offsetWidth;
      if (w && w > 0) setContainerWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const kpiItems = useMemo(() =>
    kpis.map((kpi, i) => ({ ...kpi, layoutId: `kpi-${i}` })), [kpis]);
  const chartItems = useMemo(() =>
    charts.map((chart, i) => ({ ...chart, layoutId: `chart-${i}` })), [charts]);
  const allItems = useMemo(() => [...kpiItems, ...chartItems], [kpiItems, chartItems]);

  const buildDefault = useCallback(() => {
    const items = [];
    kpiItems.forEach((kpi, i) => {
      items.push({ i: kpi.layoutId, x: (i % 4) * 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 });
    });
    const yStart = kpiItems.length > 0 ? 2 : 0;
    chartItems.forEach((chart, i) => {
      items.push({ i: chart.layoutId, x: (i % 2) * 6, y: yStart + Math.floor(i / 2) * 5, w: 6, h: 5, minW: 3, minH: 3 });
    });
    return items;
  }, [kpiItems, chartItems]);

  const currentLayout = useMemo(() => {
    const def = buildDefault();
    if (!layout || layout.length === 0) return def;
    const validIds = new Set(allItems.map((it) => it.layoutId));
    const kept = layout.filter((l) => validIds.has(l.i));
    const keptIds = new Set(kept.map((l) => l.i));
    const added = def.filter((l) => !keptIds.has(l.i));
    return [...kept, ...added];
  }, [layout, allItems, buildDefault]);

  const handleLayoutChange = useCallback((newLayout) => {
    if (onLayoutChange) onLayoutChange(newLayout);
  }, [onLayoutChange]);

  if (allItems.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-border bg-surface-1/50">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink">Your dashboard is empty</p>
        <p className="text-xs text-muted mt-1">Click <strong>Add Chart</strong> or <strong>Add KPI</strong> above to get started</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-[400px]">
      <GridLayout
        width={containerWidth}
        className="dashboard-grid"
        layout={currentLayout}
        cols={COLS}
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
        isDraggable
        isResizable
        margin={[14, 14]}
        useCSSTransforms
      >
        {allItems.map((item) => {
          if (item.layoutId.startsWith("kpi-")) {
            const kpiIndex = kpiItems.indexOf(item);
            const colorDef = (typeof item.color === "string" ? KPI_COLORS[item.color] : item.color) || KPI_COLORS.brand;
            return (
              <div key={item.layoutId} className="group">
                <div className={`h-full rounded-2xl border p-4 ${colorDef.bg} ${colorDef.border} relative cursor-grab active:cursor-grabbing`}>
                  <div className="flex items-start gap-3 h-full">
                    <span className={`text-xl font-bold ${colorDef.text}`}>{item.icon || "$"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-2 truncate">{item.label}</p>
                      <p className={`font-display text-2xl font-semibold mt-1 ${colorDef.text}`}>{item.value}</p>
                    </div>
                    {onDeleteKpi && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteKpi(kpiIndex); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-2 hover:bg-accent-rose/10 hover:text-accent-rose transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          const chartIndex = chartItems.indexOf(item);
          const chartSpec = {
            type: item.chart_type || item.type,
            title: item.title,
            x: item.x,
            y: item.y,
            data: item.data,
          };

          return (
            <div key={item.layoutId} className="group cursor-grab active:cursor-grabbing">
              <div className="h-full relative rounded-2xl border border-border bg-surface-1 overflow-hidden">
                <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditChart && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditChart(chartIndex); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 bg-surface-2 hover:bg-surface-3 text-muted hover:text-ink transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {onDuplicateChart && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicateChart(chartIndex); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 bg-surface-2 hover:bg-surface-3 text-muted hover:text-ink transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                  {onDeleteChart && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChart(chartIndex); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 bg-surface-2 hover:bg-accent-rose/20 text-muted hover:text-accent-rose transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <AutoChart spec={chartSpec} height="100%" />
              </div>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
