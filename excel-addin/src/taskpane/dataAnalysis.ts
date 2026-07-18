/**
 * Pure data-analysis helpers for the analyze_range tool — no Office.js
 * dependency, so this logic is deterministic and independent of the
 * workbook I/O in officeTools.ts. The LLM is bad at precisely counting
 * duplicates, computing correlation, or detecting outliers by "reading"
 * raw values; this module does that math in code instead.
 */

type CellValue = string | number | boolean | null | undefined;

const MISSING_MARKERS = new Set(["", "n/a", "na", "null", "none", "-", "--", "?", "unknown"]);

function isMissing(value: CellValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && MISSING_MARKERS.has(value.trim().toLowerCase())) return true;
  return false;
}

function toNumber(value: CellValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function looksLikeDate(value: CellValue): boolean {
  if (typeof value !== "string") return false;
  if (!/\d/.test(value) || !/[/\-]/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

type Dtype = "number" | "string" | "boolean" | "date" | "empty" | "mixed";

function inferDtype(values: CellValue[]): Dtype {
  const present = values.filter((v) => !isMissing(v));
  if (present.length === 0) return "empty";

  let numCount = 0, boolCount = 0, dateCount = 0, strCount = 0;
  for (const v of present) {
    if (typeof v === "boolean") boolCount++;
    else if (toNumber(v) !== null) numCount++;
    else if (looksLikeDate(v)) dateCount++;
    else strCount++;
  }
  const total = present.length;
  const dominant = Math.max(numCount, boolCount, dateCount, strCount);
  if (dominant / total < 0.9) return "mixed";
  if (dominant === numCount) return "number";
  if (dominant === boolCount) return "boolean";
  if (dominant === dateCount) return "date";
  return "string";
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdDev(nums: number[], avg: number): number {
  if (nums.length < 2) return 0;
  const variance = nums.reduce((sum, n) => sum + (n - avg) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function quartile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

interface NumericStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

function numericStats(nums: number[]): NumericStats | undefined {
  if (nums.length === 0) return undefined;
  const sorted = [...nums].sort((a, b) => a - b);
  const avg = mean(nums);
  return {
    count: nums.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: round(avg),
    median: round(median(nums)),
    stdDev: round(stdDev(nums, avg)),
  };
}

interface RowValue {
  row: number;
  value: number;
}

interface Outlier {
  row: number;
  value: number;
}

function findOutliersIQR(numericByRow: RowValue[]): { outliers: Outlier[]; lower: number; upper: number } {
  const values = numericByRow.map((r) => r.value).sort((a, b) => a - b);
  if (values.length < 4) return { outliers: [], lower: -Infinity, upper: Infinity };
  const q1 = quartile(values, 0.25);
  const q3 = quartile(values, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const outliers = numericByRow.filter((r) => r.value < lower || r.value > upper);
  return { outliers, lower: round(lower), upper: round(upper) };
}

function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? null : num / denom;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?\d[\d\s().-]{6,14}\d$/;

const looksLikeEmailColumn = (name: string) => /email|e-mail/i.test(name);
const looksLikePhoneColumn = (name: string) => /phone|contact|mobile|tel(ephone)?$/i.test(name);
const looksLikeDateColumn = (name: string) => /date|dob|birth/i.test(name);

interface ColumnProfile {
  name: string;
  dtype: Dtype;
  missingCount: number;
  uniqueCount: number;
  stats?: NumericStats;
  statsExcludingOutliers?: NumericStats;
  outliers?: Outlier[];
  invalidFormat?: { type: "email" | "phone" | "date"; invalidCount: number; examples: { row: number; value: CellValue }[] };
  inconsistentCategories?: { canonical: string; variants: string[] }[];
}

export interface AnalyzeResult {
  recordCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  totalMissingValues: number;
  duplicateRowGroups: { rows: number[]; values: CellValue[] }[];
  totalDuplicateRows: number;
  correlations: { columnA: string; columnB: string; coefficient: number }[];
  groupedStats?: {
    groupColumn: string;
    groups: { groupValue: string; count: number; columns: Record<string, NumericStats> }[];
  };
}

export function analyzeTable(
  allValues: CellValue[][],
  startRowNumber: number,
  hasHeaders: boolean,
  groupByColumn?: string
): AnalyzeResult {
  const headerRow = allValues[0] ?? [];
  const headers = hasHeaders
    ? headerRow.map((h, i) => (isMissing(h) ? `Column${i + 1}` : String(h)))
    : headerRow.map((_, i) => `Column${i + 1}`);
  const dataRows = hasHeaders ? allValues.slice(1) : allValues;
  const dataStartRow = startRowNumber + (hasHeaders ? 1 : 0);
  const columnCount = headers.length;

  const columns: ColumnProfile[] = [];
  const numericColumns: { name: string; valuesByRow: RowValue[] }[] = [];

  for (let c = 0; c < columnCount; c++) {
    const name = headers[c];
    const rawValues = dataRows.map((row) => row?.[c] ?? null);
    const missingCount = rawValues.filter(isMissing).length;
    const present = rawValues.filter((v) => !isMissing(v));
    const uniqueCount = new Set(present.map((v) => String(v).trim().toLowerCase())).size;
    const dtype = inferDtype(rawValues);

    const profile: ColumnProfile = { name, dtype, missingCount, uniqueCount };

    if (dtype === "number") {
      const numericByRow: RowValue[] = [];
      rawValues.forEach((v, i) => {
        const n = toNumber(v);
        if (n !== null) numericByRow.push({ row: dataStartRow + i, value: n });
      });
      profile.stats = numericStats(numericByRow.map((r) => r.value));

      const { outliers, lower, upper } = findOutliersIQR(numericByRow);
      if (outliers.length > 0) {
        profile.outliers = outliers;
        const cleaned = numericByRow.filter((r) => r.value >= lower && r.value <= upper).map((r) => r.value);
        profile.statsExcludingOutliers = numericStats(cleaned);
      }
      numericColumns.push({ name, valuesByRow: numericByRow });
    }

    if (looksLikeEmailColumn(name) || looksLikePhoneColumn(name) || looksLikeDateColumn(name)) {
      const type = looksLikeEmailColumn(name) ? "email" : looksLikePhoneColumn(name) ? "phone" : "date";
      const invalid: { row: number; value: CellValue }[] = [];
      rawValues.forEach((v, i) => {
        if (isMissing(v)) return;
        const str = String(v);
        const valid =
          type === "email" ? EMAIL_RE.test(str) : type === "phone" ? PHONE_RE.test(str) : !Number.isNaN(Date.parse(str));
        if (!valid) invalid.push({ row: dataStartRow + i, value: v });
      });
      if (invalid.length > 0) {
        profile.invalidFormat = { type, invalidCount: invalid.length, examples: invalid.slice(0, 5) };
      }
    }

    if (dtype === "string" && !looksLikeEmailColumn(name) && !looksLikePhoneColumn(name)) {
      const groups = new Map<string, Set<string>>();
      for (const v of present) {
        const key = String(v).trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(String(v).trim());
      }
      const inconsistent = [...groups.entries()]
        .filter(([, variants]) => variants.size > 1)
        .map(([canonical, variants]) => ({ canonical, variants: [...variants] }));
      if (inconsistent.length > 0) profile.inconsistentCategories = inconsistent;
    }

    columns.push(profile);
  }

  // Duplicate row detection — full-row signature across all columns.
  const signatureMap = new Map<string, number[]>();
  dataRows.forEach((row, i) => {
    const sig = JSON.stringify((row ?? []).map((v) => (v === undefined ? null : v)));
    const rowNum = dataStartRow + i;
    if (!signatureMap.has(sig)) signatureMap.set(sig, []);
    signatureMap.get(sig)!.push(rowNum);
  });
  const duplicateRowGroups = [...signatureMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([sig, rows]) => ({ rows, values: JSON.parse(sig) }));
  const totalDuplicateRows = duplicateRowGroups.reduce((sum, g) => sum + (g.rows.length - 1), 0);
  const totalMissingValues = columns.reduce((sum, c) => sum + c.missingCount, 0);

  // Pairwise correlation between numeric columns, aligned by sheet row number.
  const correlations: { columnA: string; columnB: string; coefficient: number }[] = [];
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const a = numericColumns[i];
      const b = numericColumns[j];
      const aByRow = new Map(a.valuesByRow.map((r) => [r.row, r.value]));
      const bByRow = new Map(b.valuesByRow.map((r) => [r.row, r.value]));
      const commonRows = [...aByRow.keys()].filter((row) => bByRow.has(row));
      if (commonRows.length < 3) continue;
      const xs = commonRows.map((row) => aByRow.get(row)!);
      const ys = commonRows.map((row) => bByRow.get(row)!);
      const coefficient = pearsonCorrelation(xs, ys);
      if (coefficient !== null) correlations.push({ columnA: a.name, columnB: b.name, coefficient: round(coefficient) });
    }
  }

  let groupedStats: AnalyzeResult["groupedStats"];
  if (groupByColumn) {
    const groupColIndex = headers.findIndex((h) => h.toLowerCase() === groupByColumn.toLowerCase());
    if (groupColIndex !== -1) {
      const groupMap = new Map<string, number[]>();
      dataRows.forEach((row, i) => {
        const raw = row?.[groupColIndex];
        const key = isMissing(raw) ? "(missing)" : String(raw).trim();
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(i);
      });

      const groups = [...groupMap.entries()].map(([groupValue, indices]) => {
        const rowSet = new Set(indices.map((i) => dataStartRow + i));
        const colsForGroup: Record<string, NumericStats> = {};
        for (const nc of numericColumns) {
          if (nc.name.toLowerCase() === groupByColumn.toLowerCase()) continue;
          const values = nc.valuesByRow.filter((r) => rowSet.has(r.row)).map((r) => r.value);
          const stats = numericStats(values);
          if (stats) colsForGroup[nc.name] = stats;
        }
        return { groupValue, count: indices.length, columns: colsForGroup };
      });
      groupedStats = { groupColumn: headers[groupColIndex], groups };
    }
  }

  return {
    recordCount: dataRows.length,
    columnCount,
    columns,
    totalMissingValues,
    duplicateRowGroups,
    totalDuplicateRows,
    correlations,
    groupedStats,
  };
}
