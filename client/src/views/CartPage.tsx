import { Box, Group, Stack, Text, Center, Image } from "@mantine/core";
import { IconShoppingCart, IconTrash } from "@tabler/icons-react";
import { useApp } from "../store";
import { GlassCard, NeonButton } from "../ui/Glass";

export default function CartPage() {
  const { cart, beats, removeFromCart, clearCart } = useApp();

  const items = cart.map((c) => {
    const b = beats.find((x) => x.id === c.beatId)!;
    const licenseData = b.prices[c.license];
    const price = licenseData && typeof licenseData === "object" ? licenseData.price : 0;
    return { ...c, beat: b, price };
  });
  const total = items.reduce((s, i) => s + i.price, 0);

  return (
    <Stack gap="12px">
      <Group justify="space-between" align="center">
        <Text
          size="lg"
          fw={700}
          c="var(--text)"
          style={{
            fontFamily: 'Unbounded, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          }}
        >
          Корзина
        </Text>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--text)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            }}
          >
            Очистить
          </button>
        )}
      </Group>

      {items.length === 0 && (
        <GlassCard p="40px">
          <Center style={{ flexDirection: "column", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(110,107,255,0.15), rgba(46,161,255,0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(110,107,255,0.3)",
              }}
            >
              <IconShoppingCart size={32} color="var(--muted)" />
            </div>
            <div style={{ textAlign: "center" }}>
              <Text fw={600} c="var(--text)" size="md" mb={4}>
                Ваша корзина пуста
              </Text>
              <Text c="var(--muted)" size="sm">
                Добавьте биты из каталога
              </Text>
            </div>
          </Center>
        </GlassCard>
      )}

      {items.map((it, idx) => (
        <GlassCard key={idx} p="12px">
          <Group justify="space-between" wrap="nowrap" gap="12px">
            <Group gap="12px" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
              <Image
                src={it.beat.coverUrl}
                w={52}
                h={52}
                radius="md"
                fit="cover"
                alt={it.beat.title}
                style={{ flexShrink: 0 }}
              />
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size="sm" fw={600} c="var(--text)" lineClamp={1}>
                  {it.beat.title}
                </Text>
                <Group gap={8} mt={4}>
                  <Text
                    size="xs"
                    c="var(--muted)"
                    style={{
                      background: "rgba(110,107,255,0.15)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(110,107,255,0.25)",
                      fontWeight: 600,
                    }}
                  >
                    {it.license.toUpperCase()}
                  </Text>
                  <Text size="sm" fw={600} c="var(--text)">
                    ${it.price}
                  </Text>
                </Group>
              </Box>
            </Group>
            <button
              onClick={() => removeFromCart(it.beatId, it.license)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.3)",
                color: "#FF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,68,68,0.2)";
                e.currentTarget.style.borderColor = "rgba(255,68,68,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,68,68,0.1)";
                e.currentTarget.style.borderColor = "rgba(255,68,68,0.3)";
              }}
            >
              <IconTrash size={18} />
            </button>
          </Group>
        </GlassCard>
      ))}

      {items.length > 0 && (
        <GlassCard p="16px" mt="sm">
          <Stack gap="16px">
            <Group justify="space-between" align="center">
              <Text size="md" c="var(--muted)">Итого:</Text>
              <Text
                size="xl"
                fw={700}
                c="var(--text)"
                style={{
                  background: "linear-gradient(90deg, #6E6BFF, #2EA1FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ${total}
              </Text>
            </Group>
            <NeonButton
              style={{
                width: "100%",
                height: 44,
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              Оплатить
            </NeonButton>
          </Stack>
        </GlassCard>
      )}
    </Stack>
  );
}
