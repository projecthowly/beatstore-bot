import { Stack, Text, Paper } from "@mantine/core";
import { useApp } from "../store";

export default function AnalyticsView() {
  const { seller } = useApp();
  const isFree = seller.plan === "free";

  return (
    <Stack gap="12px">
      <Text fw={600}>Аналитика</Text>

      <Paper withBorder p="12px" radius="md" style={{ background: "rgba(255,255,255,.05)" }}>
        {isFree ? (
          <Text size="sm" c="dimmed">
            Доступно на плане <b>Basic</b> и выше. Здесь будут графики прослушиваний и скачиваний.
          </Text>
        ) : (
          <Text size="sm" c="dimmed">Здесь появятся графики и метрики.</Text>
        )}
      </Paper>
    </Stack>
  );
}
