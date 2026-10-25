import { Minus, Plus } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';

export const ImageAdjust: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void }> = ({ file, onCancel, onConfirm }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; width: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ w: 320, h: 320 });
  const [src, setSrc] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const ratio = image.width / image.height || 1;
      let width = 420;
      let height = width / ratio;
      if (height > 520) {
        height = 520;
        width = height * ratio;
      }
      setFrame({ w: Math.round(width), h: Math.round(height) });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function changeZoom(next: number) {
    const value = Math.min(3, Math.max(1, next));
    setZoom(value);
    if (value === 1) setPan({ x: 0, y: 0 });
  }

  function confirm() {
    const image = imageRef.current;
    const untouched = zoom === 1 && Math.abs(pan.x) < 1 && Math.abs(pan.y) < 1;
    if (!image || untouched) {
      onConfirm(file);
      return;
    }
    const shownWidth = frame.w * zoom;
    const shownHeight = frame.h * zoom;
    const left = (frame.w - shownWidth) / 2 + pan.x;
    const top = (frame.h - shownHeight) / 2 + pan.y;
    const sx = Math.max(0, ((0 - left) / shownWidth) * image.width);
    const sy = Math.max(0, ((0 - top) / shownHeight) * image.height);
    const sw = Math.min(image.width - sx, (frame.w / shownWidth) * image.width);
    const sh = Math.min(image.height - sy, (frame.h / shownHeight) * image.height);
    const longest = Math.max(sw, sh);
    const ratio = longest > 2000 ? 2000 / longest : 1;
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.round(sw * ratio));
    output.height = Math.max(1, Math.round(sh * ratio));
    output.getContext('2d')?.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
    const type = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
    output.toBlob((blob) => {
      if (!blob) return;
      const extension = type === 'image/png' ? '.png' : type === 'image/webp' ? '.webp' : '.jpg';
      onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + extension, { type }));
    }, type, 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-4 shadow-xl">
        <p className="text-sm font-medium text-foreground">Ajustar foto</p>
        <div
          ref={frameRef}
          className="mx-auto mt-3 overflow-hidden rounded-2xl bg-[#16141F]"
          style={{ width: frame.w, maxWidth: '100%', aspectRatio: `${frame.w} / ${frame.h}` }}
          onPointerDown={(event) => {
            const bounds = frameRef.current?.getBoundingClientRect();
            drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, width: bounds?.width || frame.w };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current || zoom === 1) return;
            const scale = frame.w / drag.current.width;
            setPan({
              x: drag.current.panX + (event.clientX - drag.current.x) * scale,
              y: drag.current.panY + (event.clientY - drag.current.y) * scale,
            });
          }}
          onPointerUp={() => { drag.current = null; }}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-contain"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            />
          ) : null}
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
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full px-4 py-2 text-sm text-[#6A228C]" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-full bg-[#8E35B8] px-4 py-2 text-sm font-medium text-white" onClick={confirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};
