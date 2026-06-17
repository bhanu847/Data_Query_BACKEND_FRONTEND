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
  // backend uses OAuth2 form (username = email)
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
      // Backend returns { source: { id, ... }, preview, columns }
      // Normalize so callers can use res.source_id or res.id directly
      const id = data.source?.id ?? data.source_id ?? data.id;
      return { ...data, source_id: id, id };
    });
}

export const uploadAny = (file) => uploadFile("/sources/upload", file);
export const uploadExcel = (file) => uploadFile("/sources/excel/upload", file);
export const uploadCSV = (file) => uploadFile("/sources/csv/upload", file);
export const uploadPDF = (file) => uploadFile("/sources/pdf/upload", file);
export const uploadSQLite = (file) => uploadFile("/sources/sqlite/upload", file);

// ---------- DB connectors (Phase 2 stubs) ----------
export const connectPostgres = (cfg) => api.post("/sources/postgres/connect", cfg).then((r) => r.data);
export const connectMySQL = (cfg) => api.post("/sources/mysql/connect", cfg).then((r) => r.data);
export const connectMongoDB = (cfg) => api.post("/sources/mongodb/connect", cfg).then((r) => r.data);
export const connectBigQuery = (cfg) => api.post("/sources/bigquery/connect", cfg).then((r) => r.data);

// ---------- Sources / Query / Dashboard ----------
export const listSources = () => api.get("/sources").then((r) => r.data);

export const askQuestion = (source_id, question) =>
  api.post("/query/ask", { source_id, question }).then((r) => r.data);

export const generateDashboard = (source_id) =>
  api.post("/dashboard/generate", { source_id }).then((r) => r.data);

export const getHistory = () => api.get("/history").then((r) => r.data);

// ---------- Exports (download support) ----------
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

export default api;
