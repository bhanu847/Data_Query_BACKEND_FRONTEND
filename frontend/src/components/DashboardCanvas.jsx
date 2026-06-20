import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { GridLayout } from "react-grid-layout";
import AutoChart from "../charts/AutoChart";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const KPI_COLORS = {
  brand:  { bg: "rgba(34,211,238,0.08)",  text: "#22D3EE", border: "rgba(34,211,238,0.2)",  glow: "rgba(34,211,238,0.3)" },
  green:  { bg: "rgba(52,211,153,0.08)",   text: "#34D399", border: "rgba(52,211,153,0.2)",  glow: "rgba(52,211,153,0.3)" },
  purple: { bg: "rgba(167,139,250,0.08)",  text: "#A78BFA", border: "rgba(167,139,250,0.2)", glow: "rgba(167,139,250,0.3)" },
  orange: { bg: "rgba(251,146,60,0.08)",   text: "#FB923C", border: "rgba(251,146,60,0.2)",  glow: "rgba(251,146,60,0.3)" },
  red:    { bg: "rgba(251,113,133,0.08)",  text: "#FB7185", border: "rgba(251,113,133,0.2)", glow: "rgba(251,113,133,0.3)" },
  teal:   { bg: "rgba(45,212,191,0.08)",   text: "#2DD4BF", border: "rgba(45,212,191,0.2)",  glow: "rgba(45,212,191,0.3)" },
};

const COLS = 12;
const ROW_H = 50;

export default function DashboardCanvas({
  charts, kpis, layout, onLayoutChange,
  onEditChart, onDuplicateChart, onDeleteChart, onDeleteKpi,
  insights,
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

  const chartLayout = useMemo(() => {
    const def = charts.map((_, i) => ({
      i: `chart-${i}`, x: (i % 2) * 6, y: Math.floor(i / 2) * 6, w: 6, h: 6, minW: 3, minH: 4,
    }));
    if (!layout || layout.length === 0) return def;
    const kept = layout.filter((l) => l.i.startsWith("chart-"));
    const keptIds = new Set(kept.map((l) => l.i));
    const added = def.filter((l) => !keptIds.has(l.i));
    const validIds = new Set(charts.map((_, i) => `chart-${i}`));
    return [...kept.filter((l) => validIds.has(l.i)), ...added];
  }, [charts, layout]);

  const handleChartLayoutChange = useCallback((newLayout) => {
    if (onLayoutChange) onLayoutChange(newLayout);
  }, [onLayoutChange]);

  const hasKpis = kpis.length > 0;
  const hasCharts = charts.length > 0;
  const isEmpty = !hasKpis && !hasCharts;

  if (isEmpty) {
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
    <div ref={containerRef} className="space-y-4">
      {/* ═══ KPI ROW — fixed horizontal strip, value-only cards ═══ */}
      {hasKpis && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-2 mb-2.5 px-1">Key Metrics</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)` }}>
            {kpis.map((kpi, i) => {
              const c = (typeof kpi.color === "string" ? KPI_COLORS[kpi.color] : null) || KPI_COLORS.brand;
              return (
                <div
                  key={`kpi-${i}`}
                  className="group relative rounded-2xl border p-4 transition-all hover:scale-[1.02]"
                  style={{ background: c.bg, borderColor: c.border }}
                >
                  {/* glow */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[30px] opacity-40 pointer-events-none" style={{ background: c.glow }} />

                  <div className="relative flex items-center gap-3">
                    <span className="text-xl font-bold" style={{ color: c.text }}>{kpi.icon || "$"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-2 truncate">{kpi.label}</p>
                      <p className="font-display text-[22px] font-bold mt-0.5 leading-tight" style={{ color: c.text }}>
                        {kpi.value}
                      </p>
                    </div>
                    {onDeleteKpi && (
                      <button
                        onClick={() => onDeleteKpi(i)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1 text-muted-2 hover:bg-accent-rose/10 hover:text-accent-rose transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ AUTO INSIGHTS ═══ */}
      {insights && insights.length > 0 && (
        <div className="rounded-2xl border border-brand/20 bg-brand/[0.04] p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto Insights
          </p>
          <ul className="space-y-1.5">
            {insights.map((ins, i) => (
              <li key={i} className="text-[13px] text-muted leading-relaxed flex items-start gap-2">
                <span className="text-brand mt-0.5">•</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ CHART GRID — free drag & drop, resizable ═══ */}
      {hasCharts && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-2 mb-2.5 px-1">Visualizations</p>
          <GridLayout
            width={containerWidth}
            className="dashboard-grid"
            layout={chartLayout}
            cols={COLS}
            rowHeight={ROW_H}
            onLayoutChange={handleChartLayoutChange}
            isDraggable
            isResizable
            margin={[14, 14]}
            useCSSTransforms
          >
            {charts.map((chart, i) => {
              const chartSpec = {
                type: chart.chart_type || chart.type,
                title: chart.title,
                x: chart.x,
                y: chart.y,
                data: chart.data,
              };
              return (
                <div key={`chart-${i}`} className="group cursor-grab active:cursor-grabbing">
                  <div className="h-full relative rounded-2xl border border-border bg-surface-1 overflow-hidden">
                    {/* Action buttons on hover */}
                    <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditChart && (
                        <button onClick={(e) => { e.stopPropagation(); onEditChart(i); }} onMouseDown={(e) => e.stopPropagation()}
                          className="rounded-lg p-1.5 bg-surface-2/80 backdrop-blur hover:bg-surface-3 text-muted hover:text-ink transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDuplicateChart && (
                        <button onClick={(e) => { e.stopPropagation(); onDuplicateChart(i); }} onMouseDown={(e) => e.stopPropagation()}
                          className="rounded-lg p-1.5 bg-surface-2/80 backdrop-blur hover:bg-surface-3 text-muted hover:text-ink transition-colors" title="Duplicate">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      {onDeleteChart && (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteChart(i); }} onMouseDown={(e) => e.stopPropagation()}
                          className="rounded-lg p-1.5 bg-surface-2/80 backdrop-blur hover:bg-accent-rose/20 text-muted hover:text-accent-rose transition-colors" title="Delete">
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
      )}
    </div>
  );
}
