import { Box, Button, Group, Stack, Text, Paper, Center } from "@mantine/core";
import { IconShoppingCart } from "@tabler/icons-react";
import { useApp } from "../store";

export default function CartPage() {
  const { cart, beats, removeFromCart, clearCart } = useApp();

  const items = cart.map((c) => {
    const b = beats.find((x) => x.id === c.beatId)!;
    return { ...c, beat: b, price: b.prices[c.license] || 0 };
  });
  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <Stack gap="12px">
      <Text fw={600}>Корзина</Text>

      {items.length === 0 && (
        <Paper
          withBorder
          p="24px"
          radius="md"
          style={{
            borderStyle: "dashed",
            background: "rgba(255,255,255,.03)",
          }}
        >
          <Center style={{ flexDirection: "column", gap: 8 }}>
            <IconShoppingCart size={36} />
            <Text c="dimmed" size="sm">Ваша корзина пуста</Text>
            <Text c="dimmed" size="xs">Добавьте биты из каталога</Text>
          </Center>
        </Paper>
      )}

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
              <Text size="sm" fw={600}>{it.beat.title}</Text>
              <Text size="xs" c="dimmed">{it.license.toUpperCase()} — ${it.price}</Text>
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
            <Button variant="outline" onClick={clearCart}>Очистить</Button>
            <Button fullWidth color="blue">Оплатить</Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
