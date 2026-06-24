import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL });

// --- JWT interceptor ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Global error handling ---
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    const message =
      err.response?.data?.detail || err.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// ---------- Auth ----------
export async function signup({ email, password, full_name }) {
  const { data } = await api.post("/auth/signup", { email, password, full_name });
  if (!data.access_token) throw new Error("Signup did not return an access token");
  localStorage.setItem("token", data.access_token);
  return data;
}

export async function login({ email, password }) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  const { data } = await api.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!data.access_token) throw new Error("Login did not return an access token");
  localStorage.setItem("token", data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

// ---------- Uploads ----------
function uploadFile(path, file) {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post(path, fd, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => {
      const data = r.data;
      const id = data.source?.id ?? data.source_id ?? data.id;
      return { ...data, source_id: id, id };
    });
}

export const uploadAny = (file) => uploadFile("/sources/upload", file);
export const uploadExcel = (file) => uploadFile("/sources/excel/upload", file);
export const uploadCSV = (file) => uploadFile("/sources/csv/upload", file);
export const uploadPDF = (file) => uploadFile("/sources/pdf/upload", file);
export const uploadSQLite = (file) => uploadFile("/sources/sqlite/upload", file);

// ---------- DB connectors ----------
export const connectPostgres = (cfg) => api.post("/sources/postgres/connect", cfg).then((r) => r.data);
export const connectMySQL = (cfg) => api.post("/sources/mysql/connect", cfg).then((r) => r.data);
export const connectBigQuery = (cfg) => api.post("/sources/bigquery/connect", cfg).then((r) => r.data);

// ---------- MongoDB ----------
export const connectMongoDB = (cfg) =>
  api.post("/sources/mongodb/connect", cfg).then((r) => r.data);

export const listMongoCollections = (sourceId) =>
  api.get(`/sources/mongodb/collections/${sourceId}`).then((r) => r.data);

export const switchMongoCollection = (sourceId, collection) =>
  api.post(`/sources/mongodb/switch-collection/${sourceId}?collection=${encodeURIComponent(collection)}`).then((r) => r.data);

export const askMongoDB = (source_id, question, collection) =>
  api.post("/sources/mongodb/ask", { source_id, question, collection }).then((r) => r.data);

export const refreshMongoDB = (sourceId) =>
  api.post(`/sources/mongodb/refresh/${sourceId}`).then((r) => r.data);

// ---------- Sources / Query / Dashboard ----------
export const listSources = () => api.get("/sources").then((r) => r.data);

export const deleteSource = (sourceId) =>
  api.delete(`/sources/${sourceId}`).then((r) => r.data);

export const deleteAllSources = () =>
  api.delete("/sources").then((r) => r.data);

// Smart ask — auto-routes by source type (text vs tabular)
export const askQuestion = (source_id, question) =>
  api.post("/query/ask", { source_id, question }).then((r) => r.data);

// Multi-file ask — query across multiple data sources
export const askMultiQuestion = (source_ids, question) =>
  api.post("/query/ask/multi", { source_ids, question }).then((r) => r.data);

// Format-specific ask endpoints
export const askPDF = (source_id, question) =>
  api.post("/query/ask/pdf", { source_id, question }).then((r) => r.data);

export const askDocx = (source_id, question) =>
  api.post("/query/ask/docx", { source_id, question }).then((r) => r.data);

export const askExcel = (source_id, question) =>
  api.post("/query/ask/excel", { source_id, question }).then((r) => r.data);

export const askJSON = (source_id, question) =>
  api.post("/query/ask/json", { source_id, question }).then((r) => r.data);

export const askXML = (source_id, question) =>
  api.post("/query/ask/xml", { source_id, question }).then((r) => r.data);

export const generateDashboard = (source_id) =>
  api.post("/dashboard/generate", { source_id }).then((r) => r.data);

// ---------- Dashboard Builder ----------
export const getSourceColumns = (sourceId) =>
  api.get(`/dashboard/columns/${sourceId}`).then((r) => r.data);

export const getChartData = (params) =>
  api.post("/dashboard/chart-data", params).then((r) => r.data);

export const getKpiData = (params) =>
  api.post("/dashboard/kpi-data", params).then((r) => r.data);

export const getFilterValues = (sourceId, column) =>
  api.get(`/dashboard/filter-values/${sourceId}/${encodeURIComponent(column)}`).then((r) => r.data);

export const saveDashboard = (params) =>
  api.post("/dashboard/save", params).then((r) => r.data);

export const listDashboards = () =>
  api.get("/dashboard/list").then((r) => r.data);

export const getDashboard = (dashboardId) =>
  api.get(`/dashboard/${dashboardId}`).then((r) => r.data);

export const updateDashboard = (dashboardId, params) =>
  api.put(`/dashboard/${dashboardId}`, params).then((r) => r.data);

export const deleteDashboard = (dashboardId) =>
  api.delete(`/dashboard/${dashboardId}`).then((r) => r.data);

export const getHistory = () => api.get("/history").then((r) => r.data);

export const deleteHistoryItem = (itemId) =>
  api.delete(`/history/${itemId}`).then((r) => r.data);

export const clearHistory = () =>
  api.delete("/history").then((r) => r.data);

// ---------- Download query results ----------
async function downloadQueryResult(source_id, question, format, filename) {
  const res = await api.post(
    "/query/download",
    { source_id, question, format },
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadAsExcel = (source_id, question) =>
  downloadQueryResult(source_id, question, "excel", "query_result.xlsx");

export const downloadAsPDF = (source_id, question) =>
  downloadQueryResult(source_id, question, "pdf", "query_result.pdf");

export const downloadAsJSON = (source_id, question) =>
  downloadQueryResult(source_id, question, "json", "query_result.json");

// ---------- Exports (full source download) ----------
async function download(path, source_id, filename) {
  const res = await api.post(path, { source_id }, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const exportCSV = (id, name = "export.csv") => download("/export/csv", id, name);
export const exportExcel = (id, name = "export.xlsx") => download("/export/excel", id, name);
export const exportPDF = (id, name = "export.pdf") => download("/export/pdf", id, name);

export async function generateReportBlob(source_id) {
  const res = await api.post("/export/report", { source_id }, { responseType: "blob" });
  return res.data;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Data Cleaning ----------
export const profileDataset = (source_id) =>
  api.post("/export/clean/profile", { source_id }).then((r) => r.data);

export const applyCleanFixes = (source_id, fixes) =>
  api.post("/export/clean/apply", { source_id, fixes }).then((r) => r.data);

export const getRowDetail = (source_id, row_index) =>
  api.post("/export/clean/row-detail", { source_id, row_index }).then((r) => r.data);

export async function downloadCleanedFile(source_id, fixes) {
  const res = await api.post(
    "/export/clean/download",
    { source_id, fixes },
    { responseType: "blob" }
  );
  downloadBlob(res.data, "cleaned_data.xlsx");
}

export default api;
