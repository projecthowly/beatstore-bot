import { useEffect, useRef } from "react";
import { Paper, Container, Group, Text, ActionIcon } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop } from "@tabler/icons-react";
import { useApp } from "../store";

export default function Player() {
  const { playingBeatId, isPlaying, beats, pause, togglePlay } = useApp();
  const audioRef = useRef<HTMLAudioElement>(null);

  const beat = beats.find((b) => b.id === playingBeatId);
  const previewUrl = beat?.files.mp3 || "";

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying && previewUrl) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying, previewUrl]);

  if (!beat) return null;

  return (
    <Paper
      withBorder
      p="md"
      style={{
        position: "fixed",
        bottom: "calc(var(--player-gap) + env(safe-area-inset-bottom, 0px))",
        left: 0,
        right: 0,
        borderTop: "1px solid var(--muted)",
        background: "var(--surface)",
        zIndex: 30,
      }}
    >
      <Container size="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" style={{ color: "var(--text)" }} lineClamp={1}>
            {beat.title}
          </Text>
          <Group gap="xs">
            <ActionIcon variant="subtle" size="lg" onClick={() => togglePlay(beat.id)} title={isPlaying ? "Пауза" : "Играть"} style={{ color: "var(--text)" }}>
              {isPlaying ? <IconPlayerPause /> : <IconPlayerPlay />}
            </ActionIcon>
            <ActionIcon variant="subtle" size="lg" onClick={pause} title="Стоп" style={{ color: "var(--muted)" }}>
              <IconPlayerStop />
            </ActionIcon>
          </Group>
        </Group>
      </Container>
      <audio ref={audioRef} src={previewUrl} preload="none" />
    </Paper>
  );
}
