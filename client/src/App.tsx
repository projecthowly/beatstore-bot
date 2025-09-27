import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Container, Stack } from "@mantine/core";

import TopBar from "./components/TopBar";
import BottomTabs from "./components/BottomTabs";
import Player from "./components/Player";

import CatalogView from "./views/CatalogView";
import AnalyticsView from "./views/AnalyticsView";
import AccountView from "./views/AccountView";
import CartPage from "./views/CartPage";
import BeatPage from "./views/BeatPage";

export default function App() {
  // если откроют вне Telegram — включим «тёмную» тему сайта по нашим цветам
  useEffect(() => {
    document.body.style.background = "var(--bg)";
    document.body.style.color = "var(--text)";
  }, []);

  return (
    <>
      <TopBar />

      {/* Контентная зона: отступ сверху под шапку и снизу под таббар/плеер */}
      <Container
        size="xs"
        px="sm"
        style={{
          paddingTop: "12px",
          paddingBottom: "calc(var(--bottombar-h) + var(--player-gap))",
          minHeight: "100dvh",
        }}
      >
        <Stack gap="12px">
          <Routes>
            <Route path="/" element={<CatalogView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/account" element={<AccountView />} />
            <Route path="/beat/:id" element={<BeatPage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </Stack>
      </Container>

      <Player />
      <BottomTabs />
    </>
  );
}
