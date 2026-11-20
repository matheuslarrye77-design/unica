import { Minus, Plus, Scissors, Search } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';

type FormatId = 'livre' | 'retangular' | 'quadrado' | 'circular' | 'triangular' | 'faixa';
type Corner = 'nw' | 'ne' | 'sw' | 'se';
type Box = { x: number; y: number; w: number; h: number };

const FORMATS: { id: FormatId; label: string; ratio: number | null }[] = [
  { id: 'livre', label: 'Livre', ratio: null },
  { id: 'retangular', label: 'Retangular', ratio: 3 / 2 },
  { id: 'quadrado', label: 'Quadrado', ratio: 1 },
  { id: 'circular', label: 'Circular', ratio: 1 },
  { id: 'triangular', label: 'Triangular', ratio: 1 },
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

export const ImageCrop: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void; banner?: boolean; darken?: boolean; lock?: FormatId }> = ({ file, onCancel, onConfirm, banner, darken, lock }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ kind: 'move' | 'pan' | Corner; x: number; y: number; crop: Box; pan: { x: number; y: number } } | null>(null);
  const [src, setSrc] = useState('');
  const [stage, setStage] = useState({ w: 520, h: 280 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [format, setFormat] = useState<FormatId | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [opacityOpen, setOpacityOpen] = useState(false);
  const [crop, setCrop] = useState<Box>({ x: 40, y: 40, w: 200, h: 120 });
  const [opacity, setOpacity] = useState(1);
  const ratio = format ? FORMATS.find((item) => item.id === format)?.ratio ?? null : null;
  const frame = imageFrame(stage, zoom, pan);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const nextStage = stageFor({ w: image.width, h: image.height });
      setStage(nextStage);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      const forced = lock ?? null;
      setFormat(forced);
      setZoomOpen(false);
      setShapesOpen(false);
      setCrop(fitCrop(nextStage, forced ? FORMATS.find((item) => item.id === forced)?.ratio ?? null : null));
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, banner, lock]);

  function chooseFormat(next: FormatId | null) {
    setFormat(next);
    setShapesOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCrop(fitCrop(stage, next ? FORMATS.find((item) => item.id === next)?.ratio ?? null : null));
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
    if (!format) {
      if (banner) {
        const sx = Math.max(0, ((0 - frame.x) / frame.w) * image.width);
        const sy = Math.max(0, ((0 - frame.y) / frame.h) * image.height);
        const sw = Math.min(image.width - sx, (stage.w / frame.w) * image.width);
        const sh = Math.min(image.height - sy, (stage.h / frame.h) * image.height);
        const output = document.createElement('canvas');
        output.width = Math.max(1, Math.round(sw));
        output.height = Math.max(1, Math.round(sh));
        const context = output.getContext('2d');
        if (!context) return;
        context.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
        if (darken && opacity < 1) {
          context.fillStyle = `rgba(0,0,0,${1 - opacity})`;
          context.fillRect(0, 0, output.width, output.height);
        }
        output.toBlob((blob) => {
          if (!blob) return;
          onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.92);
        return;
      }
      if (!darken || opacity >= 1) {
        onConfirm(file);
        return;
      }
      const full = document.createElement('canvas');
      full.width = image.width;
      full.height = image.height;
      const fullContext = full.getContext('2d');
      if (!fullContext) return;
      fullContext.drawImage(image, 0, 0);
      fullContext.fillStyle = `rgba(0,0,0,${1 - opacity})`;
      fullContext.fillRect(0, 0, full.width, full.height);
      full.toBlob((blob) => {
        if (!blob) return;
        onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
      return;
    }
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
    const shaped = format === 'circular' || format === 'triangular';
    context.save();
    if (format === 'circular') {
      context.beginPath();
      context.arc(output.width / 2, output.height / 2, Math.min(output.width, output.height) / 2, 0, Math.PI * 2);
      context.clip();
    }
    if (format === 'triangular') {
      context.beginPath();
      context.moveTo(output.width / 2, 0);
      context.lineTo(output.width, output.height);
      context.lineTo(0, output.height);
      context.closePath();
      context.clip();
    }
    context.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
    if (darken && opacity < 1) {
      context.fillStyle = `rgba(0,0,0,${1 - opacity})`;
      context.fillRect(0, 0, output.width, output.height);
    }
    context.restore();
    const type = shaped ? 'image/png' : file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
    output.toBlob((blob) => {
      if (!blob) return;
      const extension = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg';
      onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + extension, { type }));
    }, type, 0.92);
  }

  const formats = FORMATS.filter((item) => banner || item.id !== 'faixa');

  return (
    <div data-journal-overlay className="pointer-events-auto fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" style={{ pointerEvents: 'auto' }}>
      <div className="pointer-events-auto w-full max-w-[460px] rounded-[22px] bg-white p-5 text-[#1f1b2e] shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]" style={{ pointerEvents: 'auto' }} role="dialog" aria-label={banner ? 'Ajustar capa' : 'Ajustar foto'}>
        <p className="text-lg font-bold">{lock === 'circular' ? 'Ajustar foto de perfil' : banner ? 'Ajustar capa' : 'Ajustar foto'}</p>
        <p className="mt-1 text-xs text-[#8a85a0]">{lock ? 'Esse recorte já tem o formato certo. Arraste a foto e use o zoom.' : banner ? 'Arraste a foto e use o zoom para escolher o enquadramento.' : 'Arraste para posicionar. O corte só muda se você escolher um formato.'}</p>
        <div
          ref={stageRef}
          onPointerDown={banner && !format ? (event) => onPointerDown(event, 'pan') : undefined}
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
          {darken && opacity < 1 && !format ? <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 1 - opacity }} /> : null}
          {format ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-[#1A1428]/40" style={{ height: `${(crop.y / stage.h) * 100}%` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[#1A1428]/40" style={{ height: `${((stage.h - crop.y - crop.h) / stage.h) * 100}%` }} />
              <div className="pointer-events-none absolute bg-[#1A1428]/40" style={{ top: `${(crop.y / stage.h) * 100}%`, height: `${(crop.h / stage.h) * 100}%`, left: 0, width: `${(crop.x / stage.w) * 100}%` }} />
              <div className="pointer-events-none absolute bg-[#1A1428]/40" style={{ top: `${(crop.y / stage.h) * 100}%`, height: `${(crop.h / stage.h) * 100}%`, right: 0, width: `${((stage.w - crop.x - crop.w) / stage.w) * 100}%` }} />
              <div
                className={`absolute cursor-move border border-white ${format === 'circular' ? 'rounded-full' : ''}`}
                style={{ left: `${(crop.x / stage.w) * 100}%`, top: `${(crop.y / stage.h) * 100}%`, width: `${(crop.w / stage.w) * 100}%`, height: `${(crop.h / stage.h) * 100}%`, clipPath: format === 'triangular' ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined }}
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
                    className={`absolute z-10 h-3.5 w-3.5 rounded-full border border-white bg-[#4600F3] ${corner.includes('n') ? '-top-1.5' : '-bottom-1.5'} ${corner.includes('w') ? '-left-1.5' : '-right-1.5'}`}
                    onPointerDown={(event) => onPointerDown(event, corner)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="relative mt-4 flex items-start justify-center gap-5">
          <button type="button" aria-expanded={zoomOpen || Boolean(banner)} aria-label="Zoom" onClick={() => { setZoomOpen((current) => !current); setShapesOpen(false); setOpacityOpen(false); }} className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-[#8a85a0]">
            <span className={`grid h-12 w-12 place-items-center rounded-full ${zoomOpen || banner ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'bg-white text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]'}`}><Search className="h-5 w-5" /></span>
            Zoom
          </button>
          {banner || lock ? null : (
            <button type="button" aria-expanded={shapesOpen} aria-label="Cortar" onClick={() => { setShapesOpen((current) => !current); setZoomOpen(false); setOpacityOpen(false); }} className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-[#8a85a0]">
              <span className={`grid h-12 w-12 place-items-center rounded-full ${shapesOpen || format ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'bg-white text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]'}`}><Scissors className="h-5 w-5" /></span>
              Cortar
            </button>
          )}
          {darken ? (
            <button type="button" aria-expanded={opacityOpen} aria-label="Opacidade" onClick={() => { setOpacityOpen((current) => !current); setZoomOpen(false); setShapesOpen(false); }} className="flex flex-col items-center gap-1.5 text-[11px] font-semibold text-[#8a85a0]">
              <span className={`grid h-12 w-12 place-items-center rounded-full text-sm font-bold ${opacityOpen ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'bg-white text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]'}`}>{Math.round(opacity * 100)}</span>
              Opacidade
            </button>
          ) : null}
          {shapesOpen && !banner && !lock ? (
            <div className="absolute bottom-16 left-1/2 z-20 w-44 -translate-x-1/2 rounded-2xl bg-white p-1.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4]">
              <button type="button" className="block w-full rounded-xl px-3 py-1.5 text-left text-[13px] text-[#4f33b8] hover:bg-[#f6f3ff]" onClick={() => chooseFormat(null)}>Sem corte</button>
              {formats.map((item) => (
                <button key={item.id} type="button" aria-pressed={format === item.id} className={`block w-full rounded-xl px-3 py-1.5 text-left text-[13px] ${format === item.id ? 'bg-[#ece6ff] font-semibold text-[#4f33b8]' : 'text-[#1f1b2e] hover:bg-[#f6f3ff]'}`} onClick={() => chooseFormat(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {banner || lock || zoomOpen ? (
          <div className="mx-auto mt-3 flex w-full max-w-[280px] items-center justify-between rounded-full bg-white px-1.5 py-1 shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]">
            <button type="button" aria-label="Diminuir zoom" className="grid h-9 w-9 place-items-center rounded-full text-[#4f33b8] hover:bg-[#f6f3ff]" onClick={() => changeZoom(Math.max(1, Math.round((zoom - 0.1) * 100) / 100))}><Minus className="h-4 w-4" /></button>
            <span className="text-sm font-semibold tabular-nums text-[#1f1b2e]">Zoom {Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Aumentar zoom" className="grid h-9 w-9 place-items-center rounded-full text-[#4f33b8] hover:bg-[#f6f3ff]" onClick={() => changeZoom(Math.min(3, Math.round((zoom + 0.1) * 100) / 100))}><Plus className="h-4 w-4" /></button>
          </div>
        ) : null}
        {darken && opacityOpen ? (
          <div className="mx-auto mt-3 flex w-full max-w-[280px] items-center justify-between rounded-full bg-white px-1.5 py-1 shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]">
            <button type="button" aria-label="Diminuir opacidade" className="grid h-9 w-9 place-items-center rounded-full text-[#4f33b8] hover:bg-[#f6f3ff]" onClick={() => setOpacity(Math.max(0.2, Math.round((opacity - 0.05) * 100) / 100))}><Minus className="h-4 w-4" /></button>
            <span className="text-sm font-semibold tabular-nums text-[#1f1b2e]">Opacidade {Math.round(opacity * 100)}%</span>
            <button type="button" aria-label="Aumentar opacidade" className="grid h-9 w-9 place-items-center rounded-full text-[#4f33b8] hover:bg-[#f6f3ff]" onClick={() => setOpacity(Math.min(1, Math.round((opacity + 0.05) * 100) / 100))}><Plus className="h-4 w-4" /></button>
          </div>
        ) : null}
        <div className="mt-4 flex items-center gap-2 border-t border-[#e8e4f4] pt-3.5">
          <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setOpacity(1); if (!lock && !banner) chooseFormat(null); }}>Redefinir</button>
          <span className="flex-1" />
          <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-[11px] bg-[#6644e0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8]" onClick={confirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};
