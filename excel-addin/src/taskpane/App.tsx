import { useEffect, useRef, useState } from "react";
import * as api from "./api";
import { executeTool } from "./officeTools";
import { getToken, setToken } from "./session";
import type { ChatMessage, ChatResponse, ToolCall, ToolResult } from "./types";

export default function App() {
  const [signedIn, setSignedIn] = useState(!!getToken());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, progress]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authBusy) return;
    setAuthError("");
    setAuthBusy(true);
    try {
      const data = await api.login(email, password);
      setToken(data.access_token);
      await api.connectExcelLive();
      setSignedIn(true);
      setMessages([{ role: "assistant", text: "Connected! Ask me anything about this workbook." }]);
    } catch (e: any) {
      setAuthError(e.message || "Sign-in failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const describeCall = (call: ToolCall): string => {
    const loc = call.input?.sheet ? `${call.input.sheet}!${call.input.range ?? ""}` : call.input?.range;
    switch (call.name) {
      case "get_workbook_overview":
        return "Reading workbook structure…";
      case "read_range":
        return `Reading ${loc}…`;
      case "write_range":
        return `Writing to ${loc}…`;
      case "add_worksheet":
        return `Adding sheet "${call.input?.name}"…`;
      case "format_range":
        return `Formatting ${loc}…`;
      case "delete_range":
        return `Deleting ${loc}…`;
      case "insert_range":
        return `Inserting at ${loc}…`;
      case "clear_range":
        return `Clearing ${loc}…`;
      case "delete_worksheet":
        return `Deleting sheet "${call.input?.sheet}"…`;
      case "analyze_range":
        return `Analyzing ${loc}…`;
      case "create_chart":
        return `Creating ${call.input?.chartType ?? ""} chart…`;
      default:
        return `Running ${call.name}…`;
    }
  };

  const runToolLoop = async (convId: string, calls: ToolCall[]) => {
    const results: ToolResult[] = [];
    for (const call of calls) {
      setProgress(describeCall(call));
      const content = await executeTool(call.name, call.input);
      results.push({ tool_use_id: call.id, content });
    }
    setProgress(null);
    const res = await api.sendToolResults(convId, results);
    await handleResponse(res);
  };

  const handleResponse = async (res: ChatResponse) => {
    setConversationId(res.conversation_id);
    if (res.type === "tool_calls") {
      await runToolLoop(res.conversation_id, res.calls);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: res.text || "" }]);
      setBusy(false);
    }
  };

  const sendText = async (text: string) => {
    if (!text || busy) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await api.sendChatMessage(conversationId, text);
      await handleResponse(res);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}`, isError: true }]);
      setBusy(false);
      setProgress(null);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void sendText(text);
  };

  if (!signedIn) {
    return (
      <form className="dq-signin" onSubmit={handleSignIn}>
        <div className="dq-logo">DataQuery AI</div>
        <p className="dq-muted">Sign in to chat with this workbook.</p>
        <input
          className="dq-input dq-signin-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={authBusy}
          required
        />
        <input
          className="dq-input dq-signin-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={authBusy}
          required
        />
        <button type="submit" className="dq-btn-primary" disabled={authBusy}>
          {authBusy ? "Signing in…" : "Sign in"}
        </button>
        {authError && <p className="dq-error">{authError}</p>}
      </form>
    );
  }

  return (
    <div className="dq-app">
      <div className="dq-header">DataQuery AI</div>
      <div className="dq-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`dq-bubble dq-bubble-${msg.role}${msg.isError ? " dq-bubble-error" : ""}`}>
            <span className="dq-bubble-text">{msg.text}</span>
            {msg.role === "assistant" &&
              !msg.isError &&
              idx === messages.length - 1 &&
              !busy &&
              /confirm|proceed\?|overwrite/i.test(msg.text) && (
                <div className="dq-confirm-row">
                  <button className="dq-btn-confirm" onClick={() => sendText("Yes, please proceed.")}>
                    Confirm
                  </button>
                  <button className="dq-btn-cancel" onClick={() => sendText("No, cancel that.")}>
                    Cancel
                  </button>
                </div>
              )}
          </div>
        ))}
        {progress && <div className="dq-progress">{progress}</div>}
        {busy && !progress && <div className="dq-progress">Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="dq-input-row">
        <input
          className="dq-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about your workbook…"
          disabled={busy}
        />
        <button className="dq-btn-send" onClick={send} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
