import { type FC, useEffect, useRef, useState } from 'react';

export const ImageAdjust: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void }> = ({ file, onCancel, onConfirm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const view = 280;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      paint(image, zoom, pan);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (imageRef.current) paint(imageRef.current, zoom, pan);
  }, [zoom, pan]);

  function paint(image: HTMLImageElement, nextZoom: number, nextPan: { x: number; y: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const base = Math.min(view / image.width, view / image.height);
    const scale = base * nextZoom;
    const width = image.width * scale;
    const height = image.height * scale;
    context.clearRect(0, 0, view, view);
    context.fillStyle = '#111';
    context.fillRect(0, 0, view, view);
    context.drawImage(image, (view - width) / 2 + nextPan.x, (view - height) / 2 + nextPan.y, width, height);
  }

  function confirm() {
    const image = imageRef.current;
    if (!image) return;
    const base = Math.min(view / image.width, view / image.height);
    const scale = base * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    const originX = (view - width) / 2 + pan.x;
    const originY = (view - height) / 2 + pan.y;
    const sx = Math.max(0, (0 - originX) / scale);
    const sy = Math.max(0, (0 - originY) / scale);
    const sw = Math.min(image.width - sx, view / scale);
    const sh = Math.min(image.height - sy, view / scale);
    const output = document.createElement('canvas');
    const longest = Math.max(sw, sh);
    const ratio = longest > 1600 ? 1600 / longest : 1;
    output.width = Math.max(1, Math.round(sw * ratio));
    output.height = Math.max(1, Math.round(sh * ratio));
    output.getContext('2d')?.drawImage(image, sx, sy, sw, sh, 0, 0, output.width, output.height);
    output.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-4">
        <p className="text-sm font-medium">Ajustar foto</p>
        <canvas
          ref={canvasRef}
          width={view}
          height={view}
          className="mt-3 w-full cursor-grab touch-none rounded-xl"
          onPointerDown={(event) => {
            drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
          }}
          onPointerUp={() => { drag.current = null; }}
        />
        <label className="mt-3 block text-xs text-muted-foreground">
          Zoom
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-1 w-full" />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className="rounded-full px-3 py-1.5 text-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={confirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};
