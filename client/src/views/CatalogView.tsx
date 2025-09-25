import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';
import { useNavigate } from 'react-router-dom';

export default function CatalogView() {
  const { beats } = useApp();
  return (
    <div className="space-y-2">
      {beats.map(b => <BeatRow key={b.id} beat={b} />)}
    </div>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const { addToCart, togglePlay, playingBeatId, isPlaying } = useApp();
  const nav = useNavigate();

  const min = Math.min(...([beat.prices.mp3, beat.prices.wav, beat.prices.stems].filter(Boolean) as number[]));
  const minLabel = Number.isFinite(min) ? `$${min}` : '—';

  const firstAvailable: LicenseType | undefined =
    (beat.prices.mp3 ? 'mp3' : undefined) ??
    (beat.prices.wav ? 'wav' : undefined) ??
    (beat.prices.stems ? 'stems' : undefined);

  const playingThis = playingBeatId === beat.id && isPlaying;

  return (
    <div
      className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10 hover:border-white/20 transition cursor-pointer"
      onClick={() => nav(`/beat/${beat.id}`)}
    >
      <img src={beat.coverUrl} className="h-12 w-12 rounded-md object-cover" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{beat.title}</div>
        <div className="text-xs text-white/60">Общественный • {beat.bpm} BPM</div>
      </div>
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          className="px-2 py-1 rounded-md bg-white/10 text-xs"
          onClick={() => togglePlay(beat.id)}
          title={playingThis ? 'Пауза' : 'Играть демо'}
        >
          {playingThis ? '⏸' : '▶'}
        </button>
        {firstAvailable && (
          <button
            className="px-2 py-1 rounded-md bg-primary text-primaryText text-xs"
            onClick={() => addToCart(beat.id, firstAvailable)}
            title="Добавить минимальную лицензию"
          >
            {minLabel}
          </button>
        )}
      </div>
    </div>
  );
}
