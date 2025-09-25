import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';

export default function BeatPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const {
    beats, addToCart, play, pause, playingBeatId, isPlaying
  } = useApp();

  const beat: Beat | undefined = useMemo(
    () => beats.find(b => b.id === id),
    [beats, id]
  );

  const licenses: LicenseType[] = useMemo(() => {
    if (!beat) return [];
    const res: LicenseType[] = [];
    if (beat.prices.mp3) res.push('mp3');
    if (beat.prices.wav) res.push('wav');
    if (beat.prices.stems) res.push('stems');
    return res;
  }, [beat]);

  const [license, setLicense] = useState<LicenseType | undefined>(() => licenses[0]);

  if (!beat) {
    return (
      <div className="p-2">
        <button className="text-sm underline" onClick={() => nav(-1)}>← Назад</button>
        <div className="mt-4 text-white/70">Бит не найден</div>
      </div>
    );
  }

  const playingThis = playingBeatId === beat.id && isPlaying;
  const canDemo = Boolean(beat.files.mp3);

  const onAdd = () => {
    if (!license) return;
    addToCart(beat.id, license);
    alert('Добавлено в корзину');
  };

  const onPlayPause = () => {
    if (!canDemo) return;
    if (playingThis) pause(); else play(beat.id);
  };

  const onDownloadDemo = () => {
    if (!beat.files.mp3) return;
    window.open(beat.files.mp3, '_blank');
  };

  return (
    <div className="pb-8">
      <button className="text-sm underline" onClick={() => nav(-1)}>← Назад</button>

      <div className="mt-4 bg-white/5 rounded-2xl border border-white/10 p-4">
        <div className="flex items-start gap-4">
          <img src={beat.coverUrl} className="h-28 w-28 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold truncate">{beat.title}</div>
            <div className="text-sm text-white/70 mt-0.5">Key: {beat.key} • {beat.bpm} BPM</div>

            {licenses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {licenses.map((t) => (
                  <button
                    key={t}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      license === t ? 'bg-primary text-primaryText border-transparent'
                                    : 'bg-white/10 border-white/15 text-white/90'
                    }`}
                    onClick={() => setLicense(t)}
                  >
                    {labelOf(t)}{priceOf(beat, t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
            disabled={!canDemo}
            onClick={onPlayPause}
            title={canDemo ? '' : 'Нет демо-файла'}
          >
            {playingThis ? '⏸ Пауза' : '▶ Проиграть демо'}
          </button>

          <button
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
            disabled={!canDemo}
            onClick={onDownloadDemo}
          >
            ⬇️ Скачать демо
          </button>

          <button
            className="ml-auto px-4 py-2 rounded-lg bg-primary text-primaryText text-sm"
            disabled={!license}
            onClick={onAdd}
          >
            В корзину {license ? `(${labelOf(license)})` : ''}
          </button>
        </div>

        <div className="mt-3 text-xs text-white/50">
          * Полные файлы выдаются после оплаты. Демо = весь бит с тэгом/превью.
        </div>
      </div>
    </div>
  );
}

function labelOf(t: LicenseType) {
  if (t === 'mp3') return 'MP3';
  if (t === 'wav') return 'WAV';
  return 'Stems';
}
function priceOf(beat: Beat, t: LicenseType) {
  const p = (beat.prices as any)[t] as number | undefined;
  return typeof p === 'number' ? ` — $${p}` : '';
}
