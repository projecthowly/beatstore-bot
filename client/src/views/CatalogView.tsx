import { Group, Image, Text, ActionIcon, Tooltip } from "@mantine/core";
import { IconPlus, IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";
import { GlassCard, NeonButton } from "../ui/Glass";
import { useApp } from "../store";
import type { Beat, LicenseType } from "../types";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import UploadModal from "../components/UploadModal";
import PlayerCard from "../components/PlayerCard";
import LicenseModal from "../components/LicenseModal";

export default function CatalogView() {
  const { beats, isOwnStore, session } = useApp();
  const [open, setOpen] = useState(false);

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
  const { togglePlay, playingBeatId, isPlaying } = useApp();
  const nav = useNavigate();
  const [modalOpened, setModalOpened] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const prices = [beat.prices.mp3, beat.prices.wav, beat.prices.stems].filter(
    (x): x is number => typeof x === "number" && x > 0,
  );
  const min = prices.length ? Math.min(...prices) : NaN;
  const minLabel = Number.isFinite(min) ? `$${min}` : "—";

  const firstAvailable: LicenseType | undefined = beat.prices.mp3
    ? "mp3"
    : beat.prices.wav
      ? "wav"
      : beat.prices.stems
        ? "stems"
        : undefined;

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <GlassCard
      p="12px"
      onClick={() => nav(`/beat/${beat.id}`)}
      style={{ cursor: "pointer" }}
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
          {firstAvailable && (
            <>
              <NeonButton
                ref={buttonRef}
                size="xs"
                onClick={() => setModalOpened(true)}
                style={{
                  fontSize: "11px",
                  padding: "0",
                  width: "50px",
                  height: "28px",
                  minWidth: "50px",
                  maxWidth: "50px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {minLabel}
              </NeonButton>
              <LicenseModal
                beat={beat}
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                targetRef={buttonRef}
              />
            </>
          )}
        </Group>
      </Group>
    </GlassCard>
  );
}
