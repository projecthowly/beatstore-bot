// client/src/views/AnalyticsView.tsx
import { Stack, Text, Paper } from "@mantine/core";

export default function AnalyticsView() {
  return (
    <Stack gap="12px">
      <Text fw={600}>Аналитика</Text>

      <Paper withBorder p="12px" radius="md" style={{ background: "rgba(255,255,255,.05)" }}>
        <Text size="sm" c="dimmed">
          Доступно на Basic и выше. Скоро здесь будут графики прослушиваний и скачиваний.
        </Text>
      </Paper>
    </Stack>
  );
}
