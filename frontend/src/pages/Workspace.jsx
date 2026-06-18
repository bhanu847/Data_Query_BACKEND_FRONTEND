import { useState, useCallback } from "react";
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

export default function Workspace() {
  const [section, setSection] = useState("sources");
  const [activeTool, setActiveTool] = useState(null);
  // When opening a tool from history, pass the chat context
  const [chatContext, setChatContext] = useState(null);

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

  if (activeTool) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar active="sources" onSelect={handleSelectSection} />
          <main className="flex-1 overflow-y-auto p-6">
            <ActiveTool toolKey={activeTool} onBack={handleBackFromTool} chatContext={chatContext} />
          </main>
        </div>
      </div>
    );
  }

  const SectionComponent = SECTION_MAP[section] || SourcesView;
  const sectionProps = { onOpenTool: handleOpenTool };
  if (section === "history") {
    sectionProps.onOpenChat = handleOpenChat;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onSelect={handleSelectSection} />
        <main className="flex-1 overflow-y-auto p-6">
          <SectionComponent {...sectionProps} />
        </main>
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
  if (!Tool) return <div className="text-slate-400">Unknown tool: {toolKey}</div>;
  return <Tool onBack={onBack} chatContext={chatContext} />;
}
