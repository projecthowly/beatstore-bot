import React, { useEffect, useRef, useState, useCallback } from "react";
import { Container, Box } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { IconChevronUp } from "@tabler/icons-react";
import { GlassBar } from "../ui/Glass";
import { useApp } from "../store";
import { Icon } from "../ui/Icon";
import beatstoreIcon from "../assets/icons/Beatstore.png";
import analyticsIcon from "../assets/icons/Analytics.png";
import accountIcon from "../assets/icons/Account.png";
import marketIcon from "../assets/icons/Market.png";

export default function BottomTabs() {
  const nav = useNavigate();
  const loc = useLocation();
  const {
    session,
    isOwnStore,
    playerCollapsed,
    togglePlayerCollapsed,
    playingBeatId,
  } = useApp();

  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicatorLeft, setIndicatorLeft] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const lastActiveIndexRef = useRef(0);

  const isActive = (p: string) => loc.pathname === p;
  const isProducer = session.role === "producer";
  const isArtist = session.role === "artist";
  const showAnalytics = isProducer && isOwnStore();
  const showCollapsedToggle = Boolean(playingBeatId) && playerCollapsed;
  const isCartPage = loc.pathname === "/cart";
  const wasCartPage = useRef(false);

  // Определяем индекс активного таба
  const getActiveIndex = () => {
    if (isArtist) {
      // Для артиста: Market (0) и Account (1)
      if (isActive("/market")) return 0;
      if (isActive("/account")) return 1;
      return 0;
    }
    // Для продюсера: Beatstore (0), Analytics (1 опционально), Account (2 или 1)
    if (isActive("/")) return 0;
    if (isActive("/analytics")) return 1;
    if (isActive("/account")) return showAnalytics ? 2 : 1;
    return 0;
  };

  const activeIndex = getActiveIndex();

  // Функция для расчета позиции индикатора
  const updateIndicatorPosition = useCallback(() => {
    if (isCartPage) return;

    const activeTab = tabRefs.current[activeIndex];
    const container = containerRef.current;

    if (activeTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      const left = tabRect.left - containerRect.left + tabRect.width / 2 - 45;
      setIndicatorLeft(left);
      lastActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex, isCartPage]);

  // Рассчитываем позицию индикатора
  useEffect(() => {
    updateIndicatorPosition();
  }, [updateIndicatorPosition]);

  // Пересчитываем позицию при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      updateIndicatorPosition();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicatorPosition]);

  // Отслеживаем переход из корзины для запуска анимации
  useEffect(() => {
    if (wasCartPage.current && !isCartPage) {
      setAnimationKey(prev => prev + 1);
    }
    wasCartPage.current = isCartPage;
  }, [isCartPage]);

  return (
    <GlassBar
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 70,
        height: "calc(var(--bottombar-h) + env(safe-area-inset-bottom,0px))",
        paddingBottom: "env(safe-area-inset-bottom,0px)",
      }}
    >
      {showCollapsedToggle && (
        <button
          type="button"
          onClick={togglePlayerCollapsed}
          style={{
            position: "absolute",
            top: -18,
            left: "50%",
            transform: "translateX(-50%)",
            padding: 0,
            background: "transparent",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
            opacity: 0.7,
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.7";
          }}
        >
          <IconChevronUp size={18} />
        </button>
      )}
      <Container size="xs" px="md" style={{ height: "100%", position: "relative" }}>
        <Box
          ref={containerRef}
          style={{
            display: "flex",
            justifyContent: "space-evenly",
            alignItems: "flex-start",
            height: "100%",
            position: "relative",
            paddingTop: "12px",
          }}
        >
          {/* Плавающий индикатор фона */}
          <Box
            key={animationKey}
            style={{
              position: "absolute",
              height: "38px",
              width: "90px",
              background: "linear-gradient(90deg, #6E6BFF, #2EA1FF)",
              borderRadius: "19px",
              transition: "left 0.35s cubic-bezier(0.25, 1.7, 0.35, 0.8), opacity 0.15s ease, transform 0.15s ease",
              animation: !isCartPage && animationKey > 0 ? "springBounce 0.8s ease-out" : "none",
              left: `${indicatorLeft}px`,
              top: "12px",
              transform: isCartPage ? "translate(-50%, 0) scale(0)" : "translate(-50%, 0) scale(1)",
              transformOrigin: "center center",
              marginLeft: "45px",
              boxShadow: "0 4px 20px rgba(110, 107, 255, 0.4)",
              opacity: isCartPage ? 0 : 1,
              zIndex: 0,
            }}
          />

          {/* Табы */}
          {isArtist ? (
            // Интерфейс для артиста: только Market и Account
            <>
              <Tab
                ref={(el) => { tabRefs.current[0] = el; }}
                icon={marketIcon}
                active={isActive("/market")}
                onClick={() => nav("/market")}
              />
              <Tab
                ref={(el) => { tabRefs.current[1] = el; }}
                icon={accountIcon}
                active={isActive("/account")}
                onClick={() => nav("/account")}
              />
            </>
          ) : (
            // Интерфейс для продюсера
            <>
              <Tab
                ref={(el) => { tabRefs.current[0] = el; }}
                icon={beatstoreIcon}
                active={isActive("/")}
                onClick={() => nav("/")}
              />
              {showAnalytics && (
                <Tab
                  ref={(el) => { tabRefs.current[1] = el; }}
                  icon={analyticsIcon}
                  active={isActive("/analytics")}
                  onClick={() => nav("/analytics")}
                />
              )}
              <Tab
                ref={(el) => { tabRefs.current[showAnalytics ? 2 : 1] = el; }}
                icon={accountIcon}
                active={isActive("/account")}
                onClick={() => nav("/account")}
              />
            </>
          )}
        </Box>
      </Container>
    </GlassBar>
  );
}

const Tab = React.forwardRef<
  HTMLDivElement,
  {
    icon: string;
    active: boolean;
    onClick: () => void;
  }
>(({ icon, active, onClick }, ref) => {
  return (
    <Box
      ref={ref}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "38px",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
        transition: "all 0.3s ease",
        opacity: active ? 1 : 0.55,
      }}
    >
      <Icon
        src={icon}
        size={38}
        alt=""
        style={{
          transition: "all 0.3s ease",
          filter: active ? "brightness(1.2)" : "brightness(0.7)",
        }}
      />
    </Box>
  );
});
