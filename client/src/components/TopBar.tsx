import "../assets/fonts/unbounded.css";
import { Container, Group, Text, Indicator } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../store";
import { GlassBar } from "../ui/Glass";
import { Icon } from "../ui/Icon";
import cartIcon from "../assets/icons/Cart.png";
import marketIcon from "../assets/icons/Market.png";
import beatstoreIcon from "../assets/icons/Beatstore.png";

export default function TopBar() {
  const { seller, cart, session, viewingGlobalStore, setViewingGlobalStore, setStoreSwapAnimating, storeSwapAnimating, setPendingStoreView } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const isProducer = session.role === "producer";

  // Показываем кнопку только на первой вкладке (личный или глобальный битстор)
  const isOnBeatstorePage = loc.pathname === "/" || loc.pathname === "/market";
  const showToggleButton = isProducer && isOnBeatstorePage;

  return (
    <GlassBar
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: "var(--topbar-h)",
      }}
    >
      <Container size="xs" px="xs">
        <Group justify="space-between" wrap="nowrap" p="xs" align="center" gap="xs">
          {showToggleButton && (
            <div
              onClick={() => {
                if (storeSwapAnimating) return; // блокируем клик во время анимации

                const newViewingGlobal = !viewingGlobalStore;

                // Сохраняем pending значение
                setPendingStoreView(newViewingGlobal);

                // Запускаем анимацию гашения
                setStoreSwapAnimating(true);

                // Мгновенно меняем контент (навигация)
                const targetRoute = newViewingGlobal ? "/market" : "/";
                nav(targetRoute);

                // После fade-out (150ms) меняем иконку
                setTimeout(() => {
                  setViewingGlobalStore(newViewingGlobal);
                  setPendingStoreView(null);
                }, 150);

                // Завершаем анимацию через время fade-out + fade-in
                setTimeout(() => {
                  setStoreSwapAnimating(false);
                }, 300); // 150ms fade-out + 150ms fade-in
              }}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.2s ease, transform 0.2s ease",
                opacity: storeSwapAnimating ? 0 : 0.9,
                zIndex: 2,
              }}
              onMouseEnter={(e) => {
                if (!storeSwapAnimating) {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!storeSwapAnimating) {
                  e.currentTarget.style.opacity = "0.9";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              <Icon
                src={viewingGlobalStore ? beatstoreIcon : marketIcon}
                size={35}
                alt={viewingGlobalStore ? "Personal Beatstore" : "Global Beatstore"}
              />
            </div>
          )}
          <Text
            size="sm"
            fw={600}
            c="var(--text)"
            lineClamp={1}
            style={{
              fontFamily:
                'Unbounded, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
              minWidth: 0,
              flex: 1,
              textAlign: "center",
              margin: "0 4px",
              fontSize: "clamp(12px, 3.5vw, 14px)",
            }}
          >
            {session.role === "artist" ? (
              <Text span c="var(--muted)">BeatStore</Text>
            ) : (
              <>
                {seller.storeName || "Store"} <Text span c="var(--muted)">BeatStore</Text>
              </>
            )}
          </Text>
          <Indicator
            label={cart.length}
            disabled={cart.length === 0}
            size={18}
            color="red"
            offset={6}
            styles={{
              indicator: {
                backgroundColor: "#FF4444",
                color: "#fff",
                fontWeight: 700,
                fontSize: "11px",
                border: "2px solid var(--bg-deep)",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
              },
            }}
          >
            <div
              onClick={() => nav("/cart")}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.2s ease, transform 0.2s ease",
                opacity: 0.9,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Icon src={cartIcon} size={30} alt="Cart" />
            </div>
          </Indicator>
        </Group>
      </Container>
    </GlassBar>
  );
}
