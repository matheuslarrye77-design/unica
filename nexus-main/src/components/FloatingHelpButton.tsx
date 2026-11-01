import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Headphones, Minus } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

const POS_KEY = 'unica-support-pos';

function readPos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
    if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    if (parsed.x < 0 || parsed.y < 0 || parsed.x > window.innerWidth - 48 || parsed.y > window.innerHeight - 48) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const FloatingHelpButton: FC = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(readPos);
  const node = useRef<HTMLDivElement>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    const openFeedback = () => {
      setMinimized(false);
      setOpen(true);
    };
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

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
        x: Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + dx)),
        y: Math.max(8, Math.min(window.innerHeight - height - 8, rect.top + dy)),
      };
      const el = node.current;
      if (!el) return;
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
      skipClick.current = moved;
      if (moved) {
        setPos(latest);
        localStorage.setItem(POS_KEY, JSON.stringify(latest));
        return;
      }
      if (openOnClick) setOpen(true);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  const button = (
    <div
      ref={node}
      className="fixed z-[100000] touch-none select-none"
      style={pos ? { left: pos.x, top: pos.y } : { right: 20, bottom: 20 }}
    >
      {minimized ? (
        <button
          type="button"
          aria-label="Mostrar suporte"
          className="inline-flex h-10 cursor-grab items-center gap-1.5 rounded-full border-2 border-[#8E35B8] bg-white px-3 text-[13px] font-semibold text-[#6A228C] shadow-lg active:cursor-grabbing"
          onPointerDown={(event) => grab(event, false)}
          onClick={() => {
            if (skipClick.current) {
              skipClick.current = false;
              return;
            }
            setMinimized(false);
          }}
        >
          <Headphones className="pointer-events-none h-4 w-4" />
          Suporte
        </button>
      ) : (
        <div className="flex items-start gap-1">
          <button
            type="button"
            aria-label="Suporte"
            title="Segure e arraste"
            className="grid h-14 w-14 cursor-grab place-items-center rounded-full border-2 border-[#8E35B8] bg-white text-[#6A228C] shadow-lg active:cursor-grabbing"
            onPointerDown={(event) => grab(event, true)}
          >
            <Headphones className="pointer-events-none h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Minimizar suporte"
            title="Minimizar"
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#8E35B8] bg-white text-[#6A228C] shadow-md"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMinimized(true)}
          >
            <Minus className="pointer-events-none h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {typeof document === 'undefined' ? button : createPortal(button, document.body)}
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
