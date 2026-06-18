import { useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PALETTE = [
  "#2563EB", "#7C3AED", "#059669", "#EA580C", "#DB2777",
  "#0891B2", "#CA8A04", "#6366F1", "#DC2626", "#14B8A6",
  "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

export default function AutoChart({ spec, height = 280, onEdit, onDuplicate, onDelete, showActions = false }) {
  const chartRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  if (!spec || !spec.data?.length) return null;
  const { type, x, y, data, title } = spec;

  const downloadPNG = useCallback(async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
    const link = document.createElement("a");
    link.download = `${title || "chart"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [title]);

  const downloadPDF = useCallback(async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth() - 20;
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 10, 10, w, h);
    pdf.save(`${title || "chart"}.pdf`);
  }, [title]);

  const renderChart = (h) => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={y} stroke={PALETTE[0]} strokeWidth={2} dot={false} />
          </LineChart>
        );

      case "bar":
        return (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey={y} fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "horizontal_bar":
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey={x} type="category" tick={{ fontSize: 11 }} width={55} />
            <Tooltip />
            <Legend />
            <Bar dataKey={y} fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
          </BarChart>
        );

      case "area":
        return (
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={y} stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.2} />
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={data} dataKey={y} nameKey={x} cx="50%" cy="50%" outerRadius={90} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        );

      case "donut":
        return (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={data} dataKey={y} nameKey={x} cx="50%" cy="50%" innerRadius={55} outerRadius={90} label>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
          </PieChart>
        );

      case "scatter":
        return (
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} type="number" name={x} tick={{ fontSize: 11 }} />
            <YAxis dataKey={y} type="number" name={y} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill={PALETTE[1]} />
          </ScatterChart>
        );

      case "bubble":
        return (
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} type="number" name={x} tick={{ fontSize: 11 }} />
            <YAxis dataKey={y} type="number" name={y} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill={PALETTE[2]} fillOpacity={0.6}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Scatter>
          </ScatterChart>
        );

      case "histogram":
        return (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x || "bin"} tick={{ fontSize: 10, angle: -30 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={y || "count"} fill={PALETTE[3]} radius={[2, 2, 0, 0]} />
          </BarChart>
        );

      case "box_plot": {
        const d = data[0];
        if (!d) return null;
        const boxData = [
          { name: "Min", value: d.min },
          { name: "Q1", value: d.q1 },
          { name: "Median", value: d.median },
          { name: "Q3", value: d.q3 },
          { name: "Max", value: d.max },
        ];
        return (
          <BarChart data={boxData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={PALETTE[4]}>
              {boxData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        );
      }

      case "heatmap":
      case "correlation_matrix": {
        const cols = [...new Set(data.map((d) => d.x))];
        const rows = [...new Set(data.map((d) => d.y))];
        return (
          <div className="overflow-auto" style={{ height: h }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-1 border border-slate-200 bg-slate-50"></th>
                  {cols.map((c) => (
                    <th key={c} className="p-1 border border-slate-200 bg-slate-50 font-medium truncate max-w-[80px]">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <td className="p-1 border border-slate-200 bg-slate-50 font-medium truncate max-w-[80px]">{row}</td>
                    {cols.map((col) => {
                      const cell = data.find((d) => d.x === col && d.y === row);
                      const val = cell?.value ?? 0;
                      const intensity = Math.abs(val);
                      const bg = val >= 0
                        ? `rgba(37, 99, 235, ${intensity * 0.8})`
                        : `rgba(220, 38, 38, ${intensity * 0.8})`;
                      return (
                        <td key={col} className="p-1 border border-slate-200 text-center font-mono"
                          style={{ backgroundColor: bg, color: intensity > 0.5 ? "#fff" : "#334155" }}>
                          {val.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "radar":
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey={x} tick={{ fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Radar dataKey={y} stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.3} />
          </RadarChart>
        );

      case "treemap":
        return (
          <Treemap
            data={data.map((d, i) => ({ name: d[x], size: d[y], fill: PALETTE[i % PALETTE.length] }))}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#fff"
            content={({ x: rx, y: ry, width, height, name, value }) => (
              width > 40 && height > 30 ? (
                <g>
                  <rect x={rx} y={ry} width={width} height={height} style={{ fill: PALETTE[0], stroke: "#fff", strokeWidth: 2, opacity: 0.85 }} />
                  <text x={rx + width / 2} y={ry + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
                  <text x={rx + width / 2} y={ry + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={10}>{typeof value === "number" ? value.toLocaleString() : value}</text>
                </g>
              ) : (
                <rect x={rx} y={ry} width={width} height={height} style={{ fill: PALETTE[0], stroke: "#fff", strokeWidth: 2, opacity: 0.7 }} />
              )
            )}
          />
        );

      case "funnel":
        return (
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey={y} data={data.map((d, i) => ({ ...d, name: d[x], fill: PALETTE[i % PALETTE.length] }))} isAnimationActive>
              <LabelList position="right" fill="#334155" fontSize={11} dataKey="name" />
            </Funnel>
          </FunnelChart>
        );

      case "waterfall": {
        let cumulative = 0;
        const wData = data.map((d) => {
          const start = cumulative;
          const val = d.value || d[y] || 0;
          cumulative += val;
          return { name: d.name || d[x], value: val, start, end: cumulative };
        });
        return (
          <BarChart data={wData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="start" stackId="a" fill="transparent" />
            <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
              {wData.map((entry, i) => (
                <Cell key={i} fill={entry.value >= 0 ? PALETTE[0] : "#DC2626"} />
              ))}
            </Bar>
          </BarChart>
        );
      }

      case "gauge": {
        const d = data[0];
        if (!d) return null;
        const val = d.value;
        const min = d.min || 0;
        const max = d.max || val * 2;
        const pct = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
        const color = pct > 66 ? "#059669" : pct > 33 ? "#CA8A04" : "#DC2626";
        return (
          <div className="flex flex-col items-center justify-center" style={{ height: h }}>
            <div className="relative w-40 h-20 overflow-hidden">
              <div className="absolute w-40 h-40 rounded-full border-[16px] border-slate-100" style={{ top: 0 }} />
              <div
                className="absolute w-40 h-40 rounded-full border-[16px] border-transparent"
                style={{
                  top: 0,
                  borderBottomColor: color,
                  borderLeftColor: pct > 50 ? color : "transparent",
                  borderRightColor: pct > 25 ? color : "transparent",
                  transform: `rotate(${(pct / 100) * 180}deg)`,
                  transformOrigin: "center center",
                }}
              />
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ color }}>{typeof val === "number" ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val}</p>
            <p className="text-xs text-slate-400">{min.toLocaleString()} — {max.toLocaleString()}</p>
          </div>
        );
      }

      case "top_n":
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey={x} type="category" tick={{ fontSize: 11 }} width={75} />
            <Tooltip />
            <Bar dataKey={y} radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        );

      default:
        return (
          <div className="grid h-full place-items-center text-sm text-slate-400">
            Unsupported chart type: {type}
          </div>
        );
    }
  };

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-white p-6 overflow-auto"
    : "rounded-2xl border border-slate-200 bg-white p-4 shadow-card";

  return (
    <div className={containerClass} ref={chartRef}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-display text-sm font-semibold text-ink truncate flex-1">{title}</h4>
        {showActions && (
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            {onDuplicate && (
              <button onClick={onDuplicate} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Duplicate">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            )}
            <button onClick={downloadPNG} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Download PNG">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <button onClick={downloadPDF} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Download PDF">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </button>
            <button onClick={() => setFullscreen(!fullscreen)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={fullscreen ? "M9 9L4 4m0 0v5m0-5h5m6 6l5 5m0 0v-5m0 5h-5" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"} /></svg>
            </button>
            {onDelete && (
              <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={fullscreen ? 500 : height}>
        {renderChart(fullscreen ? 500 : height)}
      </ResponsiveContainer>
      {fullscreen && (
        <button onClick={() => setFullscreen(false)} className="fixed top-4 right-4 z-50 rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white shadow-lg hover:bg-slate-700">
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}