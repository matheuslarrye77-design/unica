import { EmojiText } from '@/components/Emoji';
import { createContext, useContext, useLayoutEffect, useRef, useState, type FC, type MouseEvent, type ReactNode } from 'react';

type Expand = { id: string | null; setId: (id: string | null) => void };

const ExpandContext = createContext<Expand | null>(null);

export const ExpandProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [id, setId] = useState<string | null>(null);
  return <ExpandContext.Provider value={{ id, setId }}>{children}</ExpandContext.Provider>;
};

export function useExpand() {
  return useContext(ExpandContext);
}

export const ReadMore: FC<{ id: string; text: string; className?: string; prefix?: ReactNode }> = ({ id, text, className, prefix }) => {
  const expand = useContext(ExpandContext);
  const [local, setLocal] = useState(false);
  const open = expand ? expand.id === id : local;
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      if (open) return;
      const clone = node.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.pointerEvents = 'none';
      clone.style.width = `${node.getBoundingClientRect().width}px`;
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.display = 'block';
      clone.style.webkitLineClamp = 'unset';
      clone.classList.remove('line-clamp-4');
      node.parentElement?.appendChild(clone);
      const full = clone.getBoundingClientRect().height;
      clone.remove();
      setOverflows(full > node.getBoundingClientRect().height + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, open]);

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    const next = open ? null : id;
    if (expand) expand.setId(next);
    else setLocal(Boolean(next));
  }

  return (
    <div>
      <p ref={ref} className={`whitespace-pre-line ${open ? '' : 'line-clamp-4'} ${className ?? ''}`}>
        {prefix}<EmojiText text={text} />
      </p>
      {overflows ? (
        <button type="button" className="mt-1 text-[13px] font-semibold text-[#8E35B8] hover:underline" onClick={toggle}>
          {open ? 'Ler menos' : 'Ler mais'}
        </button>
      ) : null}
    </div>
  );
};
