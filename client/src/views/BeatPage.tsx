// client/src/views/BeatPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Group, Image, Stack, Text, Box } from "@mantine/core";
import { useApp } from "../store";

export default function BeatPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { beats, addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const beat = beats.find((b) => b.id === id);

  if (!beat) {
    return <Text>Бит не найден.</Text>;
  }

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <Stack gap="md">
      <Button variant="subtle" onClick={() => nav(-1)}>
        ← Назад
      </Button>

      <Group align="flex-start" gap="md" wrap="nowrap">
        <Image
          src={beat.coverUrl}
          width={96}
          height={96}
          radius="md"
          fit="cover"
          alt=""
        />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="lg" fw={600} lineClamp={2}>
            {beat.title}
          </Text>
          <Text size="sm" c="dimmed">
            Тональность: {beat.key} • {beat.bpm} BPM
          </Text>
          <Group mt="sm">
            <Button
              size="xs"
              variant="outline"
              onClick={() => togglePlay(beat.id)}
            >
              {playingThis ? "⏸ Пауза" : "▶ Прослушать"}
            </Button>
          </Group>
        </Box>
      </Group>

      <Stack gap="sm">
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

      <Text size="xs" c="dimmed">
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
      shadow="xs"
      padding="sm"
      radius="md"
      withBorder
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text>
        {name} — ${price}
      </Text>
      <Button size="xs" onClick={onAdd}>
        В корзину
      </Button>
    </Card>
  );
}
