// client/src/views/CatalogView.tsx
import { Card, Group, Image, Text, Button } from '@mantine/core';
import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';
import { useNavigate } from 'react-router-dom';

export default function CatalogView() {
  const { beats } = useApp();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {beats.map(b => <BeatRow key={b.id} beat={b} />)}
    </div>
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
    <Card
      padding="sm"
      radius="md"
      withBorder
      style={{
        background: 'rgba(255,255,255,.05)',
        cursor: 'pointer',
      }}
      onClick={() => nav(`/beat/${beat.id}`)}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="12px" wrap="nowrap">
          <Image src={beat.coverUrl} w={48} h={48} radius="sm" fit="cover" alt="" />
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} lineClamp={1}>{beat.title}</Text>
            <Text size="xs" c="dimmed">Общественный • {beat.bpm} BPM</Text>
          </div>
        </Group>
        <Group gap="8px" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="outline" onClick={() => togglePlay(beat.id)}>
            {playingThis ? '⏸' : '▶'}
          </Button>
          {firstAvailable && (
            <Button size="xs" color="blue" onClick={() => addToCart(beat.id, firstAvailable)}>
              {minLabel}
            </Button>
          )}
        </Group>
      </Group>
    </Card>
  );
}
