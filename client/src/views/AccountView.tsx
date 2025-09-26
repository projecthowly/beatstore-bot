import { Stack, Text, Button, Group, Paper, Divider } from "@mantine/core";
import { useApp } from "../store";

export default function AccountView() {
  const { seller } = useApp();

  return (
    <Stack gap="12px">
      <Group justify="space-between" align="center">
        <Text fw={600}>Аккаунт</Text>
        <Button size="xs" color="blue">Обновить план</Button>
      </Group>

      <Paper withBorder p="12px" radius="md" style={{ background: "rgba(255,255,255,.05)" }}>
        <Stack gap="6px">
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Имя</Text>
            <Text size="sm">{seller.storeName || "—"}</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Текущий план</Text>
            <Text size="sm">{seller.plan}</Text>
          </Group>
        </Stack>

        <Divider my="sm" />
        <Group justify="flex-end" gap="8px">
          <Button variant="outline" size="xs">Изменить имя</Button>
          <Button variant="outline" size="xs">Язык: RU / EN</Button>
        </Group>
      </Paper>
    </Stack>
  );
}
