import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Headphones, Minus } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent } from 'react';
import { useLocation } from 'react-router-dom';

const POS_KEY = 'unica-support-pos';
const MIN_KEY = 'unica-support-min';

function readPos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
    if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) return parsed;
  } catch {
    /* usa o canto padrão */
  }
  return null;
}

export const FloatingHelpButton: FC = () => {
  const home = useLocation().pathname === '/';
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [minimized, setMinimized] = useState(() => localStorage.getItem(MIN_KEY) === '1');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(readPos);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const node = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openFeedback = () => {
      setMinimized(false);
      setOpen(true);
    };
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

  useEffect(() => {
    localStorage.setItem(MIN_KEY, minimized ? '1' : '0');
  }, [minimized]);

  function clamp(next: { x: number; y: number }) {
    const width = node.current?.offsetWidth ?? 56;
    const height = node.current?.offsetHeight ?? 56;
    return {
      x: Math.max(8, Math.min(window.innerWidth - width - 8, next.x)),
      y: Math.max(8, Math.min(window.innerHeight - height - 8, next.y)),
    };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    moved.current = false;
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 6) {
      drag.current.moved = true;
      moved.current = true;
    }
    if (!drag.current.moved) return;
    const next = clamp({ x: drag.current.left + dx, y: drag.current.top + dy });
    setPos(next);
    localStorage.setItem(POS_KEY, JSON.stringify(next));
  }

  function onPointerUp() {
    drag.current = null;
  }

  const placed = Boolean(pos);

  return (
    <>
      <div
        ref={node}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { onPointerUp(); }}
        className={home ? 'fixed z-30 hidden' : 'fixed z-30 touch-none'}
        style={placed ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : { right: 24, bottom: 96 }}
      >
        {minimized ? (
          <button
            type="button"
            aria-label="Mostrar suporte"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-primary bg-background/90 px-3 text-[12px] font-medium text-foreground shadow-md"
            onClick={() => {
              if (moved.current) return;
              setMinimized(false);
            }}
          >
            <Headphones className="h-3.5 w-3.5" />
            Suporte
          </button>
        ) : (
          <div className="relative">
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="relative h-14 w-14 rounded-full border-primary bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-accent hover:text-foreground hover:shadow-lg"
                  aria-label="Suporte"
                  onClick={() => {
                    if (moved.current) return;
                    setTooltipOpen(false);
                    setOpen(true);
                  }}
                >
                  <Headphones size={24} style={{ width: '24px', height: '24px' }} className="text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Suporte · arraste ou minimize</TooltipContent>
            </Tooltip>
            <button
              type="button"
              aria-label="Minimizar suporte"
              className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm"
              onClick={(event) => {
                event.stopPropagation();
                setTooltipOpen(false);
                setMinimized(true);
              }}
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
