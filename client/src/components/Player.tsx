// client/src/components/Player.tsx
import { useEffect, useRef } from "react";
import { Paper, Container, Group, Text, Button } from "@mantine/core";
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
        bottom: 56, // над нижними вкладками
        left: 0,
        right: 0,
        borderTop: "1px solid rgba(255,255,255,.1)",
        background: "rgba(0,0,0,.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Container size="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" lineClamp={1}>
            {beat.title}
          </Text>
          <Group gap="xs">
            <Button variant="subtle" onClick={() => togglePlay(beat.id)}>
              {isPlaying ? "Пауза" : "Играть"}
            </Button>
            <Button variant="subtle" c="dimmed" onClick={pause}>
              Стоп
            </Button>
          </Group>
        </Group>
      </Container>
      <audio ref={audioRef} src={previewUrl} preload="none" />
    </Paper>
  );
}
