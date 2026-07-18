/// <reference types="office-js" />
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./style.css";

Office.onReady(() => {
  const container = document.getElementById("root");
  if (!container) return;
  createRoot(container).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
});
