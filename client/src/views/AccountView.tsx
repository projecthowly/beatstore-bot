// client/src/views/AccountView.tsx
import { Stack, Text, Button, Group, Paper } from "@mantine/core";
import { useApp } from "../store";

export default function AccountView() {
  const { seller } = useApp();

  return (
    <Stack gap="12px">
      <Text fw={600}>Аккаунт</Text>

      <Paper withBorder p="12px" radius="md" style={{ background: "rgba(255,255,255,.05)" }}>
        <Stack gap="6px">
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Store name</Text>
            <Text size="sm">{seller.storeName || "—"}</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">План</Text>
            <Text size="sm">{seller.plan}</Text>
          </Group>
        </Stack>
      </Paper>

      <Group gap="8px">
        <Button variant="outline">Изменить Store name</Button>
        <Button variant="outline">Обновить план</Button>
        <Button variant="outline">Язык: RU / EN</Button>
      </Group>
    </Stack>
  );
}
