import { useEffect, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

const HANDLE_ID = 'unica-page-scroll-handle';

function scrollingTarget() {
  const page = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  if (page.scrollHeight > page.clientHeight + 12) return page;
  const mains = [...document.querySelectorAll('main')];
  const overflowing = mains.find((node) => node.scrollHeight > node.clientHeight + 12);
  if (overflowing) return overflowing;
  return page;
}

export const PageScrollHandle: FC = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  function grab(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const el = scrollingTarget();
    event.preventDefault();
    const startY = event.clientY;
    const startScroll = el.scrollTop;
    const move = (next: PointerEvent) => {
      el.scrollTop = startScroll + (next.clientY - startY) * 1.65;
    };
    const stop = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', stop, true);
      window.removeEventListener('pointercancel', stop, true);
    };
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', stop, true);
    window.addEventListener('pointercancel', stop, true);
  }

  if (!ready || typeof document === 'undefined') return null;

  return createPortal(
    <button
      id={HANDLE_ID}
      type="button"
      aria-label="Arrastar para rolar a tela"
      className="unica-page-scroll-handle"
      style={{ position: 'fixed', top: 'unset', left: 'unset', right: 8, bottom: 16, margin: 0, transform: 'none', width: 76, height: 8 }}
      onPointerDown={grab}
    />,
    document.body,
  );
};
