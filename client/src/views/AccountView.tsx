import { useCallback, useEffect, useState } from "react";
import {
  Stack,
  Text,
  Button,
  Group,
  Paper,
  Divider,
  TextInput,
  Modal,
} from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store";
import { GlassCard, NeonButton } from "../ui/Glass";

export default function AccountView() {
  const { me, seller, updateNickname, isOwnStore, goToOwnStore, session } = useApp();
  const navigate = useNavigate();

  const [opened, setOpened] = useState(false);
  const [name, setName] = useState(() => me.storeName || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isArtist = session.role === "artist";
  const isProducer = session.role === "producer";

  useEffect(() => {
    if (!opened) return;
    setName(me.storeName || "");
    setError(null);
  }, [opened, me.storeName]);

  const validate = useCallback((value: string) => {
    const val = value.trim();
    if (!val) return "Введите ник";
    if (val.length > 15) return "Слишком длинный ник (макс. 15 символов)";
    return null;
  }, []);

  const onSave = async () => {
    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await updateNickname(name.trim());
      setOpened(false);
    } catch (error) {
      console.error("Ошибка при сохранении ника:", error);
      setError("Ошибка при сохранении. Попробуйте снова.");
    } finally {
      setSaving(false);
    }
  };

  const currentPlan = seller.plan || "—";
  const currentName = seller.storeName || "—";
  const currentRole = isArtist ? "Артист 🎤" : "Продюсер 🎹";

  return (
    <>
      <Stack gap="12px">
        <Group justify="space-between" align="center">
          <Text fw={600} style={{ color: "var(--text)" }}>
            Аккаунт
          </Text>
          {isProducer && <NeonButton size="xs">Обновить план</NeonButton>}
        </Group>

        <Paper
          withBorder
          p="12px"
          radius="lg"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderRadius: 16,
          }}
        >
          <Stack gap="10px">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" style={{ color: "var(--muted)" }}>
                Имя (ник)
              </Text>
              <Text size="sm" style={{ color: "var(--text)" }} lineClamp={1}>
                {currentName}
              </Text>
            </Group>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" style={{ color: "var(--muted)" }}>
                Роль
              </Text>
              <Text size="sm" style={{ color: "var(--text)" }}>
                {currentRole}
              </Text>
            </Group>
            {isProducer && (
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" style={{ color: "var(--muted)" }}>
                  Текущий план
                </Text>
                <Text size="sm" style={{ color: "var(--text)" }}>
                  {currentPlan}
                </Text>
              </Group>
            )}
          </Stack>

          <Divider my="sm" style={{ borderColor: "var(--surface-border)" }} />

          <Group justify="flex-start" gap="8px">
            <Button
              variant="outline"
              size="xs"
              c="var(--text)"
              styles={{
                root: {
                  borderColor: "var(--surface-border)",
                  background: "rgba(255,255,255,0.04)",
                },
              }}
              onClick={() => setOpened(true)}
            >
              Смена ника
            </Button>

            {isProducer && (
              <Button
                variant="outline"
                size="xs"
                c="var(--text)"
                styles={{
                  root: {
                    borderColor: "var(--surface-border)",
                    background: "rgba(255,255,255,0.04)",
                  },
                }}
                onClick={() => navigate("/licenses")}
              >
                Управление лицензиями 📜
              </Button>
            )}

            {isArtist && (
              <Button
                variant="outline"
                size="xs"
                c="var(--text)"
                styles={{
                  root: {
                    borderColor: "var(--surface-border)",
                    background: "rgba(255,255,255,0.04)",
                  },
                }}
                onClick={async () => {
                  await goToOwnStore();
                  navigate("/");
                }}
              >
                Открыть битстор 🎹
              </Button>
            )}

            {!isOwnStore() && (
              <Button
                variant="light"
                size="xs"
                onClick={async () => {
                  await goToOwnStore();
                  navigate("/");
                }}
                styles={{ root: { color: "var(--text)" } }}
              >
                Открыть мою витрину
              </Button>
            )}
          </Group>

          <Divider my="sm" style={{ borderColor: "var(--surface-border)" }} />

          <Group justify="flex-end" gap="8px">
            <Button
              variant="outline"
              size="xs"
              c="var(--text)"
              styles={{
                root: {
                  borderColor: "var(--surface-border)",
                  background: "rgba(255,255,255,0.04)",
                },
              }}
            >
              Язык: RU / EN
            </Button>
          </Group>
        </Paper>

        {/* История покупок для артиста */}
        {isArtist && (
          <Paper
            withBorder
            p="12px"
            radius="lg"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              borderRadius: 16,
            }}
          >
            <Stack gap="10px">
              <Text fw={600} style={{ color: "var(--text)" }}>
                История покупок
              </Text>
              <Text size="sm" style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
                У вас пока нет покупок 🛒
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        centered
        size="auto"
        withCloseButton={false}
        padding={0}
        styles={{
          overlay: {
            background: "rgba(7, 8, 12, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          },
          content: {
            background: "transparent",
            border: "none",
            boxShadow: "none",
            width: "min(380px, 92vw)",
            padding: 0,
          },
          body: { padding: 0 },
        }}
      >
        <GlassCard
          style={{
            position: "relative",
            padding: "clamp(20px, 5vw, 24px)",
            color: "var(--text)",
          }}
        >
          <Stack gap="md">
            <Stack gap="xs" align="center">
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(110,107,255,0.2), rgba(46,161,255,0.15))",
                  border: "1px solid rgba(110,107,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconUser size={24} color="var(--text)" />
              </div>

              <Text
                fw={700}
                ta="center"
                style={{
                  color: "var(--text)",
                  fontSize: "clamp(15px, 4vw, 17px)",
                  marginTop: 4,
                }}
              >
                Смена ника
              </Text>
            </Stack>

            <TextInput
              placeholder="Ваш ник"
              value={name}
              maxLength={15}
              onChange={(event) => {
                setName(event.currentTarget.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave();
              }}
              error={error || undefined}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  height: 44,
                  fontSize: "clamp(13px, 3.5vw, 14px)",
                  transition: "all 0.2s ease",
                  "&:focus": {
                    background: "rgba(255, 255, 255, 0.06)",
                    borderColor: "rgba(110,107,255,0.5)",
                  },
                  "&::placeholder": {
                    color: "var(--muted)",
                  },
                },
                error: {
                  color: "#FF4444",
                  fontSize: "clamp(11px, 3vw, 12px)",
                  marginTop: 6,
                },
              }}
            />

            <Group justify="space-between" gap="10px" align="center" mt="xs">
              <button
                onClick={() => setOpened(false)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--text)",
                  fontSize: "clamp(13px, 3.5vw, 14px)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
              >
                Отмена
              </button>
              <NeonButton
                onClick={onSave}
                loading={saving}
                style={{
                  flex: 1,
                  height: 42,
                  fontSize: "clamp(13px, 3.5vw, 14px)",
                  fontWeight: 700,
                }}
              >
                Сохранить
              </NeonButton>
            </Group>

            <Text
              size="xs"
              ta="center"
              style={{
                color: "var(--muted)",
                fontSize: "clamp(10px, 2.8vw, 11px)",
                marginTop: 4,
              }}
            >
              Ник обновится сразу и появится в карточках магазина
            </Text>
          </Stack>
        </GlassCard>
      </Modal>
    </>
  );
}
