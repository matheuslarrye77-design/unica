import { Pause, Play } from 'lucide-react';
import { type FC, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { CLIP_CHOICES, clampClip, clipToWavFile, initialClipSeconds, mixdown, peaksFromSamples } from '@/lib/audioClip';

function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export const AudioTrim: FC<{ file: File; onCancel: () => void; onConfirm: (file: File, clip: { start: number; duration: number }) => void }> = ({ file, onCancel, onConfirm }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const dragRef = useRef<{ x: number; start: number; width: number } | null>(null);
  const [src, setSrc] = useState('');
  const [length, setLength] = useState(0);
  const [selected, setSelected] = useState(0);
  const [start, setStart] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [waveError, setWaveError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    const context = new AudioContext();
    let cancel = false;
    void file.arrayBuffer()
      .then((bytes) => context.decodeAudioData(bytes.slice(0)))
      .then((buffer) => {
        if (cancel) return;
        bufferRef.current = buffer;
        const width = trackRef.current?.clientWidth ?? 280;
        const bars = Math.max(48, Math.min(140, Math.round(width / 3)));
        setPeaks(peaksFromSamples(mixdown(buffer), bars));
        setLength((current) => current || buffer.duration);
        setSelected((current) => current || initialClipSeconds(buffer.duration));
      })
      .catch(() => {
        if (!cancel) setWaveError(true);
      })
      .finally(() => {
        void context.close();
      });
    return () => {
      cancel = true;
      audioRef.current?.pause();
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const track = trackRef.current;
    const buffer = bufferRef.current;
    if (!track || !buffer) return;
    const observer = new ResizeObserver(() => {
      const bars = Math.max(48, Math.min(140, Math.round(track.clientWidth / 3)));
      setPeaks(peaksFromSamples(mixdown(buffer), bars));
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [peaks === null]);

  function pauseAt(next = start) {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = next;
    }
    setPlaying(false);
    setPlayhead(next);
  }

  function choose(seconds: number) {
    const clip = clampClip(length, Math.min(seconds, length), start);
    setSelected(clip.duration);
    setStart(clip.start);
    pauseAt(clip.start);
  }

  function moveTo(nextStart: number) {
    const clip = clampClip(length, selected, nextStart);
    setStart(clip.start);
    pauseAt(clip.start);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || length <= 0 || selected <= 0) return;
    if (!audio.paused) {
      setPlaying(false);
      setPlayhead(audio.currentTime);
      audio.pause();
      return;
    }
    const end = start + selected;
    if (audio.currentTime < start || audio.currentTime >= end - 0.05) audio.currentTime = start;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (length <= 0) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { x: event.clientX, start, width: rect.width };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // O arraste continua enquanto o ponteiro estiver sobre a forma de onda.
    }
    pauseAt(start);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.width <= 0) return;
    const delta = ((event.clientX - drag.x) / drag.width) * length;
    const clip = clampClip(length, selected, drag.start + delta);
    setStart(clip.start);
    setPlayhead(clip.start);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTo(start + 0.25);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo(start - 0.25);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(length);
    } else if (event.key === ' ') {
      event.preventDefault();
      togglePlay();
    }
  }

  async function confirm() {
    const buffer = bufferRef.current;
    if (!buffer || busy || selected <= 0) return;
    pauseAt(start);
    setBusy(true);
    setError('');
    try {
      const clip = clampClip(buffer.duration, selected, start);
      const trimmed = await clipToWavFile(file.name, buffer, clip.start, clip.duration);
      onConfirm(trimmed.file, { start: 0, duration: trimmed.duration });
    } catch {
      setError('Não foi possível recortar este trecho.');
      setBusy(false);
    }
  }

  const windowStyle = length > 0 && selected > 0
    ? { left: `${(start / length) * 100}%`, width: `${(selected / length) * 100}%` }
    : { left: '0%', width: '0%' };
  const bars = peaks ?? Array.from({ length: 72 }, () => 0.28);
  const ready = length > 0 && selected > 0 && Boolean(bufferRef.current);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 sm:place-items-center">
      <div className="w-full max-w-md rounded-3xl bg-[#1A1022] p-4 text-white shadow-xl" role="dialog" aria-label="Escolher trecho do áudio">
        <p className="text-sm font-medium">Escolher trecho do áudio</p>
        <p className="mt-1 truncate text-xs text-white/60">{file.name}</p>
        <audio
          ref={audioRef}
          src={src || undefined}
          preload="auto"
          className="hidden"
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;
            setLength((current) => current || duration);
            setSelected((current) => current || initialClipSeconds(duration));
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            const end = start + selected;
            if (audio.currentTime >= end) {
              audio.pause();
              audio.currentTime = start;
              setPlaying(false);
              setPlayhead(start);
              return;
            }
            setPlayhead(audio.currentTime);
          }}
          onEnded={() => pauseAt(start)}
        />
        <div className="mt-4 flex items-center gap-3">
          <button type="button" aria-label={playing ? 'Pausar' : 'Reproduzir trecho'} disabled={length <= 0} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-white disabled:opacity-40" onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="relative mb-1 h-4">
              {length > 0 ? (
                <span className="absolute top-0 -translate-x-1/2 text-[11px] font-medium text-white" style={{ left: `${((start + selected / 2) / length) * 100}%` }}>
                  {Math.max(1, Math.round(selected))} segundos
                </span>
              ) : <span className="text-[11px] text-white/60">Lendo o áudio...</span>}
            </div>
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Trecho do áudio"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, Math.round((length - selected) * 10) / 10)}
              aria-valuenow={Math.round(start * 10) / 10}
              aria-valuetext={`De ${clock(start)} até ${clock(start + selected)}`}
              className="relative h-16 touch-none overflow-hidden rounded-2xl bg-[#120914]"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKey}
            >
              <div className="absolute inset-x-1 bottom-2 top-2 flex items-end gap-px">
                {bars.map((peak, index) => (
                  <span key={index} className={`w-px flex-1 rounded-full ${waveError ? 'bg-white/35' : 'bg-white'}`} style={{ height: `${Math.max(4, Math.round(peak * 48))}px` }} />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-y-1" style={windowStyle}>
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    padding: '2px',
                    background: 'linear-gradient(90deg,#F9A8D4,#E879F9,#FB923C,#C084FC)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <div className="absolute inset-[2px] rounded-[14px] bg-white/10" />
              </div>
              {playing ? <span className="pointer-events-none absolute inset-y-2 w-0.5 rounded-full bg-[#F9A8D4] shadow-[0_0_0_1px_#6A228C]" style={{ left: `${(playhead / length) * 100}%` }} /> : null}
            </div>
          </div>
        </div>
        {waveError ? <p className="mt-2 text-xs text-white/60">A forma de onda não pôde ser lida, então este arquivo não pode ser recortado.</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Duração do trecho">
          {CLIP_CHOICES.map((choice) => {
            const available = length > 0 && choice <= length + 0.05;
            const active = available && Math.abs(selected - choice) < 0.5;
            return (
              <button key={choice} type="button" disabled={!available} aria-pressed={active} className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-30 ${active ? 'bg-[#8E35B8] text-white' : 'bg-white/10 text-white'}`} onClick={() => choose(choice)}>
                {choice} s
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/70">{length > 0 ? `${clock(start)} – ${clock(start + selected)}` : 'Aguarde o áudio carregar.'}</p>
        {error ? <p className="mt-2 text-xs text-[#F9A8D4]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-sm text-white/80" onClick={() => { pauseAt(start); onCancel(); }}>Cancelar</button>
          <button type="button" disabled={!ready || busy} className="rounded-full bg-[#8E35B8] px-4 py-2 text-sm font-medium text-white disabled:opacity-40" onClick={() => void confirm()}>{busy ? 'Recortando...' : 'Usar este trecho'}</button>
        </div>
      </div>
    </div>
  );
};
