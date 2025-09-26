// client/src/components/TopBar.tsx
import { Paper, Container, Group, Text, Button, Avatar } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";

export default function TopBar() {
  const { seller, cart } = useApp();
  const nav = useNavigate();

  return (
    <Paper
      component="header"
      withBorder
      p="md"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,.1)",
        background: "rgba(0,0,0,.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Container size="xs">
        <Group justify="space-between" wrap="nowrap">
          <Avatar radius="xl" size={32} />
          <Text size="sm" fw={600} lineClamp={1}>
            {seller.storeName || "Store"} <Text span c="dimmed">Store</Text>
          </Text>
          <Button
            size="xs"
            color="blue"
            onClick={() => nav("/cart")}
          >
            Cart{cart.length ? ` (${cart.length})` : ""}
          </Button>
        </Group>
      </Container>
    </Paper>
  );
}
