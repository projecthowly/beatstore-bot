import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "./index.css";
import App from "./App";

declare global {
  interface Window {
    Telegram?: { WebApp: { ready: () => void; expand: () => void } };
  }
}
function bootstrapTelegram(){
  const tg = window.Telegram?.WebApp; try{ tg?.ready(); tg?.expand(); }catch{}
}

const theme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: Array(10).fill("#6E6BFF") as any,
    cyanx: Array(10).fill("#2EA1FF") as any,
  },
  fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  defaultRadius: "md",
});

bootstrapTelegram();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter basename="/beatstore-bot">
        <App/>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
