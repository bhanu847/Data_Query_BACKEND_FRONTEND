import { useState, useCallback, useEffect } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ExcelTool from "../tools/ExcelTool";
import PDFTool from "../tools/PDFTool";
import SQLTool from "../tools/SQLTool";
import DashboardTool from "../tools/DashboardTool";
import APITool from "../tools/APITool";
import ReportTool from "../tools/ReportTool";
import DataCleaningTool from "../tools/DataCleaningTool";
import ExportTool from "../tools/ExportTool";
import MongoDBTool from "../tools/MongoDBTool";
import HistoryView from "../views/HistoryView";
import SettingsView from "../views/SettingsView";
import SourcesView from "../views/SourcesView";
import DashboardsView from "../views/DashboardsView";
import ReportsView from "../views/ReportsView";
import { listSources, uploadAny } from "../services/api";

export default function Workspace() {
  const [section, setSection] = useState("sources");
  const [activeTool, setActiveTool] = useState(null);
  const [chatContext, setChatContext] = useState(null);
  const [sourceCount, setSourceCount] = useState(0);

  const refreshSourceCount = useCallback(() => {
    listSources()
      .then((srcs) => setSourceCount(srcs.length))
      .catch(() => {});
  }, []);

  useEffect(() => { refreshSourceCount(); }, [refreshSourceCount]);

  const handleSelectSection = useCallback((key) => {
    setSection(key);
    setActiveTool(null);
    setChatContext(null);
  }, []);

  const handleOpenTool = useCallback((toolKey) => {
    setActiveTool(toolKey);
    setChatContext(null);
    setSection("sources");
  }, []);

  const handleBackFromTool = useCallback(() => {
    setActiveTool(null);
    setChatContext(null);
  }, []);

  const handleOpenChat = useCallback((ctx) => {
    const kind = ctx.sourceKind || "";
    let tool = "excel";
    if (kind === "pdf") tool = "pdf";
    else if (kind === "mongodb") tool = "mongodb";
    setChatContext(ctx);
    setActiveTool(tool);
    setSection("sources");
  }, []);

  const handleNewAnalysis = useCallback((toolKey) => {
    setActiveTool(toolKey || "excel");
    setChatContext(null);
    setSection("sources");
  }, []);

  const handleUploadFile = useCallback(async (file) => {
    const res = await uploadAny(file);
    refreshSourceCount();
    const id = res.source_id || res.id;
    const cols = res.columns || [];
    const rowCount = res.source?.row_count || res.preview?.length || 0;
    const ext = file.name.split(".").pop().toLowerCase();
    const tool = ext === "pdf" ? "pdf" : "excel";
    setChatContext({
      sourceId: id,
      sourceName: file.name,
      info: `"${file.name}" uploaded successfully!\n\nRows: ${rowCount.toLocaleString()} | Columns: ${cols.length}\nColumns: ${cols.join(", ")}\n\nAsk me anything about this data!`,
    });
    setActiveTool(tool);
    setSection("sources");
  }, [refreshSourceCount]);

  const currentSection = activeTool ? "sources" : section;
  const SectionComponent = SECTION_MAP[section] || SourcesView;
  const sectionProps = { onOpenTool: handleOpenTool };
  if (section === "history") sectionProps.onOpenChat = handleOpenChat;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="bg-scene">
        <div className="orb-a" />
        <div className="orb-b" />
        <div className="orb-c" />
        <div className="grid-overlay" />
        <div className="vignette" />
      </div>

      <div className="relative z-10 flex h-screen flex-col overflow-hidden">
        <Navbar onUploadFile={handleUploadFile} onOpenTool={handleOpenTool} onSelectSection={handleSelectSection} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            active={currentSection}
            onSelect={handleSelectSection}
            onNewAnalysis={handleNewAnalysis}
            sourceCount={sourceCount}
          />
          <main className="flex-1 overflow-y-auto p-8" style={{ maxHeight: "calc(100vh - 57px)" }}>
            {activeTool ? (
              <ActiveTool toolKey={activeTool} onBack={handleBackFromTool} chatContext={chatContext} />
            ) : (
              <SectionComponent {...sectionProps} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const SECTION_MAP = {
  sources: SourcesView,
  dashboards: DashboardsView,
  reports: ReportsView,
  history: HistoryView,
  settings: SettingsView,
};

function ActiveTool({ toolKey, onBack, chatContext }) {
  const tools = {
    excel: ExcelTool,
    pdf: PDFTool,
    sql: SQLTool,
    mongodb: MongoDBTool,
    dashboard: DashboardTool,
    api: APITool,
    report: ReportTool,
    cleaning: DataCleaningTool,
    export: ExportTool,
  };
  const Tool = tools[toolKey];
  if (!Tool) return <div className="text-muted">Unknown tool: {toolKey}</div>;
  return <Tool onBack={onBack} chatContext={chatContext} />;
}
