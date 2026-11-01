import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Headphones } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

const POS_KEY = 'unica-support-pos';
const DOCK_KEY = 'unica-support-dock';
const SIZE = 56;
const TUCK = 48;
const GAP = 8;

type Edge = 'left' | 'right' | 'top' | 'bottom';
type Dock = { edge: Edge; along: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readPos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
    if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    if (parsed.x < 0 || parsed.y < 0 || parsed.x > window.innerWidth - SIZE || parsed.y > window.innerHeight - SIZE) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readDock(): Dock | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(DOCK_KEY) ?? 'null') as Dock | null;
    if (!parsed || !Number.isFinite(parsed.along)) return null;
    if (parsed.edge !== 'left' && parsed.edge !== 'right' && parsed.edge !== 'top' && parsed.edge !== 'bottom') return null;
    return parsed;
  } catch {
    return null;
  }
}

function thrownOff(x: number, y: number, width: number, height: number): Edge | null {
  const overflow: [Edge, number][] = [
    ['left', -x],
    ['right', x + width - window.innerWidth],
    ['top', -y],
    ['bottom', y + height - window.innerHeight],
  ];
  overflow.sort((a, b) => b[1] - a[1]);
  const [edge, amount] = overflow[0];
  if (amount < Math.min(width, height) * 0.4) return null;
  return edge;
}

function alongFor(edge: Edge, x: number, y: number) {
  if (edge === 'left' || edge === 'right') return clamp(y, 8, window.innerHeight - TUCK - 8);
  return clamp(x, 8, window.innerWidth - TUCK - 8);
}

function place(minimized: boolean, dock: Dock | null, pos: { x: number; y: number } | null): CSSProperties {
  if (minimized && dock) {
    const along = alongFor(dock.edge, dock.edge === 'top' || dock.edge === 'bottom' ? dock.along : 0, dock.edge === 'left' || dock.edge === 'right' ? dock.along : 0);
    if (dock.edge === 'left') return { left: GAP, top: along };
    if (dock.edge === 'right') return { left: window.innerWidth - TUCK - GAP, top: along };
    if (dock.edge === 'top') return { top: GAP, left: along };
    return { top: window.innerHeight - TUCK - GAP, left: along };
  }
  if (pos) return { left: pos.x, top: pos.y };
  return { right: 20, bottom: 20 };
}

function insideFrom(dock: Dock) {
  const along = alongFor(dock.edge, dock.along, dock.along);
  if (dock.edge === 'left') return { x: 12, y: along };
  if (dock.edge === 'right') return { x: window.innerWidth - SIZE - 12, y: along };
  if (dock.edge === 'top') return { x: along, y: 12 };
  return { x: along, y: window.innerHeight - SIZE - 12 };
}

export const FloatingHelpButton: FC = () => {
  const initialDock = readDock();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(Boolean(initialDock));
  const [dock, setDock] = useState<Dock | null>(initialDock);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(readPos);
  const node = useRef<HTMLDivElement>(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    const openFeedback = () => {
      setMinimized(false);
      setDock(null);
      localStorage.removeItem(DOCK_KEY);
      setOpen(true);
    };
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

  useEffect(() => {
    if (!minimized) return;
    const redraw = () => setFrame((value) => value + 1);
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, [minimized]);

  function savePos(next: { x: number; y: number }) {
    setPos(next);
    localStorage.setItem(POS_KEY, JSON.stringify(next));
  }

  function park(next: Dock) {
    setDock(next);
    setMinimized(true);
    localStorage.setItem(DOCK_KEY, JSON.stringify(next));
  }

  function restore(next: { x: number; y: number }) {
    setMinimized(false);
    setDock(null);
    localStorage.removeItem(DOCK_KEY);
    savePos(next);
  }

  function grab(event: ReactPointerEvent<HTMLButtonElement>, openOnClick: boolean) {
    if (event.button !== 0 || !node.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = node.current.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const width = rect.width;
    const height = rect.height;
    let moved = false;
    let ended = false;
    let latest = { x: rect.left, y: rect.top };

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) < 3) return;
      moved = true;
      latest = {
        x: clamp(rect.left + dx, -width + 16, window.innerWidth - 16),
        y: clamp(rect.top + dy, -height + 16, window.innerHeight - 16),
      };
      const el = node.current;
      if (!el) return;
      el.style.transition = 'none';
      el.style.left = `${latest.x}px`;
      el.style.top = `${latest.y}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };
    const up = () => {
      if (ended) return;
      ended = true;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      if (node.current) node.current.style.transition = '';
      if (!moved) {
        if (openOnClick) setOpen(true);
        else restore(dock ? insideFrom(dock) : { x: window.innerWidth - SIZE - 20, y: window.innerHeight - SIZE - 20 });
        return;
      }
      const edge = thrownOff(latest.x, latest.y, width, height);
      if (edge) {
        park({ edge, along: alongFor(edge, latest.x, latest.y) });
        return;
      }
      restore({
        x: clamp(latest.x, 8, window.innerWidth - SIZE - 8),
        y: clamp(latest.y, 8, window.innerHeight - SIZE - 8),
      });
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  const button = (
    <div
      ref={node}
      className="fixed z-[100000] touch-none select-none transition-[left,top] duration-200 ease-out"
      style={place(minimized, dock, pos)}
    >
      <button
        type="button"
        aria-label={minimized ? 'Mostrar suporte' : 'Suporte'}
        title={minimized ? 'Toque para abrir' : 'Arraste para fora da tela para recolher'}
        className={minimized
          ? 'grid h-12 w-12 cursor-grab place-items-center rounded-full border-2 border-[#8E35B8] bg-white text-[#6A228C] shadow-lg active:cursor-grabbing'
          : 'grid h-14 w-14 cursor-grab place-items-center rounded-full border-2 border-[#8E35B8] bg-white text-[#6A228C] shadow-lg active:cursor-grabbing'}
        onPointerDown={(event) => grab(event, !minimized)}
      >
        <Headphones className="pointer-events-none h-6 w-6" />
      </button>
    </div>
  );

  return (
    <>
      {typeof document === 'undefined' ? button : createPortal(button, document.body)}
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
