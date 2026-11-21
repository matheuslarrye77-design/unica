import { Crop, Droplets, FlipHorizontal2, RotateCw, Search } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

type Shape = 'free' | 'circle' | 'round' | 'square' | 'banner';
type Tool = 'zoom' | 'crop' | 'rot' | 'flip' | 'op';
type Box = { x: number; y: number; w: number; h: number };

type Editor = {
  img: HTMLImageElement | null;
  S: number;
  M: number;
  C: number;
  z: number;
  tx: number;
  ty: number;
  rot: number;
  fx: number;
  fy: number;
  op: number;
  shape: Shape;
  locked: boolean;
  R: Box;
  drag: boolean;
  hd: string | null;
};

const TOOLS: { id: Tool; name: string; icon: typeof Search }[] = [
  { id: 'zoom', name: 'Zoom', icon: Search },
  { id: 'crop', name: 'Cortar', icon: Crop },
  { id: 'rot', name: 'Girar', icon: RotateCw },
  { id: 'flip', name: 'Inverter', icon: FlipHorizontal2 },
  { id: 'op', name: 'Opacidade', icon: Droplets },
];

const SHAPES: { id: Exclude<Shape, 'banner'>; name: string; radius: string; dashed?: boolean }[] = [
  { id: 'free', name: 'Livre', radius: '3px', dashed: true },
  { id: 'circle', name: 'Círculo', radius: '50%' },
  { id: 'round', name: 'Arredondado', radius: '4px' },
  { id: 'square', name: 'Quadrado', radius: '0' },
];

const OPACITY = [1, 0.8, 0.6, 0.4, 0.2];
const HANDLES: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

function lockedShape(lock?: string, banner?: boolean): Shape | null {
  if (banner || lock === 'faixa') return 'banner';
  if (lock === 'circular') return 'circle';
  return null;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function shapePath(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, shape: Shape) {
  if (shape === 'circle') {
    const diameter = Math.min(w, h);
    const cx = x + w / 2;
    const cy = y + h / 2;
    context.moveTo(cx + diameter / 2, cy);
    context.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
    context.closePath();
    return;
  }
  const radius = shape === 'round' || shape === 'banner' ? Math.min(w, h) * 0.2 : 0;
  roundRect(context, x, y, w, h, radius);
}

function square(editor: Editor): Box {
  return { x: editor.M, y: editor.M, w: editor.C, h: editor.C };
}

function bannerBox(editor: Editor): Box {
  const height = Math.max(44, editor.C / (1400 / 320));
  return { x: editor.M, y: editor.M + (editor.C - height) / 2, w: editor.C, h: height };
}

function frameFor(editor: Editor) {
  return editor.shape === 'banner' ? bannerBox(editor) : square(editor);
}

function dimensions(editor: Editor) {
  const image = editor.img;
  if (!image) return { base: 1, w: 1, h: 1 };
  const turned = editor.rot % 2;
  const sourceWidth = turned ? image.naturalHeight : image.naturalWidth;
  const sourceHeight = turned ? image.naturalWidth : image.naturalHeight;
  const base = editor.C / Math.min(sourceWidth, sourceHeight);
  return { base, w: sourceWidth * base * editor.z, h: sourceHeight * base * editor.z };
}

function clampPan(editor: Editor) {
  const size = dimensions(editor);
  const maxX = Math.max(0, (size.w - editor.C) / 2);
  const maxY = Math.max(0, (size.h - editor.C) / 2);
  editor.tx = Math.min(maxX, Math.max(-maxX, editor.tx));
  editor.ty = Math.min(maxY, Math.max(-maxY, editor.ty));
}

function paintImage(context: CanvasRenderingContext2D, editor: Editor, cx: number, cy: number, scale: number) {
  const image = editor.img;
  if (!image) return;
  const size = dimensions(editor);
  context.save();
  context.translate(cx, cy);
  context.scale(editor.fx, editor.fy);
  context.rotate((editor.rot * Math.PI) / 2);
  const pixel = size.base * editor.z * scale;
  context.scale(pixel, pixel);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  context.restore();
}

function drawHandles(context: CanvasRenderingContext2D, box: Box) {
  const right = box.x + box.w;
  const bottom = box.y + box.h;
  const arm = Math.min(18, box.w / 3, box.h / 3);
  const midX = box.x + box.w / 2;
  const midY = box.y + box.h / 2;
  const mark = Math.min(10, box.w / 6, box.h / 6);
  context.save();
  context.strokeStyle = '#fff';
  context.lineWidth = 3.5;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.shadowColor = 'rgba(0,0,0,.35)';
  context.shadowBlur = 4;
  context.beginPath();
  context.moveTo(box.x, box.y + arm);
  context.lineTo(box.x, box.y);
  context.lineTo(box.x + arm, box.y);
  context.moveTo(right - arm, box.y);
  context.lineTo(right, box.y);
  context.lineTo(right, box.y + arm);
  context.moveTo(right, bottom - arm);
  context.lineTo(right, bottom);
  context.lineTo(right - arm, bottom);
  context.moveTo(box.x + arm, bottom);
  context.lineTo(box.x, bottom);
  context.lineTo(box.x, bottom - arm);
  context.moveTo(midX - mark, box.y);
  context.lineTo(midX + mark, box.y);
  context.moveTo(midX - mark, bottom);
  context.lineTo(midX + mark, bottom);
  context.moveTo(box.x, midY - mark);
  context.lineTo(box.x, midY + mark);
  context.moveTo(right, midY - mark);
  context.lineTo(right, midY + mark);
  context.stroke();
  context.restore();
}

function draw(editor: Editor, context: CanvasRenderingContext2D, darken: boolean) {
  if (!editor.img || !editor.S) return;
  const box = editor.R;
  const cx = editor.S / 2 + editor.tx;
  const cy = editor.S / 2 + editor.ty;
  context.clearRect(0, 0, editor.S, editor.S);
  paintImage(context, editor, cx, cy, 1);
  context.fillStyle = 'rgba(31,27,46,.62)';
  context.beginPath();
  context.rect(0, 0, editor.S, editor.S);
  shapePath(context, box.x, box.y, box.w, box.h, editor.shape);
  context.fill('evenodd');
  context.save();
  context.beginPath();
  shapePath(context, box.x, box.y, box.w, box.h, editor.shape);
  context.clip();
  context.clearRect(0, 0, editor.S, editor.S);
  context.globalAlpha = darken ? 1 : editor.op;
  paintImage(context, editor, cx, cy, 1);
  if (darken && editor.op < 1) {
    context.globalAlpha = 1 - editor.op;
    context.fillStyle = '#000';
    context.fillRect(0, 0, editor.S, editor.S);
  }
  context.restore();
  context.save();
  context.beginPath();
  shapePath(context, box.x, box.y, box.w, box.h, editor.shape);
  context.strokeStyle = 'rgba(255,255,255,.95)';
  context.lineWidth = 1.5;
  context.stroke();
  if (editor.drag) {
    context.clip();
    context.strokeStyle = 'rgba(255,255,255,.55)';
    context.lineWidth = 1;
    context.beginPath();
    for (let index = 1; index < 3; index += 1) {
      const px = box.x + (box.w * index) / 3;
      const py = box.y + (box.h * index) / 3;
      context.moveTo(px, box.y);
      context.lineTo(px, box.y + box.h);
      context.moveTo(box.x, py);
      context.lineTo(box.x + box.w, py);
    }
    context.stroke();
  }
  context.restore();
  if (editor.shape === 'free') drawHandles(context, box);
}

function blankEditor(shape: Shape): Editor {
  return { img: null, S: 0, M: 0, C: 0, z: 1, tx: 0, ty: 0, rot: 0, fx: 1, fy: 1, op: 1, shape, locked: shape === 'circle' || shape === 'banner', R: { x: 0, y: 0, w: 0, h: 0 }, drag: false, hd: null };
}

export const ImageCrop: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void; banner?: boolean; darken?: boolean; lock?: string }> = ({ file, onCancel, onConfirm, banner, darken = false, lock }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const forced = lockedShape(lock, banner);
  const editor = useRef<Editor>(blankEditor(forced ?? 'free'));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const zoomTimer = useRef<number>(0);
  const [tool, setTool] = useState<Tool>('zoom');
  const [view, setView] = useState({ z: 1, shape: forced ?? 'free' as Shape, fx: 1, fy: 1, op: 1, dragging: false });

  function paint() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    draw(editor.current, context, darken);
  }

  function publish() {
    const current = editor.current;
    setView({ z: current.z, shape: current.shape, fx: current.fx, fy: current.fy, op: current.op, dragging: current.drag });
  }

  function applyZoom(next: number) {
    editor.current.z = Math.min(4, Math.max(1, Math.round(next * 100) / 100));
    clampPan(editor.current);
    publish();
    paint();
  }

  function layout() {
    const canvas = canvasRef.current;
    const current = editor.current;
    if (!canvas || !current.img) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const previous = current.S;
    const size = canvas.clientWidth;
    if (!size) return;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    const context = canvas.getContext('2d');
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    const scale = previous ? size / previous : 1;
    if (previous) {
      current.tx *= scale;
      current.ty *= scale;
    }
    const prior = current.R;
    current.S = size;
    current.M = Math.round(size * 0.045);
    current.C = size - current.M * 2;
    current.R = previous && current.shape === 'free'
      ? { x: prior.x * scale, y: prior.y * scale, w: prior.w * scale, h: prior.h * scale }
      : frameFor(current);
    clampPan(current);
    paint();
  }

  function reset() {
    const current = editor.current;
    current.z = 1;
    current.tx = 0;
    current.ty = 0;
    current.rot = 0;
    current.fx = 1;
    current.fy = 1;
    current.op = 1;
    current.shape = forced ?? 'free';
    current.hd = null;
    if (current.S) current.R = frameFor(current);
    clampPan(current);
    setTool('zoom');
    publish();
    paint();
  }

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let alive = true;
    image.onload = () => {
      if (!alive) return;
      const current = editor.current;
      current.img = image;
      current.shape = forced ?? 'free';
      current.locked = Boolean(forced);
      current.S = 0;
      current.z = 1;
      current.tx = 0;
      current.ty = 0;
      current.rot = 0;
      current.fx = 1;
      current.fy = 1;
      current.op = 1;
      setTool('zoom');
      publish();
      requestAnimationFrame(layout);
    };
    image.onerror = () => {
      toast.error('Formato não suportado. Use uma imagem JPG, PNG ou WebP.');
      onCancel();
    };
    image.src = url;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const observer = stage ? new ResizeObserver(() => layout()) : null;
    if (stage) observer?.observe(stage);
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = editor.current;
      current.z = Math.min(4, Math.max(1, Math.round(current.z * (event.deltaY < 0 ? 1.08 : 1 / 1.08) * 100) / 100));
      clampPan(current);
      const context = canvas?.getContext('2d');
      if (context) draw(current, context, darken);
      setView({ z: current.z, shape: current.shape, fx: current.fx, fy: current.fy, op: current.op, dragging: current.drag });
    };
    canvas?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      alive = false;
      observer?.disconnect();
      canvas?.removeEventListener('wheel', onWheel);
      URL.revokeObjectURL(url);
      window.clearTimeout(zoomTimer.current);
      window.clearInterval(zoomTimer.current);
    };
    // The editor is rebuilt when the file or the locked frame changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, forced]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
      if (event.key === '+' || event.key === '=') applyZoom(editor.current.z + 0.25);
      if (event.key === '-') applyZoom(editor.current.z - 0.25);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds?.width) return { x: 0, y: 0 };
    return { x: ((event.clientX - bounds.left) * editor.current.S) / bounds.width, y: ((event.clientY - bounds.top) * editor.current.S) / bounds.height };
  }

  function hitHandle(x: number, y: number) {
    const box = editor.current.R;
    const reach = 18;
    const right = box.x + box.w;
    const bottom = box.y + box.h;
    const left = Math.abs(x - box.x) <= reach;
    const east = Math.abs(x - right) <= reach;
    const top = Math.abs(y - box.y) <= reach;
    const south = Math.abs(y - bottom) <= reach;
    const insideX = x >= box.x - reach && x <= right + reach;
    const insideY = y >= box.y - reach && y <= bottom + reach;
    if (top && left) return 'nw';
    if (top && east) return 'ne';
    if (south && left) return 'sw';
    if (south && east) return 'se';
    if (top && insideX) return 'n';
    if (south && insideX) return 's';
    if (left && insideY) return 'w';
    if (east && insideY) return 'e';
    return null;
  }

  function resize(handle: string, x: number, y: number) {
    const current = editor.current;
    const min = 44;
    const limit = current.M;
    const rightLimit = current.M + current.C;
    const bottomLimit = current.M + current.C;
    let left = current.R.x;
    let top = current.R.y;
    let right = left + current.R.w;
    let bottom = top + current.R.h;
    if (handle.includes('w')) left = Math.min(Math.max(x, limit), right - min);
    if (handle.includes('e')) right = Math.max(Math.min(x, rightLimit), left + min);
    if (handle.includes('n')) top = Math.min(Math.max(y, limit), bottom - min);
    if (handle.includes('s')) bottom = Math.max(Math.min(y, bottomLimit), top + min);
    current.R = { x: left, y: top, w: right - left, h: bottom - top };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    canvas?.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = editor.current;
    if (pointers.current.size === 1) {
      const spot = point(event);
      current.hd = current.shape === 'free' ? hitHandle(spot.x, spot.y) : null;
    } else current.hd = null;
    current.drag = true;
    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      pinch.current = Math.hypot(first.x - second.x, first.y - second.y);
    }
    publish();
    paint();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const current = editor.current;
    const pointer = pointers.current.get(event.pointerId);
    const canvas = canvasRef.current;
    if (!pointer) {
      if (current.shape === 'free' && canvas && pointers.current.size === 0) {
        const spot = point(event);
        const handle = hitHandle(spot.x, spot.y);
        canvas.style.cursor = handle ? HANDLES[handle] : '';
      }
      return;
    }
    if (pointers.current.size === 1) {
      if (current.hd) {
        const spot = point(event);
        resize(current.hd, spot.x, spot.y);
      } else {
        current.tx += event.clientX - pointer.x;
        current.ty += event.clientY - pointer.y;
        clampPan(current);
      }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      paint();
      return;
    }
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const [first, second] = [...pointers.current.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (pinch.current && distance) applyZoom(current.z * (distance / pinch.current));
    pinch.current = distance;
  }

  function endPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = 0;
    editor.current.hd = null;
    if (pointers.current.size === 0) {
      editor.current.drag = false;
      publish();
      paint();
    }
  }

  function stopZoom() {
    window.clearTimeout(zoomTimer.current);
    window.clearInterval(zoomTimer.current);
  }

  function holdZoom(direction: number) {
    applyZoom(editor.current.z + direction * 0.25);
    stopZoom();
    zoomTimer.current = window.setTimeout(() => {
      zoomTimer.current = window.setInterval(() => applyZoom(editor.current.z + direction * 0.25), 90);
    }, 380);
  }

  function confirm() {
    const current = editor.current;
    if (!current.img || !current.S) return;
    const box = current.R;
    const aspect = box.w / box.h;
    const longest = current.shape === 'circle' ? 512 : current.shape === 'banner' ? 1400 : 1600;
    const width = current.shape === 'banner' ? 1400 : aspect >= 1 ? longest : Math.max(1, Math.round(longest * aspect));
    const height = current.shape === 'banner' ? 320 : aspect >= 1 ? Math.max(1, Math.round(longest / aspect)) : longest;
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const context = output.getContext('2d');
    if (!context) return;
    const scale = width / box.w;
    context.beginPath();
    shapePath(context, 0, 0, width, height, current.shape);
    context.clip();
    context.globalAlpha = darken ? 1 : current.op;
    paintImage(context, current, (current.S / 2 + current.tx - box.x) * scale, (current.S / 2 + current.ty - box.y) * scale, scale);
    if (darken && current.op < 1) {
      context.globalAlpha = 1 - current.op;
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
    }
    const shaped = current.shape === 'circle' || current.shape === 'round' || current.shape === 'banner';
    const type = shaped ? 'image/png' : 'image/jpeg';
    output.toBlob((blob) => {
      if (!blob) {
        toast.error('Não foi possível guardar o ajuste.');
        return;
      }
      const extension = type === 'image/png' ? '.png' : '.jpg';
      onConfirm(new File([blob], file.name.replace(/\.\w+$/, '') + extension, { type }));
    }, type, 0.92);
  }

  const title = forced === 'circle' ? 'Ajustar foto de perfil' : forced === 'banner' ? 'Ajustar capa' : 'Ajustar foto';
  const hint = view.shape === 'free'
    ? 'Arraste as bordas ou cantos para cortar · arraste a foto para posicionar'
    : 'Arraste para posicionar · use dois dedos ou a roda do mouse para dar zoom';
  const tools = TOOLS.filter((item) => item.id !== 'crop' || !forced);

  const overlay = (
    <div data-journal-overlay className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(31,27,46,0.45)] p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="max-h-[calc(100dvh-32px)] w-[min(460px,100%)] overflow-y-auto rounded-[22px] bg-white px-[22px] pt-5 pb-[18px] text-[#1f1b2e] shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" aria-label="Fechar" className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]" onClick={onCancel}>×</button>
        </div>
        <div
          ref={stageRef}
          className={`relative mx-auto aspect-square w-[min(100%,340px,max(200px,calc(100dvh-385px)))] touch-none overflow-hidden rounded-[18px] bg-[linear-gradient(45deg,#e9e6f3_25%,#fff_0_50%,#e9e6f3_0_75%,#fff_0)] bg-[length:16px_16px] shadow-[0_0_0_1px_#e8e4f4] ${view.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          />
        </div>
        <p className="mt-2.5 text-center text-xs text-[#8a85a0] max-[680px]:hidden">{hint}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {tools.map((item) => {
            const Icon = item.icon;
            const active = tool === item.id;
            return (
              <button key={item.id} type="button" className={`flex flex-col items-center gap-1.5 bg-transparent p-[3px] text-[11.5px] font-semibold ${active ? 'text-[#4f33b8]' : 'text-[#8a85a0]'}`} onClick={() => setTool(item.id)}>
                <span className={`grid h-[46px] w-[46px] place-items-center rounded-full ${active ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'bg-white text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#6644e0]'}`}><Icon className="h-5 w-5" /></span>
                {item.name}
              </button>
            );
          })}
        </div>
        <div
          className="mt-3 flex min-h-14 flex-wrap items-center justify-center gap-1.5"
          onPointerUp={stopZoom}
          onPointerLeave={stopZoom}
          onPointerCancel={stopZoom}
        >
          {tool === 'zoom' ? (
            <>
              <button type="button" aria-label="Diminuir zoom" className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#f6f3ff] text-[22px] text-[#6644e0] hover:bg-[#ece6ff] active:scale-95" onPointerDown={() => holdZoom(-1)}>−</button>
              <span className="min-w-[68px] text-center text-base font-bold text-[#4f33b8]">{Math.round(view.z * 100)}%</span>
              <button type="button" aria-label="Aumentar zoom" className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#f6f3ff] text-[22px] text-[#6644e0] hover:bg-[#ece6ff] active:scale-95" onPointerDown={() => holdZoom(1)}>+</button>
              <button type="button" className="inline-flex h-[38px] items-center rounded-full border border-[#e8e4f4] bg-white px-4 text-[13px] font-semibold text-[#4a4560] hover:border-[#d9ccff] hover:bg-[#f6f3ff] hover:text-[#4f33b8]" onClick={() => { editor.current.tx = 0; editor.current.ty = 0; applyZoom(1); }}>Ajustar</button>
            </>
          ) : null}
          {tool === 'crop' && !forced ? SHAPES.map((item) => (
            <button key={item.id} type="button" className={`inline-flex h-[38px] items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold ${view.shape === item.id ? 'border-[#6644e0] bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border-[#e8e4f4] bg-white text-[#4a4560] hover:border-[#d9ccff] hover:bg-[#f6f3ff] hover:text-[#4f33b8]'}`} onClick={() => { editor.current.shape = item.id; editor.current.R = frameFor(editor.current); publish(); paint(); }}>
              <span className="inline-block h-[13px] w-[13px] border-2 border-current" style={{ borderRadius: item.radius, borderStyle: item.dashed ? 'dashed' : 'solid' }} />
              {item.name}
            </button>
          )) : null}
          {tool === 'rot' ? (
            <>
              <button type="button" className="inline-flex h-[38px] items-center rounded-full border border-[#e8e4f4] bg-white px-2.5 text-[12.5px] font-semibold text-[#4a4560] hover:bg-[#f6f3ff]" onClick={() => { editor.current.rot = (editor.current.rot + 3) % 4; clampPan(editor.current); paint(); }}>↺ Girar à esquerda</button>
              <button type="button" className="inline-flex h-[38px] items-center rounded-full border border-[#e8e4f4] bg-white px-2.5 text-[12.5px] font-semibold text-[#4a4560] hover:bg-[#f6f3ff]" onClick={() => { editor.current.rot = (editor.current.rot + 1) % 4; clampPan(editor.current); paint(); }}>↻ Girar à direita</button>
            </>
          ) : null}
          {tool === 'flip' ? (
            <>
              <button type="button" className={`inline-flex h-[38px] items-center rounded-full border px-2.5 text-[12.5px] font-semibold ${view.fx < 0 ? 'border-[#6644e0] bg-[#6644e0] text-white' : 'border-[#e8e4f4] bg-white text-[#4a4560] hover:bg-[#f6f3ff]'}`} onClick={() => { editor.current.fx *= -1; publish(); paint(); }}>⇆ Horizontal</button>
              <button type="button" className={`inline-flex h-[38px] items-center rounded-full border px-2.5 text-[12.5px] font-semibold ${view.fy < 0 ? 'border-[#6644e0] bg-[#6644e0] text-white' : 'border-[#e8e4f4] bg-white text-[#4a4560] hover:bg-[#f6f3ff]'}`} onClick={() => { editor.current.fy *= -1; publish(); paint(); }}>⇅ Vertical</button>
            </>
          ) : null}
          {tool === 'op' ? OPACITY.map((value) => (
            <button key={value} type="button" className={`inline-flex h-[38px] items-center rounded-full border px-2.5 text-[12.5px] font-semibold ${view.op === value ? 'border-[#6644e0] bg-[#6644e0] text-white' : 'border-[#e8e4f4] bg-white text-[#4a4560] hover:bg-[#f6f3ff]'}`} onClick={() => { editor.current.op = value; publish(); paint(); }}>{Math.round(value * 100)}%</button>
          )) : null}
        </div>
        <div className="mt-3.5 flex items-center gap-2 border-t border-[#e8e4f4] pt-3.5">
          <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={reset}>Redefinir</button>
          <span className="flex-1" />
          <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-[11px] bg-[#6644e0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8]" onClick={confirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
};
