import { useEffect, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

export const PageScrollHandle: FC<{ scroller: HTMLElement | null }> = ({ scroller }) => {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    const pick = () => {
      if (scroller && scroller.scrollHeight > scroller.clientHeight + 12) return scroller;
      const page = document.scrollingElement as HTMLElement | null;
      if (page && page.scrollHeight > page.clientHeight + 12) return page;
      return scroller;
    };
    const check = () => {
      const el = pick();
      setVisible(Boolean(el && el.scrollHeight > el.clientHeight + 12));
    };
    check();
    const observer = new ResizeObserver(check);
    if (scroller) observer.observe(scroller);
    observer.observe(document.documentElement);
    window.addEventListener('resize', check);
    window.addEventListener('scroll', check, { passive: true });
    scroller?.addEventListener('scroll', check, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', check);
      window.removeEventListener('scroll', check);
      scroller?.removeEventListener('scroll', check);
    };
  }, [scroller]);

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

  if (!ready || !visible) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[90] flex justify-center xl:bottom-4">
      <button
        type="button"
        aria-label="Arrastar para rolar a tela"
        className="pointer-events-auto h-1.5 w-[88px] cursor-grab rounded-full bg-[#8A7C98]/55 shadow-[0_1px_6px_rgba(80,40,120,0.18)] active:cursor-grabbing"
        onPointerDown={grab}
      />
    </div>,
    document.body,
  );
};
