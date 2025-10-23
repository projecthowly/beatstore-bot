import { Group, Image, Text, ActionIcon, Tooltip, Menu } from "@mantine/core";
import { IconPlus, IconPlayerPlay, IconPlayerPause, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { GlassCard } from "../ui/Glass";
import { useApp } from "../store";
import type { Beat } from "../types";
import { useState, useRef, useEffect } from "react";
import UploadModal from "../components/UploadModal";
import PlayerCard from "../components/PlayerCard";
import LicenseModal from "../components/LicenseModal";
import AddCartIcon from "../assets/icons/AddCart.png";

export default function CatalogView() {
  const { beats, isOwnStore, session, telegramId, loadBeats } = useApp();
  const [open, setOpen] = useState(false);

  // Загружаем биты текущего пользователя при монтировании компонента
  useEffect(() => {
    if (telegramId) {
      console.log(`📦 CatalogView: Загружаем биты пользователя ${telegramId}`);
      loadBeats(telegramId);
    }
  }, [telegramId, loadBeats]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {beats.length === 0 ? (
          <Text c="var(--muted)" ta="center" mt="lg">
            Пока нет загруженных битов
          </Text>
        ) : (
          beats.map((b) => <BeatRow key={b.id} beat={b} />)
        )}
      </div>

      {session.role === "producer" && isOwnStore() && (
        <Tooltip label="Добавить бит" withArrow>
          <ActionIcon
            size="xl"
            radius="xl"
            onClick={() => setOpen(true)}
            style={{
              position: "fixed",
              right: 16,
              bottom: `calc(var(--bottombar-h) + 16px)`,
              background: "linear-gradient(90deg,#6E6BFF,#2EA1FF)",
              color: "#fff",
              border: "none",
              boxShadow: "0 8px 24px rgba(110,107,255,0.35)",
              zIndex: 45,
            }}
          >
            <IconPlus />
          </ActionIcon>
        </Tooltip>
      )}

      <UploadModal opened={open} onClose={() => setOpen(false)} />
      {/* Внешний плавающий плеер */}
      <PlayerCard />
    </div>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const { togglePlay, playingBeatId, isPlaying, deleteBeat, session, isOwnStore } = useApp();
  const [modalOpened, setModalOpened] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Проверяем есть ли хоть одна лицензия с ценой
  const hasLicenses = Object.values(beat.prices).some(
    licenseData => licenseData && typeof licenseData === "object" && licenseData.price > 0
  );

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <GlassCard
      p="12px"
      style={{ cursor: "default" }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="10px" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={beat.coverUrl}
              w={44}
              h={44}
              radius="md"
              fit="cover"
              alt={beat.title}
            />
            <button
              type="button"
              onClick={() => togglePlay(beat.id)}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15))",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15))";
              }}
            >
              {playingThis ? (
                <IconPlayerPause size={20} />
              ) : (
                <IconPlayerPlay size={20} />
              )}
            </button>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text size="sm" fw={600} c="var(--text)" lineClamp={1}>
              {beat.title}
            </Text>
            <Text size="xs" c="var(--muted)" style={{ marginTop: 2 }} lineClamp={1}>
              Howly · {beat.key} · {beat.bpm} BPM
            </Text>
          </div>
        </Group>

        <Group
          gap="6px"
          wrap="nowrap"
          onClick={(e) => e.stopPropagation()}
          style={{ flexShrink: 0 }}
        >
          {hasLicenses && (
            <>
              <ActionIcon
                ref={buttonRef}
                size="lg"
                variant="filled"
                style={{
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setModalOpened(true)}
              >
                <img
                  src={AddCartIcon}
                  alt="Add to cart"
                  style={{ width: 28, height: 28 }}
                />
              </ActionIcon>
              <LicenseModal
                beat={beat}
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                targetRef={buttonRef}
              />
            </>
          )}

          {/* Меню редактирования/удаления для своих битов */}
          {session.role === "producer" && isOwnStore() && (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon
                  size="lg"
                  variant="subtle"
                  c="var(--text)"
                  style={{ opacity: 0.7 }}
                >
                  <IconDots size={20} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    // TODO: Открыть модалку редактирования
                    console.log("Edit beat:", beat.id);
                  }}
                >
                  Редактировать
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={async () => {
                    if (confirm(`Удалить бит "${beat.title}"?`)) {
                      await deleteBeat(beat.id);
                    }
                  }}
                >
                  Удалить
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>
    </GlassCard>
  );
}
