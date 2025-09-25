import { useEffect, useRef } from 'react';
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
    <div className="fixed bottom-[56px] inset-x-0 bg-black/60 backdrop-blur border-t border-white/10">
      <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-sm opacity-90 truncate">{beat.title}</div>
        <div className="flex gap-2">
          <button className="text-sm text-white/80 underline" onClick={() => togglePlay(beat.id)}>
            {isPlaying ? 'Пауза' : 'Играть'}
          </button>
          <button className="text-sm text-white/60" onClick={pause}>Стоп</button>
        </div>
      </div>
      <audio ref={audioRef} src={previewUrl} preload="none" />
    </div>
  );
}
