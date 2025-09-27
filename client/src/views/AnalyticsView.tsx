import { Stack, Text, Paper } from "@mantine/core";
import { useApp } from "../store";

export default function AnalyticsView() {
  const { seller } = useApp();
  const isFree = seller.plan === "free";

  return (
    <Stack gap="12px">
      <Text fw={600} style={{ color: 'var(--text)' }}>Аналитика</Text>
      <Paper withBorder p="12px" radius="md" style={{ background: "var(--surface)", borderColor: "var(--muted)" }}>
        {isFree ? (
          <Text size="sm" style={{ color: 'var(--muted)' }}>
            Доступно на плане <b>Basic</b> и выше. Здесь будут графики прослушиваний и скачиваний.
          </Text>
        ) : (
          <Text size="sm" style={{ color: 'var(--muted)' }}>Здесь появятся графики и метрики.</Text>
        )}
      </Paper>
    </Stack>
  );
}
