import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Headphones, Minus } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

const POS_KEY = 'unica-support-pos';

function readPos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
    if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    if (parsed.x < 0 || parsed.y < 0 || parsed.x > window.innerWidth - 40 || parsed.y > window.innerHeight - 40) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const FloatingHelpButton: FC = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(readPos);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openFeedback = () => {
      setMinimized(false);
      setOpen(true);
    };
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

  function place() {
    const rect = node.current?.getBoundingClientRect();
    return { left: rect?.left ?? pos?.x ?? window.innerWidth - 80, top: rect?.top ?? pos?.y ?? window.innerHeight - 80 };
  }

  function clamp(next: { x: number; y: number }) {
    const width = node.current?.offsetWidth ?? 56;
    const height = node.current?.offsetHeight ?? 56;
    return {
      x: Math.max(8, Math.min(window.innerWidth - width - 8, next.x)),
      y: Math.max(8, Math.min(window.innerHeight - height - 8, next.y)),
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const current = place();
    drag.current = { x: event.clientX, y: event.clientY, left: current.left, top: current.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.hypot(dx, dy) < 4) return;
    drag.current.moved = true;
    const next = clamp({ x: drag.current.left + dx, y: drag.current.top + dy });
    setPos(next);
  }

  function onPointerUp(openAfter: boolean) {
    const moved = Boolean(drag.current?.moved);
    dragged.current = moved;
    if (moved && node.current) {
      const rect = node.current.getBoundingClientRect();
      const next = clamp({ x: rect.left, y: rect.top });
      setPos(next);
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    }
    drag.current = null;
    if (!moved && openAfter) setOpen(true);
  }

  const placed = Boolean(pos);
  const button = (
    <div
      ref={node}
      className="fixed z-[90] touch-none select-none"
      style={placed ? { left: pos.x, top: pos.y } : { right: 20, bottom: 20 }}
    >
      {minimized ? (
        <button
          type="button"
          aria-label="Mostrar suporte"
          className="inline-flex h-9 cursor-grab items-center gap-1.5 rounded-full border border-[#8E35B8] bg-white px-3 text-[12px] font-semibold text-[#6A228C] shadow-lg active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => onPointerUp(false)}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setMinimized(false);
          }}
        >
          <Headphones className="h-3.5 w-3.5" />
          Suporte
        </button>
      ) : (
        <div className="relative">
          <button
            type="button"
            aria-label="Suporte"
            title="Arraste para mover"
            className="grid h-14 w-14 cursor-grab place-items-center rounded-full border border-[#8E35B8] bg-white text-[#6A228C] shadow-lg active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => onPointerUp(true)}
          >
            <Headphones className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="Minimizar suporte"
            className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[#E7DFF0] bg-white text-[#6A228C] shadow-sm"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMinimized(true)}
          >
            <Minus className="h-3.5 w-3.5" />
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
