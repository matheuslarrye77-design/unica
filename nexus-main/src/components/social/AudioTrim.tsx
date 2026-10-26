import { Pause, Play } from 'lucide-react';
import { type FC, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { clampClip, clipChoices, clipToWavFile, formatClip, initialClipSeconds, mixdown, peaksFromSamples } from '@/lib/audioClip';

function shownBars(peaks: number[] | null, count: number) {
  const source = peaks ?? Array.from({ length: count }, () => 0.28);
  if (source.length === count) return source;
  return Array.from({ length: count }, (_, index) => source[Math.min(source.length - 1, Math.floor((index / count) * source.length))] ?? 0.2);
}

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
  const dragRef = useRef<{ x: number; start: number; duration: number; width: number; mode: 'move' | 'start' | 'end' } | null>(null);
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
  const [menu, setMenu] = useState(false);
  const [whole, setWhole] = useState(false);

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
        const bars = Math.max(180, Math.min(480, Math.round(width)));
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
      const bars = Math.max(180, Math.min(480, Math.round(track.clientWidth)));
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

  function choose(seconds: number, isFull = false) {
    const clip = clampClip(length, isFull ? length : Math.min(seconds, length), isFull ? 0 : start);
    setWhole(isFull);
    setSelected(clip.duration);
    setStart(clip.start);
    pauseAt(clip.start);
    setMenu(false);
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
      audio.pause();
      audio.currentTime = start;
      setPlaying(false);
      setPlayhead(start);
      return;
    }
    audio.currentTime = start;
    setPlayhead(start);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function startDrag(mode: 'move' | 'start' | 'end', event: ReactPointerEvent<HTMLElement>) {
    if (length <= 0) return;
    event.preventDefault();
    const width = trackRef.current?.getBoundingClientRect().width ?? 1;
    setMenu(false);
    dragRef.current = { x: event.clientX, start, duration: selected, width, mode };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // O arraste continua enquanto o ponteiro estiver sobre o seletor.
    }
    pauseAt(start);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-edge]')) return;
    startDrag('move', event);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.width <= 0 || length <= 0) return;
    const delta = ((event.clientX - drag.x) / drag.width) * length;
    const minDuration = Math.min(1, length);
    if (drag.mode === 'start') {
      const end = drag.start + drag.duration;
      const nextStart = Math.min(Math.max(0, drag.start + delta), end - minDuration);
      setStart(nextStart);
      setSelected(end - nextStart);
      setWhole(false);
      setPlayhead(nextStart);
      return;
    }
    if (drag.mode === 'end') {
      const nextEnd = Math.max(drag.start + minDuration, Math.min(length, drag.start + drag.duration + delta));
      setStart(drag.start);
      setSelected(nextEnd - drag.start);
      setWhole(false);
      setPlayhead(drag.start);
      return;
    }
    const clip = clampClip(length, drag.duration, drag.start + delta);
    setStart(clip.start);
    setSelected(clip.duration);
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

  const span = length > 0 ? length : 1;
  const selectionLeft = (start / span) * 100;
  const selectionWidth = (selected / span) * 100;
  const progressEnd = playing ? Math.min(start + selected, Math.max(start, playhead)) : start + Math.min(selected, Math.max(selected * 0.12, 0.4));
  const bars = shownBars(peaks, 64);
  const durationLabel = whole ? 'Tudo' : selected < 60 ? String(Math.max(1, Math.round(selected))) : formatClip(selected);
  const ready = length > 0 && selected > 0 && Boolean(bufferRef.current);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/55 p-3 sm:place-items-center">
      <div className="w-full max-w-lg rounded-2xl bg-[#2E2E2E] px-4 py-4 text-white" role="dialog" aria-label="Escolher trecho do áudio" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
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
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="relative col-start-1 row-start-1">
            <button type="button" aria-label="Duração do trecho" aria-expanded={menu} disabled={length <= 0} className={`grid h-10 shrink-0 place-items-center rounded-full bg-white text-[12px] font-semibold leading-none text-[#3A3A3A] disabled:opacity-40 ${durationLabel.length > 2 ? 'min-w-10 px-2' : 'w-10'}`} onClick={() => setMenu((open) => !open)}>
              {length > 0 ? durationLabel : '…'}
            </button>
            {menu ? (
              <div className="absolute left-0 top-11 z-10 max-h-52 w-28 overflow-y-auto rounded-2xl bg-[#242424] py-1 shadow-xl" role="menu" aria-label="Opções de duração">
                {clipChoices(length).map((choice) => (
                  <button key={choice.id} type="button" role="menuitem" disabled={!choice.available} className="block w-full px-3 py-1.5 text-left text-xs text-white disabled:opacity-30 hover:bg-white/10 disabled:hover:bg-transparent" onClick={() => choice.available && choose(choice.seconds, Boolean(choice.full))}>
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative col-start-2 row-start-1 h-5">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#5C5C5C]" />
            <div className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#F5D90A]" style={{ left: `${selectionLeft}%`, width: `${Math.max(0.6, ((progressEnd - start) / span) * 100)}%` }} />
            <button type="button" data-edge="start" aria-label="Ajustar início" className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E100FF]" style={{ left: `${selectionLeft}%` }} onPointerDown={(event) => startDrag('start', event)} />
            <button type="button" data-edge="end" aria-label="Ajustar fim" className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E100FF]" style={{ left: `${Math.min(100, selectionLeft + selectionWidth)}%` }} onPointerDown={(event) => startDrag('end', event)} />
          </div>
          <button type="button" aria-label={playing ? 'Pausar' : 'Reproduzir trecho'} disabled={length <= 0} className="col-start-3 row-start-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#2A2A2A] disabled:opacity-40" onClick={togglePlay}>
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Trecho do áudio"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.round((length - selected) * 10) / 10)}
          aria-valuenow={Math.round(start * 10) / 10}
          aria-valuetext={`De ${clock(start)} até ${clock(start + selected)}`}
          className="relative col-start-2 row-start-2 mt-3 h-24 touch-none"
          onPointerDown={onPointerDown}
          onKeyDown={onKey}
        >
          <div className="absolute inset-x-0 top-3 bottom-3 flex items-center justify-between">
            {bars.map((peak, index) => (
              <span key={index} className={`w-[2px] shrink-0 rounded-full ${waveError ? 'bg-white/35' : 'bg-white'}`} style={{ height: `${Math.max(6, Math.round(peak * 68))}px` }} />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-1" style={{ left: `${selectionLeft}%`, width: `${selectionWidth}%` }}>
            <div
              className="absolute inset-0"
              style={{
                borderRadius: 10,
                padding: '6px',
                background: 'conic-gradient(from 0deg, #FF3B30 0deg, #FF4F93 70deg, #FF4F93 110deg, #D946EF 160deg, #7C3AED 210deg, #C026D3 250deg, #FF4F93 300deg, #FFE14A 328deg, #FF9A1A 348deg, #FF3B30 360deg)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            <button type="button" data-edge="start" aria-label="Ajustar início do trecho" className="pointer-events-auto absolute inset-y-0 left-0 w-4 cursor-ew-resize" onPointerDown={(event) => startDrag('start', event)} />
            <button type="button" data-edge="end" aria-label="Ajustar fim do trecho" className="pointer-events-auto absolute inset-y-0 right-0 w-4 cursor-ew-resize" onPointerDown={(event) => startDrag('end', event)} />
          </div>
        </div>
        </div>
        {waveError ? <p className="mt-2 text-xs text-white/60">A forma de onda não pôde ser lida, então este arquivo não pode ser recortado.</p> : null}
        {error ? <p className="mt-2 text-xs text-[#F9A8D4]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-sm text-white/80" onClick={() => { pauseAt(start); onCancel(); }}>Cancelar</button>
          <button type="button" disabled={!ready || busy} className="rounded-full bg-[#8E35B8] px-4 py-2 text-sm font-medium text-white disabled:opacity-40" onClick={() => void confirm()}>{busy ? 'Recortando...' : 'Usar este trecho'}</button>
        </div>
      </div>
    </div>
  );
};
