import { useEffect, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

export const PageScrollHandle: FC<{ scroller: HTMLElement | null }> = ({ scroller }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  function grab(event: ReactPointerEvent<HTMLButtonElement>) {
    const el = scroller && scroller.scrollHeight > scroller.clientHeight + 12
      ? scroller
      : document.scrollingElement as HTMLElement | null;
    if (!el || event.button !== 0) return;
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

  if (!ready) return null;

  return createPortal(
    <button
      type="button"
      aria-label="Arrastar para rolar a tela"
      className="fixed right-3 bottom-3 z-[100001] h-2 w-[76px] cursor-grab rounded-full bg-[#8A7C98]/70 shadow-[0_1px_8px_rgba(80,40,120,0.22)] active:cursor-grabbing"
      onPointerDown={grab}
    />,
    document.body,
  );
};
