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
      <Text fw={600} style={{ color: 'var(--text)' }}>Корзина</Text>

      {items.length === 0 && (
        <Paper withBorder p="24px" radius="md"
          style={{ borderStyle: "dashed", background: "var(--surface)", borderColor: "var(--muted)" }}>
          <Center style={{ flexDirection: "column", gap: 8 }}>
            <IconShoppingCart size={36} color="var(--muted)" />
            <Text style={{ color: 'var(--muted)' }} size="sm">Ваша корзина пуста</Text>
            <Text style={{ color: 'var(--muted)' }} size="xs">Добавьте биты из каталога</Text>
          </Center>
        </Paper>
      )}

      {items.map((it, idx) => (
        <Paper key={idx} withBorder p="12px" radius="md"
          style={{ background: "var(--surface)", borderColor: "var(--muted)" }}>
          <Group justify="space-between">
            <Box>
              <Text size="sm" fw={600} style={{ color: 'var(--text)' }}>{it.beat.title}</Text>
              <Text size="xs" style={{ color: 'var(--muted)' }}>
                {it.license.toUpperCase()} — ${it.price}
              </Text>
            </Box>
            <Button size="xs" variant="outline" c="var(--text)" style={{ borderColor: 'var(--muted)' }}
              onClick={() => removeFromCart(it.beatId, it.license)}>
              Удалить
            </Button>
          </Group>
        </Paper>
      ))}

      {items.length > 0 && (
        <Stack gap="10px" mt="sm">
          <Group justify="space-between">
            <Text style={{ color: 'var(--text)' }}>Итого:</Text>
            <Text fw={600} style={{ color: 'var(--text)' }}>${total}</Text>
          </Group>
          <Group>
            <Button variant="outline" c="var(--text)" style={{ borderColor: 'var(--muted)' }} onClick={clearCart}>
              Очистить
            </Button>
            <Button fullWidth color="brand" c="var(--text)">Оплатить</Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
