import { Stack, TextInput, SimpleGrid, Text, Group, ActionIcon } from "@mantine/core";
import { useState, useMemo } from "react";
import { useApp } from "../store";
import { GlassCard } from "../ui/Glass";
import type { Beat } from "../types";

export function GlobalMarketView() {
  const beats = useApp((s) => s.beats);
  const playingBeatId = useApp((s) => s.playingBeatId);
  const isPlaying = useApp((s) => s.isPlaying);
  const togglePlay = useApp((s) => s.togglePlay);
  const addToCart = useApp((s) => s.addToCart);

  const [searchQuery, setSearchQuery] = useState("");

  // Фильтрация битов по поиску
  const filteredBeats = useMemo(() => {
    if (!searchQuery.trim()) return beats;
    const query = searchQuery.toLowerCase();
    return beats.filter(
      (beat) =>
        beat.title.toLowerCase().includes(query) ||
        beat.author?.name.toLowerCase().includes(query) ||
        beat.key.toLowerCase().includes(query)
    );
  }, [beats, searchQuery]);

  return (
    <Stack gap={16} p={16} pb={100}>
      {/* Заголовок */}
      <Text
        size="28px"
        fw={700}
        style={{
          background: "linear-gradient(90deg, #6E6BFF, #2EA1FF)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Глобальный битстор 🌍
      </Text>

      {/* Поиск */}
      <TextInput
        placeholder="Поиск по названию, продюсеру или тональности..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="md"
        styles={{
          input: {
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text)",
            borderRadius: 12,
            "&:focus": {
              borderColor: "rgba(110,107,255,0.5)",
              boxShadow: "0 0 0 2px rgba(110,107,255,0.15)",
            },
            "&::placeholder": {
              color: "#9AA0B3 !important",
              opacity: 0.6,
            },
          },
        }}
      />

      {/* Список битов */}
      {filteredBeats.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: "center", marginTop: 24 }}>
          <Text c="var(--muted)" size="lg">
            {searchQuery ? "Биты не найдены 😢" : "Пока нет битов 🎵"}
          </Text>
        </GlassCard>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={16}>
          {filteredBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              isPlaying={playingBeatId === beat.id && isPlaying}
              onTogglePlay={() => togglePlay(beat.id)}
              onAddToCart={(license) => addToCart(beat.id, license)}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

type BeatCardProps = {
  beat: Beat;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAddToCart: (license: "mp3" | "wav" | "stems") => void;
};

function BeatCard({ beat, isPlaying, onTogglePlay, onAddToCart }: BeatCardProps) {
  return (
    <GlassCard
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(110, 107, 255, 0.3)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Обложка */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "100%",
          background: beat.coverUrl
            ? `url(${beat.coverUrl}) center/cover`
            : "linear-gradient(135deg, rgba(110,107,255,0.2), rgba(46,161,255,0.2))",
          overflow: "hidden",
        }}
      >
        {/* Кнопка воспроизведения */}
        <ActionIcon
          size={56}
          radius="xl"
          variant="filled"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: isPlaying ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)",
            color: "#6E6BFF",
            fontSize: 24,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
          onClick={onTogglePlay}
        >
          {isPlaying ? "⏸" : "▶"}
        </ActionIcon>
      </div>

      {/* Информация */}
      <Stack gap={8} p={12}>
        <Text
          size="16px"
          fw={600}
          c="var(--text)"
          lineClamp={1}
          title={beat.title}
        >
          {beat.title}
        </Text>

        <Group gap={8}>
          {beat.author && (
            <Text size="13px" c="var(--muted)">
              by {beat.author.name}
            </Text>
          )}
        </Group>

        <Group gap={12} mt={4}>
          <Text
            size="12px"
            c="var(--muted)"
            style={{
              padding: "4px 8px",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 6,
            }}
          >
            {beat.key}
          </Text>
          <Text
            size="12px"
            c="var(--muted)"
            style={{
              padding: "4px 8px",
              backgroundColor: "rgba(255,255,255,0.05)",
              borderRadius: 6,
            }}
          >
            {beat.bpm} BPM
          </Text>
        </Group>

        {/* Цены */}
        <Group gap={8} mt={8}>
          {beat.prices.mp3 && (
            <ActionIcon
              size="sm"
              variant="filled"
              style={{
                backgroundColor: "rgba(110,107,255,0.2)",
                color: "#6E6BFF",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart("mp3");
              }}
            >
              🛒
            </ActionIcon>
          )}
          <Text size="14px" c="#6E6BFF" fw={600}>
            {beat.prices.mp3 ? `${beat.prices.mp3}₽` : "Бесплатно"}
          </Text>
        </Group>
      </Stack>
    </GlassCard>
  );
}
