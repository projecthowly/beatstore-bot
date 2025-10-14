// client/src/App.tsx
import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Box, Container } from "@mantine/core";

import TopBar from "./components/TopBar";
import BottomTabs from "./components/BottomTabs";
import { RoleSelectionModal } from "./components/RoleSelectionModal";

import CatalogView from "./views/CatalogView";
import BeatPage from "./views/BeatPage";
import CartPage from "./views/CartPage";
import AccountView from "./views/AccountView";
import AnalyticsView from "./views/AnalyticsView";
import { GlobalMarketView } from "./views/GlobalMarketView";

import { useApp } from "./store";

export default function App() {
  const { initFromUrl, session, selectRole, userInitialized } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    initFromUrl();
  }, [initFromUrl]);

  // Обработка выбора роли и редирект на соответствующую страницу
  const handleRoleSelect = (role: "producer" | "artist") => {
    selectRole(role);
    if (role === "artist") {
      navigate("/market");
    } else {
      navigate("/");
    }
  };

  // Показываем загрузку пока идёт проверка/создание пользователя
  if (!userInitialized) {
    return (
      <Box
        style={{
          height: "100dvh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <div style={{ color: "var(--text)", opacity: 0.7 }}>Загрузка...</div>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* Модальное окно выбора роли для новых пользователей */}
      <RoleSelectionModal
        opened={session.isNewUser === true}
        onSelectRole={handleRoleSelect}
      />

      <Box
        style={{
          height: "100dvh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <TopBar />

        <Box
          className="main-scroll-container"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Container
            size="xs"
            px="sm"
            style={{
              paddingTop: 12,
              paddingBottom: "calc(var(--bottombar-h) + 16px)",
            }}
          >
            <Routes>
              <Route path="/" element={<CatalogView />} />
              <Route path="/beat/:id" element={<BeatPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/account" element={<AccountView />} />
              <Route path="/analytics" element={<AnalyticsView />} />
              <Route path="/market" element={<GlobalMarketView />} />
            </Routes>
          </Container>
        </Box>

        <BottomTabs />
        {/* ВАЖНО: никакого нижнего плеера здесь больше нет */}
      </Box>
    </>
  );
}
