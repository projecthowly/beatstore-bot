import { useEffect, useRef } from 'react';
import { Box, Container, HStack, Text, Button } from '@chakra-ui/react';
import { useApp } from '../store';

export default function Player() {
  const { playingBeatId, isPlaying, beats, pause, togglePlay } = useApp();
  const audioRef = useRef<HTMLAudioElement>(null);
  const beat = beats.find(b => b.id === playingBeatId);
  const previewUrl = beat?.files.mp3 || '';

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying && previewUrl) a.play().catch(() => {});
    else a.pause();
  }, [isPlaying, previewUrl]);

  if (!beat) return null;

  return (
    <Box position="fixed" bottom="56px" left="0" right="0" borderTop="1px solid rgba(255,255,255,.1)" bg="rgba(0,0,0,.35)" backdropFilter="blur(8px)">
      <Container maxW="container.sm">
        <HStack justify="space-between" py={3}>
          <Text fontSize="sm" noOfLines={1}>{beat.title}</Text>
          <HStack>
            <Button variant="link" color="white" onClick={() => togglePlay(beat.id)}>
              {isPlaying ? 'Пауза' : 'Играть'}
            </Button>
            <Button variant="link" color="rgba(255,255,255,.7)" onClick={pause}>Стоп</Button>
          </HStack>
        </HStack>
      </Container>
      <audio ref={audioRef} src={previewUrl} preload="none" />
    </Box>
  );
}
