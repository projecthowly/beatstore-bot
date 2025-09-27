import { Group, Image, Text, Button } from "@mantine/core";
import { GlassCard, NeonButton } from "../ui/Glass";
import { useApp } from "../store";
import type { Beat, LicenseType } from "../types";
import { useNavigate } from "react-router-dom";

export default function CatalogView() {
  const { beats } = useApp();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {beats.map((b)=> <BeatRow key={b.id} beat={b}/>)}
    </div>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const { addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const nav = useNavigate();

  const prices = [beat.prices.mp3, beat.prices.wav, beat.prices.stems].filter((x): x is number => Boolean(x));
  const min = Math.min(...prices);
  const minLabel = Number.isFinite(min) ? `$${min}` : "—";

  const firstAvailable: LicenseType | undefined =
    (beat.prices.mp3 ? "mp3" : undefined) ??
    (beat.prices.wav ? "wav" : undefined) ??
    (beat.prices.stems ? "stems" : undefined);

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <GlassCard p="12px" onClick={()=> nav(`/beat/${beat.id}`)} style={{cursor:"pointer"}}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="12px" wrap="nowrap">
          <Image src={beat.coverUrl} w={48} h={48} radius="md" fit="cover" alt=""/>
          <div style={{minWidth:0}}>
            <Text size="sm" fw={600} c="var(--text)" lineClamp={1}>{beat.title}</Text>
            <Text size="xs" c="var(--muted)">Общественный • {beat.bpm} BPM</Text>
          </div>
        </Group>
        <Group gap="8px" wrap="nowrap" onClick={(e)=>e.stopPropagation()}>
          <Button size="xs" variant="outline" c="var(--text)"
            styles={{ root:{ borderColor:"var(--surface-border)", background:"rgba(255,255,255,0.04)" } }}
            onClick={()=> togglePlay(beat.id)}
          >
            {playingThis ? "⏸" : "▶"}
          </Button>
          {firstAvailable && (
            <NeonButton size="xs" onClick={()=> addToCart(beat.id, firstAvailable)}>
              {minLabel}
            </NeonButton>
          )}
        </Group>
      </Group>
    </GlassCard>
  );
}
