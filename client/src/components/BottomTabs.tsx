import { Paper, Container, SimpleGrid, Button } from "@mantine/core";
import { useLocation, useNavigate } from "react-router-dom";

export default function BottomTabs() {
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
        height: "calc(var(--bottombar-h) + env(safe-area-inset-bottom, 0px))",
        borderTop: "1px solid rgba(255,255,255,.12)",
        background: "rgba(0,0,0,.25)",
        backdropFilter: "blur(8px)",
        zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Container size="xs" px="xs" style={{ height: "100%" }}>
        <SimpleGrid cols={3} spacing={0} style={{ height: "100%" }}>
          <Tab label="Битстор" active={isActive("/")} onClick={() => nav("/")} />
          <Tab label="Аналитика" active={isActive("/analytics")} onClick={() => nav("/analytics")} />
          <Tab label="Аккаунт" active={isActive("/account")} onClick={() => nav("/account")} />
        </SimpleGrid>
      </Container>
    </Paper>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="subtle"
      onClick={onClick}
      c={active ? "white" : "dimmed"}
      fullWidth
      radius="sm"
      style={{ height: "100%" }}
    >
      {label}
    </Button>
  );
}
