import { Container, Group, Text, Button, Avatar } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";
import { GlassBar } from "../ui/Glass";

export default function TopBar() {
  const { seller, cart } = useApp();
  const nav = useNavigate();

  return (
    <GlassBar
      style={{
        position: "sticky", top: 0, zIndex: 20,
        height: "var(--topbar-h)",
      }}
    >
      <Container size="xs">
        <Group justify="space-between" wrap="nowrap" p="md">
          <Avatar radius="xl" size={32} />
          <Text size="sm" fw={600} c="var(--text)" lineClamp={1}>
            {seller.storeName || "Store"} <Text span c="var(--muted)">Store</Text>
          </Text>
          <Button size="xs" variant="light" onClick={() => nav("/cart")}
                  styles={{ root:{ color:"#fff", background:"linear-gradient(90deg,#6E6BFF,#2EA1FF)", border:"1px solid var(--surface-border)" } }}>
            Cart{cart.length ? ` (${cart.length})` : ""}
          </Button>
        </Group>
      </Container>
    </GlassBar>
  );
}
