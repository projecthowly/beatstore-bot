import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import '@mantine/core/styles.css';            // ← ОБЯЗАТЕЛЬНО
import "./index.css";

import App from "./App";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        colorScheme?: "light" | "dark";
        themeParams?: Record<string, string>;
      };
    };
  }
}

function bootstrapTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  try { tg.ready(); tg.expand(); } catch {}
}
bootstrapTelegram();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider>
      <BrowserRouter basename="/beatstore-bot">
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
