import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { getHttpsServerOptions } from "office-addin-dev-certs";

// Office Add-ins must be served over HTTPS, including in local dev — Excel
// (desktop, Mac, and web) refuses to load a task pane from a plain http://
// source, and the Dialog API (used for sign-in) refuses non-HTTPS URLs
// outright. office-addin-dev-certs installs one trusted local CA (run
// `npx office-addin-dev-certs install` once) that this, the web app's Vite
// server, and the backend all reuse — so every localhost origin is trusted
// and fetches between them don't hit mixed-content/cert errors.
export default defineConfig(async () => {
  const httpsOptions = await getHttpsServerOptions();

  return {
    plugins: [react()],
    server: {
      port: 3000,
      https: httpsOptions,
      host: "localhost",
    },
    build: {
      outDir: "dist",
      rollupOptions: {
        input: {
          index: "index.html",
          taskpane: "taskpane.html",
        },
      },
    },
  };
});
