import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';

export default function CatalogView() {
  const { beats } = useApp();
  return (
    <div className="p-2 pb-28 space-y-2">
      {beats.map(b => <BeatRow key={b.id} beat={b} />)}
    </div>
  );
}

function BeatRow({ beat }: { beat: Beat }) {
  const { addToCart, togglePlay, openDetail, playingBeatId, isPlaying } = useApp();
  const min = Math.min(...[beat.prices.mp3, beat.prices.wav, beat.prices.stems].filter(Boolean) as number[]);
  const minLabel = Number.isFinite(min) ? `$${min}` : 'N/A';

  const firstAvailable: LicenseType | undefined =
    (beat.prices.mp3 ? 'mp3' : undefined) ??
    (beat.prices.wav ? 'wav' : undefined) ??
    (beat.prices.stems ? 'stems' : undefined);

  const playingThis = playingBeatId === beat.id && isPlaying;

  const onRowClick = () => openDetail(beat.id);

  return (
    <div
      className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10 cursor-pointer"
      onClick={onRowClick}
    >
      <div className="h-12 w-12 rounded-md bg-white/10 overflow-hidden">
        <img src={beat.coverUrl} className="h-full w-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{beat.title}</div>
        <div className="text-xs text-white/60">Общественный • {beat.bpm} BPM</div>
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          className="px-2 py-1 rounded-md bg-white/10 text-xs"
          onClick={() => togglePlay(beat.id)}
        >
          {playingThis ? '⏸' : '▶'}
        </button>
        {firstAvailable && (
          <button
            className="px-2 py-1 rounded-md bg-primary text-primaryText text-xs"
            onClick={() => addToCart(beat.id, firstAvailable)}
          >
            {minLabel}
          </button>
        )}
      </div>
    </div>
  );
}
