import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, HStack, Image, Stack, Text, VStack } from '@chakra-ui/react';
import { useApp } from '../store';

export default function BeatPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { beats, addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const beat = beats.find(b => b.id === id);

  if (!beat) {
    return <Text>Бит не найден.</Text>
  }

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <VStack align="stretch" spacing="16px">
      <Button variant="ghost" onClick={() => nav(-1)}>← Назад</Button>

      <HStack align="start" spacing="16px">
        <Image src={beat.coverUrl} boxSize="96px" borderRadius="14px" objectFit="cover" alt="" />
        <Box flex="1" minW="0">
          <Text fontSize="lg" fontWeight="semibold" noOfLines={2}>{beat.title}</Text>
          <Text fontSize="sm" color="rgba(255,255,255,.7)">Тональность: {beat.key} • {beat.bpm} BPM</Text>
          <HStack mt={3}>
            <Button size="sm" variant="outline" onClick={() => togglePlay(beat.id)}>
              {playingThis ? '⏸ Пауза' : '▶ Прослушать'}
            </Button>
          </HStack>
        </Box>
      </HStack>

      <Stack spacing="10px">
        {beat.prices.mp3 && (
          <LicenseRow name="MP3" price={beat.prices.mp3} onAdd={() => addToCart(beat.id, 'mp3')} />
        )}
        {beat.prices.wav && (
          <LicenseRow name="WAV" price={beat.prices.wav} onAdd={() => addToCart(beat.id, 'wav')} />
        )}
        {beat.prices.stems && (
          <LicenseRow name="STEMS" price={beat.prices.stems} onAdd={() => addToCart(beat.id, 'stems')} />
        )}
      </Stack>

      <Box fontSize="xs" color="rgba(255,255,255,.6)">
        * Полные файлы выдаются после оплаты. В демо может быть тэг/превью.
      </Box>
    </VStack>
  );
}

function LicenseRow({ name, price, onAdd }:{ name: string; price: number; onAdd: () => void }) {
  return (
    <HStack
      p="12px"
      border="1px solid rgba(255,255,255,.1)"
      borderRadius="12px"
      bg="rgba(255,255,255,.05)"
      justify="space-between"
    >
      <Text>{name} — ${price}</Text>
      <Button size="sm" color="var(--tg-button-text-color,#fff)" onClick={onAdd}>В корзину</Button>
    </HStack>
  );
}
