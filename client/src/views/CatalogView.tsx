import { Box, HStack, Image, Text, Button, VStack } from '@chakra-ui/react';
import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';
import { useNavigate } from 'react-router-dom';

export default function CatalogView() {
  const { beats } = useApp();
  return (
    <VStack spacing="10px" align="stretch">
      {beats.map(b => <BeatRow key={b.id} beat={b} />)}
    </VStack>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const { addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const nav = useNavigate();

  const prices = [beat.prices.mp3, beat.prices.wav, beat.prices.stems].filter((x): x is number => Boolean(x));
  const min = Math.min(...prices);
  const minLabel = Number.isFinite(min) ? `$${min}` : '—';

  const firstAvailable: LicenseType | undefined =
    (beat.prices.mp3 ? 'mp3' : undefined) ??
    (beat.prices.wav ? 'wav' : undefined) ??
    (beat.prices.stems ? 'stems' : undefined);

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <HStack
      spacing="12px"
      p="12px"
      border="1px solid rgba(255,255,255,.1)"
      borderRadius="14px"
      bg="rgba(255,255,255,.05)"
      _hover={{ borderColor: 'rgba(255,255,255,.2)' }}
      cursor="pointer"
      onClick={() => nav(`/beat/${beat.id}`)}
    >
      <Image src={beat.coverUrl} boxSize="48px" borderRadius="10px" objectFit="cover" alt="" />
      <Box flex="1" minW="0">
        <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>{beat.title}</Text>
        <Text fontSize="xs" color="rgba(255,255,255,.6)">Общественный • {beat.bpm} BPM</Text>
      </Box>
      <HStack spacing="8px" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" onClick={() => togglePlay(beat.id)}>
          {playingThis ? '⏸' : '▶'}
        </Button>
        {firstAvailable && (
          <Button size="sm" color="var(--tg-button-text-color,#fff)" onClick={() => addToCart(beat.id, firstAvailable)}>
            {minLabel}
          </Button>
        )}
      </HStack>
    </HStack>
  );
}
