const TEMPLATES = [
  {
    key: "blank",
    label: "Blank Dashboard",
    description: "Start from scratch with a clean canvas.",
    icon: "☐",
    color: "bg-surface-1 text-muted",
    config: { charts: [], kpis: [], layout: [] },
  },
  {
    key: "sales",
    label: "Sales Dashboard",
    description: "Revenue trends, top products, region performance.",
    icon: "💰",
    color: "bg-accent-emerald/10 text-accent-emerald",
    config: {
      charts: [
        { chart_type: "line", title: "Revenue Trend", auto_x: "datetime", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "bar", title: "Sales by Region", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum", sort_order: "descending" },
        { chart_type: "pie", title: "Product Mix", auto_x: "second_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "top_n", title: "Top Performers", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum", limit: 10 },
      ],
      kpis: [
        { auto_column: "first_numeric", aggregation: "sum", label: "Total Revenue", icon: "$", color: "brand" },
        { auto_column: "second_numeric", aggregation: "sum", label: "Total Units", icon: "#", color: "green" },
        { auto_column: "first_numeric", aggregation: "mean", label: "Avg Revenue", icon: "↑", color: "purple" },
        { auto_column: "first_numeric", aggregation: "count", label: "Total Orders", icon: "●", color: "orange" },
      ],
    },
  },
  {
    key: "finance",
    label: "Finance Dashboard",
    description: "Financial KPIs, trends, and distributions.",
    icon: "📊",
    color: "bg-brand/10 text-brand",
    config: {
      charts: [
        { chart_type: "area", title: "Financial Trend", auto_x: "datetime", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "waterfall", title: "Cash Flow", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "donut", title: "Cost Breakdown", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "histogram", title: "Value Distribution", auto_x: "first_numeric", aggregation: "count" },
      ],
      kpis: [
        { auto_column: "first_numeric", aggregation: "sum", label: "Total Amount", icon: "$", color: "brand" },
        { auto_column: "first_numeric", aggregation: "mean", label: "Average", icon: "↑", color: "green" },
        { auto_column: "first_numeric", aggregation: "max", label: "Highest", icon: "★", color: "purple" },
        { auto_column: "first_numeric", aggregation: "min", label: "Lowest", icon: "↓", color: "red" },
      ],
    },
  },
  {
    key: "inventory",
    label: "Inventory Dashboard",
    description: "Stock levels, categories, and trends.",
    icon: "📦",
    color: "bg-accent-amber/10 text-accent-amber",
    config: {
      charts: [
        { chart_type: "bar", title: "Stock by Category", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum", sort_order: "descending" },
        { chart_type: "line", title: "Stock Trend", auto_x: "datetime", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "treemap", title: "Category Breakdown", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "horizontal_bar", title: "Top Items", auto_x: "second_categorical", auto_y: "first_numeric", aggregation: "sum", limit: 10 },
      ],
      kpis: [
        { auto_column: "first_numeric", aggregation: "sum", label: "Total Stock", icon: "#", color: "brand" },
        { auto_column: "first_categorical", aggregation: "distinct", label: "Categories", icon: "◆", color: "orange" },
        { auto_column: "first_numeric", aggregation: "mean", label: "Avg Stock", icon: "●", color: "green" },
        { auto_column: "first_numeric", aggregation: "count", label: "Total Items", icon: "▲", color: "purple" },
      ],
    },
  },
  {
    key: "healthcare",
    label: "Healthcare Dashboard",
    description: "Patient data, distributions, and correlations.",
    icon: "🏥",
    color: "bg-accent-rose/10 text-accent-rose",
    config: {
      charts: [
        { chart_type: "bar", title: "Category Breakdown", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "count" },
        { chart_type: "histogram", title: "Value Distribution", auto_x: "first_numeric", aggregation: "count" },
        { chart_type: "scatter", title: "Correlation", auto_x: "first_numeric", auto_y: "second_numeric" },
        { chart_type: "pie", title: "Group Distribution", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "count" },
      ],
      kpis: [
        { auto_column: "first_numeric", aggregation: "count", label: "Total Records", icon: "#", color: "red" },
        { auto_column: "first_numeric", aggregation: "mean", label: "Average", icon: "●", color: "brand" },
        { auto_column: "first_categorical", aggregation: "distinct", label: "Categories", icon: "◆", color: "green" },
        { auto_column: "first_numeric", aggregation: "median", label: "Median", icon: "↑", color: "purple" },
      ],
    },
  },
  {
    key: "marketing",
    label: "Marketing Dashboard",
    description: "Campaign performance, funnel, and channels.",
    icon: "📢",
    color: "bg-accent-violet/10 text-accent-violet",
    config: {
      charts: [
        { chart_type: "funnel", title: "Conversion Funnel", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "line", title: "Performance Trend", auto_x: "datetime", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "radar", title: "Channel Comparison", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
        { chart_type: "donut", title: "Channel Split", auto_x: "first_categorical", auto_y: "first_numeric", aggregation: "sum" },
      ],
      kpis: [
        { auto_column: "first_numeric", aggregation: "sum", label: "Total Reach", icon: "★", color: "purple" },
        { auto_column: "first_numeric", aggregation: "mean", label: "Avg Performance", icon: "↑", color: "brand" },
        { auto_column: "first_categorical", aggregation: "distinct", label: "Channels", icon: "◆", color: "green" },
        { auto_column: "first_numeric", aggregation: "count", label: "Campaigns", icon: "#", color: "orange" },
      ],
    },
  },
];

export default function DashboardTemplates({ onSelect }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-muted">Choose a Template</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button key={t.key} onClick={() => onSelect(t)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-brand/40 hover:shadow-md">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${t.color}`}>
              {t.icon}
            </span>
            <span className="text-sm font-semibold text-ink">{t.label}</span>
            <span className="text-xs text-muted-2 leading-relaxed">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { TEMPLATES };