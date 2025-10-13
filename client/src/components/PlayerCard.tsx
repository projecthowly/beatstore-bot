import { useMemo, useRef, useState, useEffect } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Group, Image, Text, Slider } from "@mantine/core";
import {
  IconChevronDown,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconX,
} from "@tabler/icons-react";
import { GlassCard } from "../ui/Glass";
import { useApp } from "../store";

export default function PlayerCard() {
  const {
    beats,
    playingBeatId,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seekTo,
    playPrev,
    playNext,
    playerCollapsed,
    setPlayerCollapsed,
    togglePlayerCollapsed,
    stopPlaying,
  } = useApp();

  const beat = useMemo(
    () => beats.find((b) => b.id === playingBeatId) || null,
    [beats, playingBeatId],
  );

  const swipeStartRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const hasBeenShownRef = useRef(false);

  // Отслеживаем появление плеера для анимации только при первом показе
  useEffect(() => {
    if (playingBeatId && !hasBeenShownRef.current) {
      // Первый запуск плеера - показываем анимацию
      setIsInitialMount(true);
      hasBeenShownRef.current = true;
      const timer = setTimeout(() => setIsInitialMount(false), 50);
      return () => clearTimeout(timer);
    }
  }, [playingBeatId]);

  // Сбрасываем флаг при полном закрытии плеера
  useEffect(() => {
    if (!playingBeatId) {
      hasBeenShownRef.current = false;
    }
  }, [playingBeatId]);

  if (!beat) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    swipeHandledRef.current = false;
    swipeStartRef.current = event.clientY;

    const handleMove = (e: PointerEvent) => {
      if (swipeStartRef.current === null) return;
      const delta = e.clientY - swipeStartRef.current;
      if (!swipeHandledRef.current && Math.abs(delta) > 60) {
        swipeHandledRef.current = true;
        setPlayerCollapsed(delta > 0);
      }
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      swipeStartRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handleToggleClick = () => {
    if (swipeHandledRef.current) {
      swipeHandledRef.current = false;
      return;
    }
    togglePlayerCollapsed();
  };

  // Определяем трансформацию: скрыто под панелью, показано, или начальная позиция для анимации
  const containerTransform = playerCollapsed
    ? "translateY(calc(100% + 8px))"
    : isInitialMount
      ? "translateY(calc(100% + var(--bottombar-h, 56px) + 16px))"
      : "translateY(0)";

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(var(--bottombar-h, 56px) + 8px)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "min(720px, 95vw)",
          pointerEvents: playerCollapsed ? "none" : "auto",
          transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: containerTransform,
        }}
      >
        <GlassCard
          style={{
            padding: 0,
            borderRadius: 20,
            overflow: "visible",
            position: "relative",
          }}
        >
          {/* Кнопка закрытия */}
          {!playerCollapsed && (
            <button
              type="button"
              onClick={stopPlaying}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                zIndex: 20,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,68,68,0.15)";
                e.currentTarget.style.color = "#FF4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              <IconX size={18} />
            </button>
          )}

          {!playerCollapsed && (
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onClick={handleToggleClick}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "12px 18px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 5,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.2)",
                }}
              />
              <IconChevronDown size={20} opacity={0.6} />
            </button>
          )}

          <div
            style={{
              padding: playerCollapsed ? "0 16px 6px" : "0 16px 14px",
              opacity: playerCollapsed ? 0 : 1,
              maxHeight: playerCollapsed ? 0 : 420,
              overflow: "hidden",
              transition:
                "opacity 180ms ease, max-height 220ms ease, padding 220ms ease",
              pointerEvents: playerCollapsed ? "none" : "auto",
              position: "relative",
            }}
          >

            <Group gap="12px" wrap="nowrap" align="center">
              <Image
                src={beat.coverUrl}
                w={52}
                h={52}
                radius="md"
                fit="cover"
                alt={beat.title}
                style={{ flexShrink: 0 }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={700} c="var(--text)" lineClamp={1}>
                  {beat.title}
                </Text>
                <Text size="xs" c="var(--muted)" lineClamp={1} mt={2}>
                  Howly · {beat.key} · {beat.bpm} BPM
                </Text>

                <div style={{ marginTop: 10 }}>
                  <Slider
                    value={Math.min(currentTime, duration || 0)}
                    min={0}
                    max={duration || 0}
                    step={1}
                    onChange={(v) => seekTo(v as number)}
                    styles={{
                      track: {
                        background: "rgba(255,255,255,0.1)",
                        height: 4,
                      },
                      bar: {
                        background: "linear-gradient(90deg,#6E6BFF,#2EA1FF)",
                        height: 4,
                      },
                      thumb: {
                        border: "none",
                        background: "#fff",
                        width: 12,
                        height: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      },
                    }}
                  />

                  <Group justify="space-between" gap="xs" mt={4}>
                    <Text size="xs" c="var(--muted)" fw={500}>
                      {fmt(currentTime)}
                    </Text>
                    <Text size="xs" c="var(--muted)" fw={500}>
                      {fmt(duration || 0)}
                    </Text>
                  </Group>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <Control onClick={playPrev} size="small">
                  <IconPlayerSkipBack size={16} />
                </Control>
                <Control
                  onClick={() => playingBeatId && togglePlay(playingBeatId)}
                  isPrimary
                >
                  {isPlaying ? (
                    <IconPlayerPause size={20} />
                  ) : (
                    <IconPlayerPlay size={20} />
                  )}
                </Control>
                <Control onClick={playNext} size="small">
                  <IconPlayerSkipForward size={16} />
                </Control>
              </div>
            </Group>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Control({
  onClick,
  children,
  isPrimary = false,
  size = "normal",
}: {
  onClick: () => void;
  children: React.ReactNode;
  isPrimary?: boolean;
  size?: "small" | "normal";
}) {
  const buttonSize = isPrimary ? 44 : size === "small" ? 36 : 40;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: isPrimary ? 14 : 12,
        border: "none",
        background: isPrimary
          ? "linear-gradient(90deg, #6E6BFF, #2EA1FF)"
          : "rgba(255,255,255,0.08)",
        color: "#fff",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        cursor: "pointer",
        boxShadow: isPrimary
          ? "0 4px 16px rgba(110,107,255,0.35)"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (isPrimary) {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(110,107,255,0.5)";
        } else {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (isPrimary) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(110,107,255,0.35)";
        } else {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        }
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = isPrimary ? "scale(0.98)" : "scale(0.94)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = isPrimary ? "scale(1.05)" : "scale(1)";
      }}
    >
      {children}
    </button>
  );
}
