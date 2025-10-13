import { Modal, Stack, Button, Text } from "@mantine/core";
import { GlassCard } from "../ui/Glass";

type Props = {
  opened: boolean;
  onSelectRole: (role: "producer" | "artist") => void;
};

export function RoleSelectionModal({ opened, onSelectRole }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={() => {}} // Нельзя закрыть - обязательно выбрать роль
      withCloseButton={false}
      centered
      size="md"
      overlayProps={{ blur: 10, opacity: 0.8 }}
      styles={{
        content: {
          background: "transparent",
          boxShadow: "none",
        },
        body: {
          padding: 0,
        },
      }}
    >
      <GlassCard
        style={{
          padding: "32px 24px",
          borderRadius: 20,
        }}
      >
        <Stack gap={24} align="center">
          <Text
            size="24px"
            fw={700}
            style={{
              background: "linear-gradient(90deg, #6E6BFF, #2EA1FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textAlign: "center",
            }}
          >
            Добро пожаловать! 👋
          </Text>

          <Text
            size="16px"
            c="var(--text)"
            style={{
              opacity: 0.8,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Выберите свою роль, чтобы начать работу
          </Text>

          <Stack gap={12} w="100%" mt={8}>
            <Button
              size="lg"
              fullWidth
              variant="gradient"
              gradient={{ from: "#6E6BFF", to: "#2EA1FF", deg: 90 }}
              radius="md"
              onClick={() => onSelectRole("producer")}
              styles={{
                root: {
                  height: 56,
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: "0 4px 20px rgba(110, 107, 255, 0.4)",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 6px 24px rgba(110, 107, 255, 0.5)",
                  },
                },
              }}
            >
              🎹 Я продюсер
            </Button>

            <Button
              size="lg"
              fullWidth
              variant="outline"
              radius="md"
              onClick={() => onSelectRole("artist")}
              styles={{
                root: {
                  height: 56,
                  fontSize: 16,
                  fontWeight: 600,
                  borderColor: "rgba(110, 107, 255, 0.3)",
                  color: "var(--text)",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "rgba(110, 107, 255, 0.6)",
                    backgroundColor: "rgba(110, 107, 255, 0.05)",
                    transform: "translateY(-2px)",
                  },
                },
              }}
            >
              🎤 Я артист
            </Button>
          </Stack>

          <Text
            size="12px"
            c="var(--muted)"
            style={{
              textAlign: "center",
              marginTop: 8,
              opacity: 0.6,
            }}
          >
            Вы сможете изменить роль позже в настройках
          </Text>
        </Stack>
      </GlassCard>
    </Modal>
  );
}
