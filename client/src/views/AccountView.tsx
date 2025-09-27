import { Stack, Text, Button, Group, Paper, Divider } from "@mantine/core";
import { useApp } from "../store";

export default function AccountView() {
  const { seller } = useApp();

  return (
    <Stack gap="12px">
      <Group justify="space-between" align="center">
        <Text fw={600} style={{ color: 'var(--text)' }}>Аккаунт</Text>
        <Button size="xs" color="brand" c="var(--text)">Обновить план</Button>
      </Group>

      <Paper withBorder p="12px" radius="md" style={{ background: "var(--surface)", borderColor: "var(--muted)" }}>
        <Stack gap="6px">
          <Group justify="space-between">
            <Text size="sm" style={{ color: 'var(--muted)' }}>Имя</Text>
            <Text size="sm" style={{ color: 'var(--text)' }}>{seller.storeName || "—"}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" style={{ color: 'var(--muted)' }}>Текущий план</Text>
            <Text size="sm" style={{ color: 'var(--text)' }}>{seller.plan}</Text>
          </Group>
        </Stack>

        <Divider my="sm" style={{ borderColor: 'var(--muted)' }} />
        <Group justify="flex-end" gap="8px">
          <Button variant="outline" size="xs" c="var(--text)" style={{ borderColor: 'var(--muted)' }}>Изменить имя</Button>
          <Button variant="outline" size="xs" c="var(--text)" style={{ borderColor: 'var(--muted)' }}>Язык: RU / EN</Button>
        </Group>
      </Paper>
    </Stack>
  );
}
