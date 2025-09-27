import { useParams, useNavigate } from "react-router-dom";
import { Card, Group, Image, Text, Button, Stack } from "@mantine/core";
import { useApp } from "../store";

export default function BeatPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { beats, addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const beat = beats.find((b) => b.id === id);

  if (!beat) {
    return <Text style={{ color: "var(--text)" }}>Бит не найден.</Text>;
  }

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <Stack gap="md">
      <Button variant="subtle" onClick={() => nav(-1)} c="var(--muted)">
        ← Назад
      </Button>

      <Card
        withBorder
        p="md"
        radius="md"
        style={{ background: "var(--surface)", borderColor: "var(--muted)" }}
      >
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Image src={beat.coverUrl} w={96} h={96} radius="md" fit="cover" alt="" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text size="lg" fw={600} style={{ color: "var(--text)" }} lineClamp={2}>
              {beat.title}
            </Text>
            <Text size="sm" style={{ color: "var(--muted)" }}>
              Тональность: {beat.key} • {beat.bpm} BPM
            </Text>

            <Group gap="sm" mt="sm">
              <Button
                variant="outline"
                c="var(--text)"
                style={{ borderColor: "var(--muted)" }}
                onClick={() => togglePlay(beat.id)}
              >
                {playingThis ? "⏸ Пауза" : "▶ Прослушать"}
              </Button>
            </Group>
          </div>
        </Group>
      </Card>

      <Stack gap="10px">
        {beat.prices.mp3 && (
          <LicenseRow
            name="MP3"
            price={beat.prices.mp3}
            onAdd={() => addToCart(beat.id, "mp3")}
          />
        )}
        {beat.prices.wav && (
          <LicenseRow
            name="WAV"
            price={beat.prices.wav}
            onAdd={() => addToCart(beat.id, "wav")}
          />
        )}
        {beat.prices.stems && (
          <LicenseRow
            name="STEMS"
            price={beat.prices.stems}
            onAdd={() => addToCart(beat.id, "stems")}
          />
        )}
      </Stack>

      <Text size="xs" style={{ color: "var(--muted)" }}>
        * Полные файлы выдаются после оплаты. В демо может быть тэг/превью.
      </Text>
    </Stack>
  );
}

function LicenseRow({
  name,
  price,
  onAdd,
}: {
  name: string;
  price: number;
  onAdd: () => void;
}) {
  return (
    <Card
      withBorder
      p="12px"
      radius="md"
      style={{ background: "var(--surface)", borderColor: "var(--muted)" }}
    >
      <Group justify="space-between">
        <Text style={{ color: "var(--text)" }}>
          {name} — ${price}
        </Text>
        <Button color="brand" c="var(--text)" onClick={onAdd}>
          В корзину
        </Button>
      </Group>
    </Card>
  );
}
