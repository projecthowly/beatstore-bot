import { useMemo, useState } from 'react';
import { useApp } from '../store';
import type { Beat, LicenseType } from '../types';

export default function BeatDetail() {
  const {
    selectedBeatId,
    beats,
    closeDetail,
    addToCart,
    play,
    pause,
    playingBeatId,
    isPlaying
  } = useApp();

  const beat: Beat | undefined = useMemo(
    () => beats.find(b => b.id === selectedBeatId),
    [beats, selectedBeatId]
  );

  const availableLicenses: LicenseType[] = useMemo(() => {
    if (!beat) return [];
    const res: LicenseType[] = [];
    if (beat.prices.mp3) res.push('mp3');
    if (beat.prices.wav) res.push('wav');
    if (beat.prices.stems) res.push('stems');
    return res;
  }, [beat]);

  const [license, setLicense] = useState<LicenseType | undefined>(() =>
    availableLicenses[0]
  );

  if (!beat) return null;

  const playingThis = playingBeatId === beat.id && isPlaying;
  const canDemo = Boolean(beat.files.mp3);

  const onAdd = () => {
    if (!license) return;
    addToCart(beat.id, license);
    // Можно показать уведомление — упростим алертом для MVP:
    alert('Добавлено в корзину');
  };

  const onDemo = () => {
    if (!canDemo) return;
    if (playingThis) pause();
    else play(beat.id);
  };

  const onDownloadDemo = () => {
    if (!beat.files.mp3) return;
    // В MVP даём прямую ссылку. Позже будет защищённый URL с S3.
    window.open(beat.files.mp3, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-bg rounded-t-2xl border-t border-white/10 p-4 pb-6">
        <div className="flex items-start gap-3">
          <img src={beat.coverUrl} className="h-20 w-20 rounded-lg object-cover" />
          <div className="flex-1">
            <div className="text-base font-semibold">{beat.title}</div>
            <div className="text-xs text-white/60 mt-0.5">
              Key: {beat.key} • {beat.bpm} BPM
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {availableLicenses.map((t) => (
                <button
                  key={t}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    license === t
                      ? 'bg-primary text-primaryText border-transparent'
                      : 'bg-white/10 border-white/15 text-white/90'
                  }`}
                  onClick={() => setLicense(t)}
                >
                  {labelOf(t)}{priceOf(beat, t)}
                </button>
              ))}
            </div>
          </div>

          <button
            className="px-3 py-1 rounded-lg bg-white/10 text-sm border border-white/10"
            onClick={closeDetail}
            aria-label="Закрыть"
          >
            Закрыть
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
            disabled={!canDemo}
            onClick={onDemo}
            title={canDemo ? '' : 'Нет демо-файла'}
          >
            {playingThis ? '⏸ Пауза' : '▶ Прослушать демо'}
          </button>

          <button
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
            disabled={!canDemo}
            onClick={onDownloadDemo}
            title={canDemo ? '' : 'Нет демо-файла'}
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
          * Полные файлы выдаются после оплаты. В демо может быть тэг/превью.
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
