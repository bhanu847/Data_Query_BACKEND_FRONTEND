import { getToken } from "./session";
import type { ChatResponse, ToolResult } from "./types";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new Error(detail);
  }
  return res.json();
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

// Signs in directly from the task pane — no Office Dialog popup. The add-in
// used to open a separate sign-in popup (Office Dialog API), but its
// parent/child messageParent handshake proved unreliable in Excel Online, so
// the task pane now just calls the login API itself, same as the web app.
export const login = (email: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
};

export interface ConnectResponse {
  source_id: number;
  connected: boolean;
  last_active_at: string | null;
  created_at: string | null;
}

export const connectExcelLive = () => request<ConnectResponse>("/excel-live/connect", { method: "POST" });

export const sendChatMessage = (conversationId: string | null, message: string) =>
  request<ChatResponse>("/excel-live/chat", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

export const sendToolResults = (conversationId: string, results: ToolResult[]) =>
  request<ChatResponse>("/excel-live/tool-results", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, results }),
  });

export type { ChatResponse };
