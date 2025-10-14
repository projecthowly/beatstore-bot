// client/src/main.tsx
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MantineProvider
    theme={{
      primaryColor: "indigo",
      fontFamily: "Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, Arial, sans-serif",
      colors: {
        dark: [
          "#101114",
          "#0b0a0d",
          "#15161c",
          "#1a1c25",
          "#202334",
          "#21263d",
          "#263058",
          "#2c3570",
          "#32408c",
          "#3a49a3",
        ],
      },
    }}
    defaultColorScheme="dark"
  >
    <Notifications position="top-right" />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </MantineProvider>
);
