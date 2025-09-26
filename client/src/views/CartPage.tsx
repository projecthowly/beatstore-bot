// client/src/views/CartPage.tsx
import { Box, Button, Group, Stack, Text, Paper } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";

export default function CartPage() {
  const nav = useNavigate();
  const { cart, beats, removeFromCart, clearCart } = useApp();

  const items = cart.map((c) => {
    const b = beats.find((x) => x.id === c.beatId)!;
    return { ...c, beat: b, price: b.prices[c.license] || 0 };
  });
  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <Stack gap="12px">
      <Button variant="subtle" onClick={() => nav(-1)}>
        ← Назад
      </Button>

      <Text fw={600}>Корзина</Text>

      {items.length === 0 && <Text c="dimmed">Пусто.</Text>}

      {items.map((it, idx) => (
        <Paper
          key={idx}
          withBorder
          p="12px"
          radius="md"
          style={{ background: "rgba(255,255,255,.05)" }}
        >
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={600}>
                {it.beat.title}
              </Text>
              <Text size="xs" c="dimmed">
                {it.license.toUpperCase()} — ${it.price}
              </Text>
            </Box>
            <Button
              size="xs"
              variant="outline"
              onClick={() => removeFromCart(it.beatId, it.license)}
            >
              Удалить
            </Button>
          </Group>
        </Paper>
      ))}

      {items.length > 0 && (
        <Stack gap="10px" mt="sm">
          <Group justify="space-between">
            <Text>Итого:</Text>
            <Text fw={600}>${total}</Text>
          </Group>
          <Group>
            <Button variant="outline" onClick={clearCart}>
              Очистить
            </Button>
            <Button fullWidth color="blue">
              Оплатить
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
