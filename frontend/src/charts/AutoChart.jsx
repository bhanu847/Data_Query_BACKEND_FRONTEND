import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const PALETTE = ["#2563EB", "#7C3AED", "#059669", "#EA580C", "#DB2777", "#0891B2", "#CA8A04"];

export default function AutoChart({ spec, height = 280 }) {
  if (!spec || !spec.data?.length) return null;
  const { type, x, y, data } = spec;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <h4 className="mb-3 font-display text-sm font-semibold text-ink">{spec.title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey={y} stroke={PALETTE[0]} strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey={y} fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : type === "pie" ? (
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie data={data} dataKey={y} nameKey={x} cx="50%" cy="50%" outerRadius={90} label>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : type === "scatter" ? (
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
            <XAxis dataKey={x} type="number" name={x} tick={{ fontSize: 12 }} />
            <YAxis dataKey={y} type="number" name={y} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill={PALETTE[1]} />
          </ScatterChart>
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-400">
            Unsupported chart type: {type}
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}
