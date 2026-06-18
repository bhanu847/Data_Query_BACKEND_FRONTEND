import { useCallback, useMemo } from "react";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import AutoChart from "../charts/AutoChart";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const KPI_COLORS = {
  brand: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  purple: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

export default function DashboardCanvas({
  charts, kpis, layout, onLayoutChange, onEditChart, onDuplicateChart, onDeleteChart, onDeleteKpi,
}) {
  const { containerRef, width: containerWidth } = useContainerWidth();

  const kpiItems = useMemo(() =>
    kpis.map((kpi, i) => ({ ...kpi, layoutId: `kpi-${i}` })), [kpis]
  );
  const chartItems = useMemo(() =>
    charts.map((chart, i) => ({ ...chart, layoutId: `chart-${i}` })), [charts]
  );

  const allItems = [...kpiItems, ...chartItems];

  const defaultLayout = useMemo(() => {
    const items = [];
    kpiItems.forEach((kpi, i) => {
      items.push({ i: kpi.layoutId, x: (i % 4) * 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 });
    });
    const chartYStart = kpiItems.length > 0 ? 2 : 0;
    chartItems.forEach((chart, i) => {
      items.push({ i: chart.layoutId, x: (i % 2) * 6, y: chartYStart + Math.floor(i / 2) * 5, w: 6, h: 5, minW: 3, minH: 3 });
    });
    return items;
  }, [kpiItems, chartItems]);

  const currentLayout = useMemo(() => {
    if (layout && layout.length > 0) {
      const layoutIds = new Set(allItems.map((item) => item.layoutId));
      const existingIds = new Set(layout.map((l) => l.i));
      const kept = layout.filter((l) => layoutIds.has(l.i));
      const newItems = defaultLayout.filter((l) => !existingIds.has(l.i));
      return [...kept, ...newItems];
    }
    return defaultLayout;
  }, [layout, defaultLayout, allItems]);

  const handleLayoutChange = useCallback((newLayout) => {
    if (onLayoutChange) onLayoutChange(newLayout);
  }, [onLayoutChange]);

  if (allItems.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">Your dashboard is empty</p>
        <p className="text-xs text-slate-400 mt-1">Add charts and KPI cards using the toolbar above</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        width={containerWidth || 1200}
        className="dashboard-grid"
        layouts={{ lg: currentLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={50}
        onLayoutChange={handleLayoutChange}
        isDraggable
        isResizable
        draggableHandle=".drag-handle"
        margin={[12, 12]}
      >
      {allItems.map((item) => {
        if (item.layoutId.startsWith("kpi-")) {
          const kpiIndex = kpiItems.indexOf(item);
          const colorDef = (typeof item.color === "string" ? KPI_COLORS[item.color] : item.color) || KPI_COLORS.brand;
          return (
            <div key={item.layoutId} className="group">
              <div className={`h-full rounded-2xl border p-4 ${colorDef.bg || "bg-slate-50"} ${colorDef.border || "border-slate-200"} relative`}>
                <div className="drag-handle absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-3 h-full">
                  <span className={`text-xl font-bold ${colorDef.text || "text-slate-700"}`}>{item.icon || "$"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 truncate">{item.label}</p>
                    <p className={`font-display text-2xl font-semibold mt-1 ${colorDef.text || "text-slate-900"}`}>{item.value}</p>
                  </div>
                  {onDeleteKpi && (
                    <button onClick={() => onDeleteKpi(kpiIndex)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
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
          <div key={item.layoutId} className="group">
            <div className="h-full relative">
              <div className="drag-handle absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10" />
              <AutoChart
                spec={chartSpec}
                height={200}
                showActions
                onEdit={() => onEditChart?.(chartIndex)}
                onDuplicate={() => onDuplicateChart?.(chartIndex)}
                onDelete={() => onDeleteChart?.(chartIndex)}
              />
            </div>
          </div>
        );
      })}
    </ResponsiveGridLayout>
    </div>
  );
}