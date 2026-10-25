import { type FC, useEffect, useRef, useState } from 'react';

const CHOICES = [10, 15, 30, 60, 120];

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const text = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${text}` : text;
}

export const AudioTrim: FC<{ file: File; onCancel: () => void; onConfirm: (clip: { start: number; duration: number }) => void }> = ({ file, onCancel, onConfirm }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState('');
  const [length, setLength] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [start, setStart] = useState(0);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const windowSeconds = minutes > 0 ? Math.min(minutes * 60, length) : length;
  const maxStart = Math.max(0, length - windowSeconds);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const tick = () => {
      if (audio.currentTime >= start + windowSeconds) {
        audio.pause();
        audio.currentTime = start;
      }
    };
    audio.addEventListener('timeupdate', tick);
    return () => audio.removeEventListener('timeupdate', tick);
  }, [start, windowSeconds]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-4 shadow-xl">
        <p className="text-sm font-medium">Escolher trecho do áudio</p>
        <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>
        <audio
          ref={audioRef}
          src={src || undefined}
          controls
          className="mt-3 w-full"
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;
            setLength(duration);
          }}
          onPlay={(event) => {
            const audio = event.currentTarget;
            if (audio.currentTime < start || audio.currentTime >= start + windowSeconds) audio.currentTime = start;
          }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" className={`rounded-full px-3 py-1 text-xs font-medium ${minutes === 0 ? 'bg-[#8E35B8] text-white' : 'bg-[#F8EAFB] text-[#6A228C]'}`} onClick={() => { setMinutes(0); setStart(0); }}>Tudo</button>
          {CHOICES.map((choice) => {
            const available = length === 0 || choice * 60 <= length + 0.5;
            return (
              <button key={choice} type="button" disabled={!available} className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-35 ${minutes === choice ? 'bg-[#8E35B8] text-white' : 'bg-[#F8EAFB] text-[#6A228C]'}`} onClick={() => { setMinutes(choice); setStart(0); }}>
                {choice} min
              </button>
            );
          })}
        </div>
        <label className="mt-3 block text-xs text-muted-foreground">
          Começa em {clock(start)} e vai até {clock(start + windowSeconds)}
          <input
            aria-label="Início do trecho"
            type="range"
            min={0}
            max={Math.max(0, maxStart)}
            step={1}
            value={Math.min(start, maxStart)}
            disabled={maxStart <= 0}
            onChange={(event) => setStart(Number(event.target.value))}
            className="mt-2 h-1.5 w-full accent-[#8E35B8]"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-sm text-[#6A228C]" onClick={onCancel}>Cancelar</button>
          <button type="button" disabled={length === 0} className="rounded-full bg-[#8E35B8] px-4 py-2 text-sm font-medium text-white disabled:opacity-40" onClick={() => onConfirm({ start, duration: windowSeconds })}>Usar este trecho</button>
        </div>
      </div>
    </div>
  );
};
