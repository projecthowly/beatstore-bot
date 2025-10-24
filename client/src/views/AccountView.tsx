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
  const { me, seller, updateNickname, isOwnStore, goToOwnStore, session, deeplink, getFullDeeplinkUrl, updateDeeplink, updateProfile, uploadAvatar, deleteAvatar } = useApp();
  const navigate = useNavigate();

  const [opened, setOpened] = useState(false);
  const [name, setName] = useState(() => me.storeName || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deeplinkOpened, setDeeplinkOpened] = useState(false);
  const [deeplinkName, setDeeplinkName] = useState("");
  const [deeplinkError, setDeeplinkError] = useState<string | null>(null);
  const [deeplinkSaving, setDeeplinkSaving] = useState(false);

  const [profileOpened, setProfileOpened] = useState(false);
  const [bio, setBio] = useState("");
  const [contactUsername, setContactUsername] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Состояния для загрузки/удаления аватара на главной странице
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);

  const isArtist = session.role === "artist";
  const isProducer = session.role === "producer";

  useEffect(() => {
    if (!opened) return;
    setName(me.storeName || "");
    setError(null);
  }, [opened, me.storeName]);

  useEffect(() => {
    if (!deeplinkOpened) return;
    setDeeplinkName(deeplink || "");
    setDeeplinkError(null);
  }, [deeplinkOpened, deeplink]);

  useEffect(() => {
    if (!profileOpened) return;
    setBio(me.bio || "");
    setContactUsername(me.contactUsername || "");
    setInstagramUrl(me.instagramUrl || "");
    setYoutubeUrl(me.youtubeUrl || "");
    setSoundcloudUrl(me.soundcloudUrl || "");
    setSpotifyUrl(me.spotifyUrl || "");
  }, [profileOpened, me]);

  const validate = useCallback((value: string) => {
    const val = value.trim();
    if (!val) return "Введите ник";
    if (val.length > 15) return "Слишком длинный ник (макс. 15 символов)";
    return null;
  }, []);

  const validateDeeplink = useCallback((value: string) => {
    const val = value.trim().toLowerCase();
    if (!val) return "Введите название диплинка";
    if (val.length < 3) return "Минимум 3 символа";
    if (val.length > 15) return "Максимум 15 символов";
    if (!/^[a-z0-9_]+$/.test(val)) return "Только латиница, цифры и _";
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

  const onSaveDeeplink = async () => {
    const validationError = validateDeeplink(deeplinkName);
    if (validationError) {
      setDeeplinkError(validationError);
      return;
    }

    setDeeplinkSaving(true);
    try {
      const result = await updateDeeplink(deeplinkName.trim().toLowerCase());
      if (result.ok) {
        setDeeplinkOpened(false);
      } else {
        setDeeplinkError(result.error || "Ошибка при сохранении");
      }
    } catch (error) {
      console.error("Ошибка при сохранении диплинка:", error);
      setDeeplinkError("Ошибка при сохранении. Попробуйте снова.");
    } finally {
      setDeeplinkSaving(false);
    }
  };

  const copyDeeplinkToClipboard = () => {
    const url = getFullDeeplinkUrl();
    navigator.clipboard.writeText(url);
    alert("✅ Ссылка скопирована!");
  };

  const onSaveProfile = async () => {
    setProfileSaving(true);
    try {
      // Обновляем поля профиля (аватар загружается отдельно)
      await updateProfile({
        bio: bio.trim() || undefined,
        contactUsername: contactUsername.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        soundcloudUrl: soundcloudUrl.trim() || undefined,
        spotifyUrl: spotifyUrl.trim() || undefined,
      });

      setProfileOpened(false);
      alert("✅ Профиль обновлён!");
    } catch (error) {
      console.error("Ошибка при сохранении профиля:", error);
      alert("❌ Ошибка при сохранении профиля");
    } finally {
      setProfileSaving(false);
    }
  };

  // Обработчик загрузки/замены аватара
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 5MB");
      return;
    }

    // Проверка типа
    if (!file.type.startsWith("image/")) {
      alert("Можно загружать только изображения");
      return;
    }

    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      alert("✅ Аватар загружен!");
    } catch (error) {
      console.error("Ошибка при загрузке аватара:", error);
      alert("❌ Ошибка при загрузке аватара");
    } finally {
      setAvatarUploading(false);
    }
  };

  // Обработчик удаления аватара
  const handleAvatarDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить аватар?")) return;

    setAvatarDeleting(true);
    try {
      await deleteAvatar();
      alert("✅ Аватар удалён!");
    } catch (error) {
      console.error("Ошибка при удалении аватара:", error);
      alert("❌ Ошибка при удалении аватара");
    } finally {
      setAvatarDeleting(false);
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

        {/* Секция аватара */}
        <Paper
          withBorder
          p="16px"
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
          <Stack gap="12px" align="center">
            {/* Аватар */}
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {me.avatarUrl ? (
                <img
                  src={me.avatarUrl}
                  alt="Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <IconUser size={50} color="var(--muted)" />
              )}
            </div>

            {/* Кнопки управления аватаром */}
            {!me.avatarUrl ? (
              // Если аватара нет - кнопка "Загрузить"
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                  id="avatar-upload-main"
                  disabled={avatarUploading}
                />
                <label
                  htmlFor="avatar-upload-main"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: avatarUploading
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(110,107,255,0.2)",
                    border: "1px solid rgba(110,107,255,0.35)",
                    color: "var(--text)",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: avatarUploading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: avatarUploading ? 0.6 : 1,
                  }}
                >
                  {avatarUploading ? "Загрузка..." : "Загрузить аватар"}
                </label>
              </>
            ) : (
              // Если аватар есть - кнопки "Заменить" и "Удалить"
              <Group gap="8px">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                  id="avatar-replace-main"
                  disabled={avatarUploading || avatarDeleting}
                />
                <label
                  htmlFor="avatar-replace-main"
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background:
                      avatarUploading || avatarDeleting
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor:
                      avatarUploading || avatarDeleting ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: avatarUploading || avatarDeleting ? 0.6 : 1,
                  }}
                >
                  {avatarUploading ? "Загрузка..." : "Заменить"}
                </label>
                <button
                  onClick={handleAvatarDelete}
                  disabled={avatarUploading || avatarDeleting}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background:
                      avatarUploading || avatarDeleting
                        ? "rgba(255,0,0,0.1)"
                        : "rgba(255,0,0,0.15)",
                    border: "1px solid rgba(255,0,0,0.3)",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor:
                      avatarUploading || avatarDeleting ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: avatarUploading || avatarDeleting ? 0.6 : 1,
                  }}
                >
                  {avatarDeleting ? "Удаление..." : "Удалить"}
                </button>
              </Group>
            )}
          </Stack>
        </Paper>

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
              onClick={() => setProfileOpened(true)}
            >
              Редактировать профиль ✏️
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

        {/* Диплинк для продюсера */}
        {isProducer && (
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
                Ваша ссылка на битстор 🔗
              </Text>
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" style={{ color: "var(--muted)" }}>
                  Диплинк
                </Text>
                <Text size="sm" style={{ color: "var(--text)" }} lineClamp={1}>
                  {deeplink || "Не создан"}
                </Text>
              </Group>

              {deeplink && (
                <Text
                  size="xs"
                  style={{
                    color: "var(--muted)",
                    wordBreak: "break-all",
                    background: "rgba(255,255,255,0.04)",
                    padding: "8px",
                    borderRadius: "8px",
                    fontFamily: "monospace"
                  }}
                >
                  {getFullDeeplinkUrl()}
                </Text>
              )}
            </Stack>

            <Divider my="sm" style={{ borderColor: "var(--surface-border)" }} />

            <Group justify="flex-start" gap="8px">
              {deeplink && (
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
                  onClick={copyDeeplinkToClipboard}
                >
                  Копировать ссылку 📋
                </Button>
              )}
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
                onClick={() => setDeeplinkOpened(true)}
              >
                {deeplink ? "Изменить диплинк ✏️" : "Создать диплинк ➕"}
              </Button>
            </Group>
          </Paper>
        )}

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

      {/* Модальное окно для редактирования диплинка */}
      <Modal
        opened={deeplinkOpened}
        onClose={() => setDeeplinkOpened(false)}
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
              <Text
                fw={700}
                ta="center"
                style={{
                  color: "var(--text)",
                  fontSize: "clamp(15px, 4vw, 17px)",
                }}
              >
                {deeplink ? "Изменить диплинк" : "Создать диплинк"}
              </Text>
              <Text
                size="xs"
                ta="center"
                style={{
                  color: "var(--muted)",
                  fontSize: "clamp(11px, 3vw, 12px)",
                }}
              >
                Только латиница, цифры и _ (3-15 символов)
              </Text>
            </Stack>

            <TextInput
              placeholder="myshop"
              value={deeplinkName}
              maxLength={15}
              onChange={(event) => {
                setDeeplinkName(event.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                if (deeplinkError) setDeeplinkError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSaveDeeplink();
              }}
              error={deeplinkError || undefined}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  height: 44,
                  fontSize: "clamp(13px, 3.5vw, 14px)",
                  transition: "all 0.2s ease",
                  fontFamily: "monospace",
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
                onClick={() => setDeeplinkOpened(false)}
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
                onClick={onSaveDeeplink}
                loading={deeplinkSaving}
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
              Это будет вашей персональной ссылкой на магазин
            </Text>
          </Stack>
        </GlassCard>
      </Modal>

      {/* Модальное окно для редактирования профиля */}
      <Modal
        opened={profileOpened}
        onClose={() => setProfileOpened(false)}
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
            width: "min(420px, 92vw)",
            padding: 0,
            maxHeight: "90vh",
          },
          body: { padding: 0 },
        }}
      >
        <GlassCard
          style={{
            position: "relative",
            padding: "clamp(20px, 5vw, 24px)",
            color: "var(--text)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <Stack gap="md">
            <Text
              fw={700}
              ta="center"
              style={{
                color: "var(--text)",
                fontSize: "clamp(15px, 4vw, 17px)",
              }}
            >
              Редактировать профиль
            </Text>

            {/* Bio */}
            <Stack gap="xs">
              <Text size="sm" fw={600} style={{ color: "var(--text)" }}>
                Описание (Bio)
              </Text>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе..."
                maxLength={500}
                style={{
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 80,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <Text size="xs" style={{ color: "var(--muted)" }}>
                {bio.length}/500
              </Text>
            </Stack>

            {/* Контакт для связи */}
            <Stack gap="xs">
              <Text size="sm" fw={600} style={{ color: "var(--text)" }}>
                Telegram для связи
              </Text>
              <TextInput
                placeholder="@username"
                value={contactUsername}
                onChange={(e) => setContactUsername(e.target.value)}
                styles={{
                  input: {
                    color: "var(--text)",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                  },
                }}
              />
            </Stack>

            {/* Социальные сети */}
            <Text size="sm" fw={600} style={{ color: "var(--text)" }}>
              Социальные сети
            </Text>

            <TextInput
              placeholder="Instagram URL"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                },
              }}
            />

            <TextInput
              placeholder="YouTube URL"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                },
              }}
            />

            <TextInput
              placeholder="SoundCloud URL"
              value={soundcloudUrl}
              onChange={(e) => setSoundcloudUrl(e.target.value)}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                },
              }}
            />

            <TextInput
              placeholder="Spotify URL"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              styles={{
                input: {
                  color: "var(--text)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                },
              }}
            />

            <Group justify="space-between" gap="10px" mt="md">
              <button
                onClick={() => setProfileOpened(false)}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Отмена
              </button>
              <NeonButton
                onClick={onSaveProfile}
                loading={profileSaving}
                style={{
                  flex: 1,
                  height: 42,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Сохранить
              </NeonButton>
            </Group>
          </Stack>
        </GlassCard>
      </Modal>
    </>
  );
}
