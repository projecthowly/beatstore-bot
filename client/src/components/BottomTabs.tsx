// client/src/components/BottomTabs.tsx
import { Paper, Container, SimpleGrid, Button } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../store";

export default function BottomTabs() {
  const { session, seller } = useApp();
  const isListener = session.role === "listener";
  const nav = useNavigate();
  const loc = useLocation();
  const isActive = (p: string) => loc.pathname === p;

  return (
    <Paper
      component="nav"
      withBorder
      p="xs"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: "1px solid rgba(255,255,255,.1)",
        background: "rgba(0,0,0,.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Container size="xs" px="xs">
        <SimpleGrid cols={3} spacing={0}>
          <Tab
            label="Битстор"
            active={isActive("/")}
            onClick={() => nav("/")}
          />
          {!isListener ? (
            <Tab
              label="Аналитика"
              active={isActive("/analytics")}
              onClick={() =>
                seller.plan === "free"
                  ? alert("Доступно на плане Basic")
                  : nav("/analytics")
              }
              disabled={seller.plan === "free"}
            />
          ) : (
            <div /> /* пустая ячейка, чтобы сохранить сетку из 3 колонок */
          )}
          <Tab
            label="Аккаунт"
            active={isActive("/account")}
            onClick={() => nav("/account")}
          />
        </SimpleGrid>
      </Container>
      <div style={{ height: 8 }} />
    </Paper>
  );
}

function Tab({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="subtle"
      onClick={!disabled ? onClick : undefined}
      style={{ opacity: disabled ? 0.5 : 1 }}
      c={active ? "white" : "dimmed"}
      py="md"
      fullWidth
      radius="sm"
    >
      {label}
    </Button>
  );
}
