// import { useEffect, useMemo, useRef, useState } from "react";
// import { AgGridReact } from "ag-grid-react";
// import "ag-grid-community/styles/ag-grid.css";
// import "ag-grid-community/styles/ag-theme-quartz.css";

// import Navbar from "../components/Navbar";
// import Sidebar from "../components/Sidebar";
// import DashboardView from "./DashboardView";
// import AutoChart from "../charts/AutoChart";
// import {
//   uploadExcel,
//   listSources,
//   askQuestion,
//   generateDashboard,
//   exportCSV,
//   exportExcel,
//   exportPDF,
// } from "../services/api";

// export default function Workspace() {
//   const [section, setSection] = useState("sources");
//   const [sources, setSources] = useState([]);
//   const [active, setActive] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [question, setQuestion] = useState("");
//   const [dashboard, setDashboard] = useState(null);
//   const [dashboardActive, setDashboardActive] = useState(null);
//   const [loading, setLoading] = useState("");
//   const [error, setError] = useState("");
//   const fileRef = useRef();
//   const dashboardFileRef = useRef();

//   useEffect(() => {
//     let activeRequest = true;

//     listSources()
//       .then((items) => {
//         if (activeRequest) setSources(items);
//       })
//       .catch((err) => {
//         if (activeRequest) setError(err.message);
//       });

//     return () => {
//       activeRequest = false;
//     };
//   }, []);

//   const columnDefs = useMemo(
//     () => (active?.columns || []).map((field) => ({ field, sortable: true, filter: true, resizable: true })),
//     [active?.columns]
//   );

//   const onUpload = async (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     if (!file.name.match(/\.(xlsx|xls)$/i)) {
//       alert("Only Excel files (.xlsx, .xls) are supported");
//       event.target.value = "";
//       return;
//     }

//     setError("");
//     setLoading("Uploading...");

//     try {
//       const res = await uploadExcel(file);
//       setActive({ id: res.source.id, name: res.source.name, columns: res.columns });
//       setRows(res.preview || []);
//       setDashboard(null);
//       setMessages([]);
//       setSources(await listSources());
//       setSection("sources");
//     } catch (err) {
//       setError(err.message || "Upload failed");
//     } finally {
//       setLoading("");
//       event.target.value = "";
//     }
//   };

//   const onDashboardUpload = async (event) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     if (!file.name.match(/\.(xlsx|xls)$/i)) {
//       alert("Only Excel files (.xlsx, .xls) are supported");
//       event.target.value = "";
//       return;
//     }

//     setError("");
//     setLoading("Uploading dashboard file...");

//     try {
//       const res = await uploadExcel(file);
//       const source = { id: res.source.id, name: res.source.name, columns: res.columns };
//       setDashboardActive(source);
//       setDashboard(await generateDashboard(source.id));
//       setSection("dashboards");
//       setSources(await listSources());
//       setMessages([]);
//       setActive(null);
//     } catch (err) {
//       setError(err.message || "Dashboard upload failed");
//     } finally {
//       setLoading("");
//       event.target.value = "";
//     }
//   };

//   const openSource = async (source) => {
//     setActive(source);
//     setDashboard(null);
//     setDashboardActive(null);
//     setMessages([]);
//     setError("");
//     setLoading("Loading preview...");

//     try {
//       const res = await askQuestion(source.id, "summary");
//       setRows(res.table || []);
//       setSection("sources");
//     } catch (err) {
//       setRows([]);
//       setError(err.message || "Unable to load preview");
//     } finally {
//       setLoading("");
//     }
//   };

//   const ask = async () => {
//     const trimmed = question.trim();
//     if (!trimmed || !active || loading) return;

//     setQuestion("");
//     setError("");
//     setMessages((current) => [...current, { role: "user", text: trimmed }]);
//     setLoading("Thinking...");

//     try {
//       const res = await askQuestion(active.id, trimmed);
//       setMessages((current) => [
//         ...current,
//         { role: "ai", text: res.answer, table: res.table, charts: res.charts },
//       ]);
//     } catch (err) {
//       setMessages((current) => [...current, { role: "ai", text: `Error: ${err.message || "Unable to answer"}` }]);
//     } finally {
//       setLoading("");
//     }
//   };

//   const makeDashboard = async () => {
//     if (!active || loading) return;

//     setError("");
//     setLoading("Generating dashboard...");
//     try {
//       const result = await generateDashboard(active.id);
//       setDashboard(result);
//       setDashboardActive(active);
//       setSection("dashboards");
//     } catch (err) {
//       setError(err.message || "Dashboard generation failed");
//     } finally {
//       setLoading("");
//     }
//   };

//   return (
//     <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
//       <Navbar />
//       <div className="flex flex-1">
//         <Sidebar active={section} onSelect={setSection} />
//         <main className="flex-1 p-6">
//           <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
//           <input ref={dashboardFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onDashboardUpload} />

//           <div className="mb-6 flex flex-wrap items-center gap-3">
//             <button
//               onClick={() => fileRef.current?.click()}
//               disabled={Boolean(loading)}
//               className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition disabled:opacity-60"
//             >
//               Upload Excel
//             </button>
//             {active && (
//               <>
//                 <button
//                   onClick={makeDashboard}
//                   disabled={Boolean(loading)}
//                   className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 transition disabled:opacity-60"
//                 >
//                   Generate Dashboard
//                 </button>
//                 <div className="ml-auto flex gap-2">
//                   <ExportBtn label="CSV" onClick={() => exportCSV(active.id, `${active.name}.csv`)} />
//                   <ExportBtn label="Excel" onClick={() => exportExcel(active.id, `${active.name}.xlsx`)} />
//                   <ExportBtn label="PDF" onClick={() => exportPDF(active.id, `${active.name}.pdf`)} />
//                 </div>
//               </>
//             )}
//             {loading && <span className="text-sm text-brand font-medium">{loading}</span>}
//           </div>

//           {error && (
//             <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//               {error}
//             </div>
//           )}

//           {section === "dashboards" ? (
//             dashboard ? (
//               <DashboardView
//                 dashboard={dashboard}
//                 onBack={() => {
//                   setDashboard(null);
//                   setDashboardActive(null);
//                   setSection("dashboards");
//                 }}
//               />
//             ) : (
//               <div className="space-y-6">
//                 <div>
//                   <h1 className="font-display text-2xl font-semibold text-ink">Create Dashboard</h1>
//                   <p className="mt-1 text-slate-600">Upload an Excel file and get charts generated automatically.</p>
//                 </div>

//                 <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white py-16">
//                   <div className="text-center">
//                     <div className="mb-4 flex justify-center">
//                       <div className="rounded-full bg-brand-soft p-4">
//                         <svg className="h-8 w-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//                         </svg>
//                       </div>
//                     </div>
//                     <p className="font-display text-lg font-semibold text-ink">Upload Excel File</p>
//                     <p className="mt-2 text-sm text-slate-600">Only .xlsx / .xls files are supported.</p>
//                     <button
//                       onClick={() => dashboardFileRef.current?.click()}
//                       className="mt-4 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition"
//                     >
//                       Choose File
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )
//           ) : section === "sources" && !active ? (
//             <SourceList sources={sources} onOpen={openSource} />
//           ) : active ? (
//             <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
//               <div className="rounded-xl bg-white p-4 shadow-sm">
//                 <h3 className="mb-4 font-display text-sm font-semibold text-slate-700">{active.name}</h3>
//                 <div className="ag-theme-quartz overflow-hidden rounded-lg" style={{ height: 500, width: "100%" }}>
//                   <AgGridReact
//                     rowData={rows}
//                     columnDefs={columnDefs}
//                     pagination
//                     paginationPageSize={20}
//                     defaultColDef={{ flex: 1, minWidth: 120 }}
//                   />
//                 </div>
//               </div>

//               <div className="flex h-[500px] flex-col rounded-xl bg-white shadow-sm overflow-hidden">
//                 <div className="border-b border-slate-200 bg-gradient-to-r from-brand/5 to-transparent px-5 py-4">
//                   <h3 className="font-display text-sm font-semibold text-ink">Chat with Data</h3>
//                   <p className="mt-1 text-xs text-slate-500">Ask questions about your data.</p>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
//                   {messages.length === 0 && (
//                     <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
//                       <svg className="h-12 w-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
//                       </svg>
//                       <p className="text-sm">Try asking:</p>
//                       <p className="text-xs mt-2">"Show top 10 records"</p>
//                       <p className="text-xs">"Average revenue by region"</p>
//                     </div>
//                   )}
//                   {messages.map((message, index) => (
//                     <ChatMessage key={`${message.role}-${index}`} message={message} />
//                   ))}
//                 </div>

//                 <div className="border-t border-slate-200 bg-white p-3 flex gap-2">
//                   <input
//                     value={question}
//                     onChange={(event) => setQuestion(event.target.value)}
//                     onKeyDown={(event) => {
//                       if (event.key === "Enter") ask();
//                     }}
//                     placeholder="Ask a question about your data…"
//                     disabled={loading}
//                     className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:bg-slate-50"
//                   />
//                   <button
//                     onClick={ask}
//                     disabled={loading || !question.trim()}
//                     className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Send
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <EmptyState onUpload={() => fileRef.current?.click()} />
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }

// function ChatMessage({ message }) {
//   return (
//     <div className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
//       <div className={`max-w-[80%] space-y-3 ${message.role === "user" ? "text-right" : "text-left"}`}>
//         <div
//           className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
//             message.role === "user"
//               ? "bg-brand text-white rounded-br-none"
//               : "bg-slate-100 text-slate-900 rounded-bl-none"
//           }`}
//         >
//           {message.text}
//         </div>

//         {message.table?.length > 0 && (
//           <div className="ag-theme-quartz rounded-2xl overflow-hidden border border-slate-200" style={{ height: 240 }}>
//             <AgGridReact
//               rowData={message.table}
//               columnDefs={Object.keys(message.table[0]).map((field) => ({ field, sortable: true, filter: true, resizable: true }))}
//               pagination
//               paginationPageSize={8}
//               defaultColDef={{ flex: 1, minWidth: 80 }}
//             />
//           </div>
//         )}

//         {message.charts?.map((chart, index) => (
//           <div key={`${chart.title || chart.type}-${index}`} className="rounded-2xl overflow-hidden bg-white border border-slate-200">
//             <AutoChart spec={chart} height={220} />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function ExportBtn({ label, onClick }) {
//   return (
//     <button onClick={onClick} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium hover:bg-slate-100 transition">
//       {label}
//     </button>
//   );
// }

// function SourceList({ sources, onOpen }) {
//   if (!sources.length) return <EmptyState onUpload={() => fileRef.current?.click()} />;
//   return (
//     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
//       {sources.map((source) => (
//         <button
//           key={source.id}
//           onClick={() => onOpen(source)}
//           className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:shadow-md hover:border-brand/40 transition"
//         >
//           <p className="font-medium text-ink">{source.name}</p>
//           <p className="mt-1 text-sm text-slate-400">
//             {source.kind} · {source.row_count?.toLocaleString()} rows · {source.columns?.length} cols
//           </p>
//         </button>
//       ))}
//     </div>
//   );
// }

// function EmptyState({ onUpload }) {
//   return (
//     <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white py-24 text-center">
//       <svg className="h-12 w-12 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//       </svg>
//       <p className="font-display text-lg font-semibold text-slate-600">No data yet</p>
//       <p className="mt-1 max-w-sm text-sm text-slate-500">
//         Upload an Excel file to view it as a spreadsheet, chat with it, and generate a dashboard.
//       </p>
//       {onUpload && (
//         <button
//           onClick={onUpload}
//           className="mt-4 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark transition"
//         >
//           Upload File
//         </button>
//       )}
//     </div>
//   );
// }



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
import HistoryView from "../views/HistoryView";
import SettingsView from "../views/SettingsView";
import SourcesView from "../views/SourcesView";
import DashboardsView from "../views/DashboardsView";
import ReportsView from "../views/ReportsView";

// Top-level sections driven by Sidebar
const SECTION_MAP = {
  sources: SourcesView,
  dashboards: DashboardsView,
  reports: ReportsView,
  history: HistoryView,
  settings: SettingsView,
};

export default function Workspace() {
  const [section, setSection] = useState("sources");
  // activeTool is set when user clicks a specific tool from SourcesView
  const [activeTool, setActiveTool] = useState(null);

  const handleSelectSection = useCallback((key) => {
    setSection(key);
    setActiveTool(null); // always clear active tool when switching sections
  }, []);

  const handleOpenTool = useCallback((toolKey) => {
    setActiveTool(toolKey);
    setSection("sources"); // keep sources section active
  }, []);

  const handleBackFromTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  // If a specific tool is open, render only that tool
  if (activeTool) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar active="sources" onSelect={handleSelectSection} />
          <main className="flex-1 overflow-y-auto p-6">
            <ActiveTool toolKey={activeTool} onBack={handleBackFromTool} />
          </main>
        </div>
      </div>
    );
  }

  const SectionComponent = SECTION_MAP[section] || SourcesView;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={section} onSelect={handleSelectSection} />
        <main className="flex-1 overflow-y-auto p-6">
          <SectionComponent onOpenTool={handleOpenTool} />
        </main>
      </div>
    </div>
  );
}

// Routes to the correct tool component
function ActiveTool({ toolKey, onBack }) {
  const tools = {
    excel: ExcelTool,
    pdf: PDFTool,
    sql: SQLTool,
    dashboard: DashboardTool,
    api: APITool,
    report: ReportTool,
    cleaning: DataCleaningTool,
    export: ExportTool,
  };
  const Tool = tools[toolKey];
  if (!Tool) return <div className="text-slate-400">Unknown tool: {toolKey}</div>;
  return <Tool onBack={onBack} />;
}