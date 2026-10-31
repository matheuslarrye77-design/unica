import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';

type FormatId = 'livre' | 'retangular' | 'quadrado' | 'faixa';
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Box = { x: number; y: number; w: number; h: number };

const FORMATS: { id: FormatId; label: string; ratio: number | null }[] = [
  { id: 'livre', label: 'Livre', ratio: null },
  { id: 'retangular', label: 'Retangular', ratio: 3 / 2 },
  { id: 'quadrado', label: 'Quadrado', ratio: 1 },
  { id: 'faixa', label: 'Faixa', ratio: 1400 / 320 },
];

function stageFor(natural: { w: number; h: number }) {
  const scale = Math.min(520 / natural.w, 340 / natural.h);
  return {
    w: Math.max(180, Math.round(natural.w * scale)),
    h: Math.max(120, Math.round(natural.h * scale)),
  };
}

function imageFrame(stage: { w: number; h: number }, zoom: number, pan: { x: number; y: number }): Box {
  const w = stage.w * zoom;
  const h = stage.h * zoom;
  return { x: (stage.w - w) / 2 + pan.x, y: (stage.h - h) / 2 + pan.y, w, h };
}

function clampPan(pan: { x: number; y: number }, stage: { w: number; h: number }, zoom: number) {
  const w = stage.w * zoom;
  const h = stage.h * zoom;
  const baseX = (stage.w - w) / 2;
  const baseY = (stage.h - h) / 2;
  return {
    x: Math.min(-baseX, Math.max(stage.w - w - baseX, pan.x)),
    y: Math.min(-baseY, Math.max(stage.h - h - baseY, pan.y)),
  };
}

function fitCrop(stage: { w: number; h: number }, ratio: number | null): Box {
  if (!ratio) {
    const inset = 0.12;
    return { x: stage.w * inset, y: stage.h * inset, w: stage.w * (1 - inset * 2), h: stage.h * (1 - inset * 2) };
  }
  let w = stage.w * 0.92;
  let h = w / ratio;
  if (h > stage.h * 0.92) {
    h = stage.h * 0.92;
    w = h * ratio;
  }
  return { x: (stage.w - w) / 2, y: (stage.h - h) / 2, w, h };
}

function clampCrop(crop: Box, stage: { w: number; h: number }, ratio: number | null): Box {
  let w = Math.max(64, Math.min(crop.w, stage.w));
  let h = Math.max(64, Math.min(crop.h, stage.h));
  if (ratio) {
    h = w / ratio;
    if (h > stage.h) {
      h = stage.h;
      w = h * ratio;
    }
    if (w > stage.w) {
      w = stage.w;
      h = w / ratio;
    }
  }
  return {
    x: Math.min(Math.max(0, crop.x), stage.w - w),
    y: Math.min(Math.max(0, crop.y), stage.h - h),
    w,
    h,
  };
}

export const ImageCrop: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void; banner?: boolean; darken?: boolean }> = ({ file, onCancel, onConfirm, banner, darken }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ kind: 'move' | 'pan' | Corner; x: number; y: number; crop: Box; pan: { x: number; y: number } } | null>(null);
  const [src, setSrc] = useState('');
  const [stage, setStage] = useState({ w: 520, h: 280 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [format, setFormat] = useState<FormatId>(banner ? 'faixa' : 'livre');
  const [crop, setCrop] = useState<Box>({ x: 40, y: 40, w: 200, h: 120 });
  const [opacity, setOpacity] = useState(1);
  const ratio = FORMATS.find((item) => item.id === format)?.ratio ?? null;
  const frame = imageFrame(stage, zoom, pan);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const nextStage = stageFor({ w: image.width, h: image.height });
      const nextFormat: FormatId = banner ? 'faixa' : 'livre';
      setStage(nextStage);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setFormat(nextFormat);
      setCrop(fitCrop(nextStage, FORMATS.find((item) => item.id === nextFormat)?.ratio ?? null));
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, banner]);

  function chooseFormat(next: FormatId) {
    setFormat(next);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCrop(fitCrop(stage, FORMATS.find((item) => item.id === next)?.ratio ?? null));
  }

  function changeZoom(next: number) {
    const value = Math.min(3, Math.max(1, next));
    setZoom(value);
    setPan((current) => clampPan(current, stage, value));
  }

  function pointerScale() {
    const rect = stageRef.current?.getBoundingClientRect();
    return { x: rect && rect.width ? stage.w / rect.width : 1, y: rect && rect.height ? stage.h / rect.height : 1 };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>, kind: 'move' | 'pan' | Corner) {
    drag.current = { kind: zoom > 1 && kind === 'move' ? 'pan' : kind, x: event.clientX, y: event.clientY, crop, pan };
    stageRef.current?.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) return;
    const scale = pointerScale();
    const dx = (event.clientX - current.x) * scale.x;
    const dy = (event.clientY - current.y) * scale.y;
    if (current.kind === 'pan') {
      setPan(clampPan({ x: current.pan.x + dx, y: current.pan.y + dy }, stage, zoom));
      return;
    }
    if (current.kind === 'move') {
      setCrop(clampCrop({ ...current.crop, x: current.crop.x + dx, y: current.crop.y + dy }, stage, ratio));
      return;
    }
    const origin = current.crop;
    let left = origin.x;
    let top = origin.y;
    let right = origin.x + origin.w;
    let bottom = origin.y + origin.h;
    if (current.kind.includes('w')) left += dx;
    if (current.kind.includes('e')) right += dx;
    if (current.kind.includes('n')) top += dy;
    if (current.kind.includes('s')) bottom += dy;
    let w = Math.max(64, right - left);
    let h = Math.max(64, bottom - top);
    if (ratio) {
      if (Math.abs(dx) >= Math.abs(dy)) h = w / ratio;
      else w = h * ratio;
    }
    const x = current.kind.includes('w') ? right - w : left;
    const y = current.kind.includes('n') ? bottom - h : top;
    setCrop(clampCrop({ x, y, w, h }, stage, ratio));
  }

  function confirm() {
    const image = imageRef.current;
    if (!image) return;
    const sx = Math.max(0, ((crop.x - frame.x) / frame.w) * image.width);
    const sy = Math.max(0, ((crop.y - frame.y) / frame.h) * image.height);
    const sw = Math.min(image.width - sx, (crop.w / frame.w) * image.width);
    const sh = Math.min(image.height - sy, (crop.h / frame.h) * image.height);
    const longest = Math.max(sw, sh);
    const scale = longest > 2000 ? 2000 / longest : 1;
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.round(sw * scale));
    output.height = Math.max(1, Math.round(sh * scale));
    const context = output.getContext('2d');
    if (!context) return;
    context.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
    if (darken && opacity < 1) {
      context.fillStyle = `rgba(0,0,0,${1 - opacity})`;
      context.fillRect(0, 0, output.width, output.height);
    }
    const type = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
    output.toBlob((blob) => {
      if (!blob) return;
      const extension = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg';
      onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + extension, { type }));
    }, type, 0.92);
  }

  const formats = FORMATS.filter((item) => banner || item.id !== 'faixa');

  return (
    <div data-journal-overlay className="pointer-events-auto fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" style={{ pointerEvents: 'auto' }}>
      <div className="pointer-events-auto w-full max-w-xl rounded-3xl bg-card p-4 shadow-xl" style={{ pointerEvents: 'auto' }} role="dialog" aria-label={banner ? 'Ajustar capa' : 'Ajustar foto'}>
        <p className="text-sm font-medium text-foreground">{banner ? 'Ajustar capa' : 'Ajustar foto'}</p>
        <p className="mt-1 text-xs text-muted-foreground">Arraste a área e escolha o formato. A grade mostra o enquadramento.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {formats.map((item) => (
            <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => chooseFormat(item.id)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${format === item.id ? 'bg-[#8E35B8] text-white' : 'bg-[#F3E4FA] text-[#6A228C]'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div
          ref={stageRef}
          className="relative mx-auto mt-3 touch-none overflow-hidden rounded-2xl bg-[#F6F3FA]"
          style={{ width: stage.w, maxWidth: '100%', aspectRatio: `${stage.w} / ${stage.h}` }}
          onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ left: `${(frame.x / stage.w) * 100}%`, top: `${(frame.y / stage.h) * 100}%`, width: `${(frame.w / stage.w) * 100}%`, height: `${(frame.h / stage.h) * 100}%` }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#1A1428]/40" style={{ height: `${(crop.y / stage.h) * 100}%` }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#1A1428]/40" style={{ height: `${((stage.h - crop.y - crop.h) / stage.h) * 100}%` }} />
          <div className="pointer-events-none absolute bg-[#1A1428]/40" style={{ top: `${(crop.y / stage.h) * 100}%`, height: `${(crop.h / stage.h) * 100}%`, left: 0, width: `${(crop.x / stage.w) * 100}%` }} />
          <div className="pointer-events-none absolute bg-[#1A1428]/40" style={{ top: `${(crop.y / stage.h) * 100}%`, height: `${(crop.h / stage.h) * 100}%`, right: 0, width: `${((stage.w - crop.x - crop.w) / stage.w) * 100}%` }} />
          <div
            className="absolute cursor-move border border-white"
            style={{ left: `${(crop.x / stage.w) * 100}%`, top: `${(crop.y / stage.h) * 100}%`, width: `${(crop.w / stage.w) * 100}%`, height: `${(crop.h / stage.h) * 100}%` }}
            onPointerDown={(event) => onPointerDown(event, 'move')}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/80" />
            <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/80" />
            <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/80" />
            <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/80" />
            {darken && opacity < 1 ? <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 1 - opacity }} /> : null}
            {(['nw', 'ne', 'sw', 'se'] as Corner[]).map((corner) => (
              <button
                key={corner}
                type="button"
                aria-label="Ajustar recorte"
                className={`absolute z-10 h-3.5 w-3.5 rounded-full border border-white bg-[#8E35B8] ${corner.includes('n') ? '-top-1.5' : '-bottom-1.5'} ${corner.includes('w') ? '-left-1.5' : '-right-1.5'}`}
                onPointerDown={(event) => onPointerDown(event, corner)}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" aria-label="Diminuir zoom" className="grid h-9 w-9 place-items-center rounded-full bg-[#F8EAFB] text-[#6A228C]" onClick={() => changeZoom(zoom - 0.15)}>
            <Minus className="h-4 w-4" />
          </button>
          <input aria-label="Zoom" type="range" min={1} max={3} step={0.01} value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} className="h-1.5 flex-1 accent-[#8E35B8]" />
          <button type="button" aria-label="Aumentar zoom" className="grid h-9 w-9 place-items-center rounded-full bg-[#F8EAFB] text-[#6A228C]" onClick={() => changeZoom(zoom + 0.15)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {darken ? (
          <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            Opacidade
            <input aria-label="Opacidade" type="range" min={0.2} max={1} step={0.01} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="h-1.5 flex-1 accent-[#8E35B8]" />
          </label>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-sm text-[#6A228C]" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-full bg-[#8E35B8] px-4 py-2 text-sm font-medium text-white" onClick={confirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};
