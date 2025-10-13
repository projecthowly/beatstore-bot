import "../assets/fonts/unbounded.css";
import { Container, Group, Text, Avatar, Indicator } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";
import { GlassBar } from "../ui/Glass";
import { Icon } from "../ui/Icon";
import cartIcon from "../assets/icons/Cart.png";

export default function TopBar() {
  const { seller, cart, goToOwnStore } = useApp();
  const nav = useNavigate();

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
          <Avatar
            radius="xl"
            size={28}
            onClick={goToOwnStore}
            style={{ cursor: "pointer", flexShrink: 0 }}
          />
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
            {seller.storeName || "Store"} <Text span c="var(--muted)">BeatStore</Text>
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
