/// <reference types="office-js" />
import { analyzeTable } from "./dataAnalysis";

// Keep in sync with backend/app/ai/excel_tools.py — these are the client-side
// implementations of the tool schemas the LLM is allowed to call.

const MAX_CELLS_PER_READ = 2000;
const TOOL_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Executes a single tool call against the live workbook. Never throws —
 * every failure (bad range, protected sheet, timeout, shape mismatch) comes
 * back as a structured `{error, code}` object so the model can see it and
 * recover instead of the task pane crashing.
 */
export async function executeTool(name: string, input: Record<string, any>): Promise<any> {
  try {
    return await withTimeout(runTool(name, input), TOOL_TIMEOUT_MS, name);
  } catch (err: any) {
    return { error: err?.message || String(err), code: err?.code || "TOOL_ERROR" };
  }
}

function runTool(name: string, input: Record<string, any>): Promise<any> {
  switch (name) {
    case "get_workbook_overview":
      return getWorkbookOverview();
    case "read_range":
      return readRange(input.sheet, input.range);
    case "write_range":
      return writeRange(input.sheet, input.range, input.values);
    case "add_worksheet":
      return addWorksheet(input.name);
    case "format_range":
      return formatRange(input.sheet, input.range, input.bold, input.fillColor, input.numberFormat);
    case "delete_range":
      return deleteRange(input.sheet, input.range, input.shift);
    case "insert_range":
      return insertRange(input.sheet, input.range, input.shift);
    case "clear_range":
      return clearRange(input.sheet, input.range, input.clearType);
    case "delete_worksheet":
      return deleteWorksheet(input.sheet);
    case "analyze_range":
      return analyzeRange(input.sheet, input.range, input.hasHeaders, input.groupBy);
    case "create_chart":
      return createChart(input.sheet, input.dataRange, input.chartType, input.title);
    default:
      return Promise.resolve({ error: `Unknown tool '${name}'`, code: "UNKNOWN_TOOL" });
  }
}

function getSheet(context: Excel.RequestContext, sheetName?: string): Excel.Worksheet {
  return sheetName
    ? context.workbook.worksheets.getItem(sheetName)
    : context.workbook.worksheets.getActiveWorksheet();
}

async function getWorkbookOverview() {
  return Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    await context.sync();

    const overview: any[] = [];
    for (const sheet of sheets.items) {
      const used = sheet.getUsedRangeOrNullObject(true);
      used.load(["address", "rowCount", "columnCount"]);
      await context.sync();

      if (used.isNullObject) {
        overview.push({ sheet: sheet.name, address: null, rowCount: 0, columnCount: 0, preview: [] });
        continue;
      }

      const previewRowCount = Math.min(5, used.rowCount);
      const previewRange = sheet.getRangeByIndexes(0, 0, previewRowCount, used.columnCount);
      previewRange.load("values");
      await context.sync();

      overview.push({
        sheet: sheet.name,
        address: used.address,
        rowCount: used.rowCount,
        columnCount: used.columnCount,
        preview: previewRange.values,
      });
    }
    return { sheets: overview };
  });
}

async function readRange(sheetName: string | undefined, rangeAddress: string) {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.load(["address", "values", "formulas", "rowCount", "columnCount"]);
    await context.sync();

    const cellCount = range.rowCount * range.columnCount;
    if (cellCount > MAX_CELLS_PER_READ) {
      return {
        error: `Range has ${cellCount} cells, exceeding the ${MAX_CELLS_PER_READ}-cell limit per call. Paginate into smaller ranges.`,
        code: "RANGE_TOO_LARGE",
      };
    }

    return { address: range.address, values: range.values, formulas: range.formulas };
  });
}

async function writeRange(sheetName: string | undefined, rangeAddress: string, values: any[][]) {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.load(["rowCount", "columnCount"]);
    await context.sync();

    const shapeOk =
      Array.isArray(values) &&
      values.length === range.rowCount &&
      values.every((row) => Array.isArray(row) && row.length === range.columnCount);

    if (!shapeOk) {
      const gotRows = Array.isArray(values) ? values.length : 0;
      const gotCols = Array.isArray(values) && values[0] ? values[0].length : 0;
      return {
        error: `values shape (${gotRows}x${gotCols}) does not match range shape (${range.rowCount}x${range.columnCount}).`,
        code: "SHAPE_MISMATCH",
      };
    }

    range.formulas = values;
    await context.sync();
    return { success: true, address: rangeAddress, cellsWritten: range.rowCount * range.columnCount };
  });
}

async function addWorksheet(name: string) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.add(name);
    sheet.activate();
    await context.sync();
    return { success: true, sheet: name };
  });
}

async function formatRange(
  sheetName: string | undefined,
  rangeAddress: string,
  bold?: boolean,
  fillColor?: string,
  numberFormat?: string
) {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.load(["rowCount", "columnCount"]);
    await context.sync();

    if (bold !== undefined) range.format.font.bold = bold;
    if (fillColor) range.format.fill.color = fillColor;
    if (numberFormat) {
      range.numberFormat = Array.from({ length: range.rowCount }, () =>
        Array.from({ length: range.columnCount }, () => numberFormat)
      );
    }

    await context.sync();
    return { success: true, address: rangeAddress };
  });
}

async function deleteRange(sheetName: string | undefined, rangeAddress: string, shift: "up" | "left") {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.delete(
      shift === "left" ? Excel.DeleteShiftDirection.left : Excel.DeleteShiftDirection.up
    );
    await context.sync();
    return { success: true, deleted: rangeAddress, shift };
  });
}

async function insertRange(sheetName: string | undefined, rangeAddress: string, shift: "down" | "right") {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.insert(
      shift === "right" ? Excel.InsertShiftDirection.right : Excel.InsertShiftDirection.down
    );
    await context.sync();
    return { success: true, inserted: rangeAddress, shift };
  });
}

async function clearRange(
  sheetName: string | undefined,
  rangeAddress: string,
  clearType: "all" | "contents" | "formats" = "all"
) {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    const applyTo =
      clearType === "contents"
        ? Excel.ClearApplyTo.contents
        : clearType === "formats"
        ? Excel.ClearApplyTo.formats
        : Excel.ClearApplyTo.all;
    range.clear(applyTo);
    await context.sync();
    return { success: true, cleared: rangeAddress, clearType };
  });
}

async function deleteWorksheet(sheetName: string) {
  return Excel.run(async (context) => {
    const sheet = context.workbook.worksheets.getItem(sheetName);
    sheet.delete();
    await context.sync();
    return { success: true, deletedSheet: sheetName };
  });
}

async function analyzeRange(
  sheetName: string | undefined,
  rangeAddress: string,
  hasHeaders: boolean = true,
  groupBy?: string
) {
  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const range = sheet.getRange(rangeAddress);
    range.load(["values", "rowCount", "columnCount", "rowIndex"]);
    await context.sync();

    const cellCount = range.rowCount * range.columnCount;
    if (cellCount > MAX_CELLS_PER_READ) {
      return {
        error: `Range has ${cellCount} cells, exceeding the ${MAX_CELLS_PER_READ}-cell limit per call. Narrow the range.`,
        code: "RANGE_TOO_LARGE",
      };
    }
    if (range.rowCount < (hasHeaders ? 2 : 1)) {
      return { error: "Range has no data rows to analyze.", code: "NO_DATA" };
    }

    return analyzeTable(range.values, range.rowIndex + 1, hasHeaders, groupBy);
  });
}

const CHART_TYPE_MAP: Record<string, Excel.ChartType> = {
  bar: Excel.ChartType.columnClustered,
  pie: Excel.ChartType.pie,
  line: Excel.ChartType.line,
  scatter: Excel.ChartType.xyscatter,
  histogram: Excel.ChartType.histogram,
};

async function createChart(
  sheetName: string | undefined,
  dataRangeAddress: string,
  chartType: string,
  title?: string
) {
  const officeChartType = CHART_TYPE_MAP[chartType];
  if (!officeChartType) {
    return { error: `Unknown chart type '${chartType}'`, code: "UNKNOWN_CHART_TYPE" };
  }

  return Excel.run(async (context) => {
    const sheet = getSheet(context, sheetName);
    const dataRange = sheet.getRange(dataRangeAddress);
    const chart = sheet.charts.add(officeChartType, dataRange, Excel.ChartSeriesBy.auto);
    if (title) chart.title.text = title;
    chart.load("name");
    await context.sync();

    return { success: true, chart: chart.name, chartType, dataRange: dataRangeAddress };
  });
}
