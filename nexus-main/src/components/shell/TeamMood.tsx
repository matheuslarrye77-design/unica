import { Emoji } from '@/components/Emoji';
import { actor } from '@/lib/session';
import { saveMood, useInstitution } from '@/lib/institution';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

export const MOODS = [
  { id: 'sobrecarregado', emoji: '😮‍💨', label: 'Sobrecarregado' },
  { id: 'cabisbaixo', emoji: '😔', label: 'Cabisbaixo' },
  { id: 'cansado', emoji: '😴', label: 'Cansado' },
  { id: 'neutro', emoji: '😐', label: 'Neutro' },
  { id: 'feliz', emoji: '😊', label: 'Feliz' },
  { id: 'motivado', emoji: '🚀', label: 'Motivado' },
] as const;

const faces = [
  { id: 'matheus', name: 'Matheus', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Matheus', emoji: '🚀' },
  { id: 'ana', name: 'Ana', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaMood', emoji: '😐' },
  { id: 'joao', name: 'João', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JoaoMood', emoji: '😊' },
  { id: 'caio', name: 'Caio', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CaioMood', emoji: '😴' },
  { id: 'helena', name: 'Helena', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HelenaMood', emoji: '😊' },
  { id: 'lucas', name: 'Lucas', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LucasMood', emoji: '😔' },
  { id: 'livia', name: 'Lívia', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LiviaMood', emoji: '😮‍💨' },
];

const moodTone: Record<string, { label: string; className: string }> = {
  '🚀': { label: 'Motivado', className: 'bg-[var(--unica-positive)] text-[#1E7A46]' },
  '😊': { label: 'Feliz', className: 'bg-[var(--unica-positive)] text-[#1E7A46]' },
  '🙂': { label: 'Bem', className: 'bg-[var(--unica-positive)] text-[#1E7A46]' },
  '😐': { label: 'Normal', className: 'bg-[var(--unica-neutral)] text-[#8A6412]' },
  '😴': { label: 'Cansado', className: 'bg-[var(--unica-alert)] text-[#9A3D66]' },
  '😔': { label: 'Cabisbaixo', className: 'bg-[var(--unica-alert)] text-[#9A3D66]' },
  '😮‍💨': { label: 'Sobrecarregado', className: 'bg-[var(--unica-neutral)] text-[#8A6412]' },
};

function scrollRail(element: HTMLDivElement | null, direction: -1 | 1) {
  if (!element) return;
  const distance = Math.max(element.clientWidth - 24, 96);
  element.scrollBy({ left: direction * distance, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export const TeamMood: FC = () => {
  const user = actor();
  const team = faces.map((person) => person.id === 'matheus' ? { ...person, id: user.id, avatar: user.avatar || person.avatar } : person);
  const { moods } = useInstitution();
  const [picked, setPicked] = useState<string | null>(null);
  const mine = picked ?? moods[user.id];
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, left: 0 });

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const sync = () => {
      const count = Math.max(1, Math.ceil(element.scrollWidth / element.clientWidth));
      const index = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1));
      setPages(count);
      setPage(Math.min(index, count - 1));
    };
    sync();
    element.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      element.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [team.length]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-mood-self]')) return;
    const element = scroller.current;
    if (!element) return;
    drag.current = { active: true, x: event.clientX, left: element.scrollLeft };
    element.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = scroller.current;
    if (!element || !drag.current.active) return;
    element.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
  }

  return (
    <section className="unica-surface shrink-0 overflow-visible px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <span className="unica-icon">
            <Smile className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Humor da equipe
        </h2>
        <div className="flex items-center">
          <button type="button" aria-label="Anterior" className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent" onClick={() => scrollRail(scroller.current, -1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Próximo" className="flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent" onClick={() => scrollRail(scroller.current, 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative mt-0.5 pt-[4.75rem]">
        {page === 0 ? (
          <span className="pointer-events-none absolute top-0 left-0 z-20 w-1/4 px-0.5">
            <span className="block rounded-[16px_18px_14px_18px] border border-[#E7C8F2] bg-[#FBF6FC] px-1.5 py-1 text-center text-[9px] font-medium leading-[1.15] text-primary shadow-[0_4px_12px_rgba(142,53,184,0.08)]">
              defina seu humor de hoje
            </span>
            <span className="absolute top-full left-1/2 mt-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-[#D7A8E8] bg-[#F6E9FA]" />
            <span className="absolute top-[calc(100%+14px)] left-[38%] h-1.5 w-1.5 rounded-full border border-[#D7A8E8] bg-[#F6E9FA]" />
          </span>
        ) : null}
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current.active = false; }}
        onPointerCancel={() => { drag.current.active = false; }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {team.map((person) => {
          const self = person.id === user.id;
          const emoji = (self ? mine : moods[person.id]) || person.emoji;
          const tone = moodTone[emoji] ?? { label: 'Humor', className: 'bg-muted text-muted-foreground' };
          const first = person.name.split(' ')[0];
          const label = tone.label;
          const toneClass = tone.className;
          const portrait = (
            <div className="relative mx-auto h-10 w-10">
              <img src={person.avatar} alt="" className="h-10 w-10 rounded-full bg-muted object-cover ring-2 ring-white" />
              <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                <Emoji emoji={emoji} className="h-3.5 w-3.5" />
              </span>
              {self ? (
                <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[12px] font-bold leading-none text-white ring-2 ring-white">+</span>
              ) : null}
            </div>
          );
          const caption = (
            <>
              <span className="mt-1 block max-w-[72px] truncate text-[12px] leading-4">{first}</span>
              <span className={cn('mt-0.5 inline-flex max-w-full truncate rounded-full px-1.5 py-0 text-[10px] font-medium leading-4', toneClass)}>{label}</span>
            </>
          );
          return (
            <div key={person.id} className="w-1/4 shrink-0 snap-start text-center">
              {self ? (
                <button
                  type="button"
                  data-mood-self
                  className="w-full"
                  aria-label={mine ? 'Alterar humor' : 'Definir humor'}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setAnchor({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - 188)) });
                    setOpen((value) => !value);
                  }}
                >
                  {portrait}
                  {caption}
                </button>
              ) : (
                <>
                  {portrait}
                  {caption}
                </>
              )}
            </div>
          );
        })}
      </div>
      </div>
      <div className="mt-1.5 flex justify-center gap-1" aria-hidden>
        {Array.from({ length: pages }, (_, index) => (
          <span key={index} className={cn('h-1.5 w-1.5 rounded-full', index === page ? 'bg-primary' : 'bg-[#D9D4E6]')} />
        ))}
      </div>
      {open && anchor ? createPortal(
        <>
          <button type="button" aria-label="Fechar humor" className="fixed inset-0 z-[70] cursor-default" onClick={() => setOpen(false)} />
          <div className="fixed z-[80] w-44 rounded-[12px] border border-border bg-background p-1 shadow-lg" style={{ top: anchor.top, left: anchor.left }}>
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={() => {
                  setPicked(mood.emoji);
                  setOpen(false);
                  void saveMood(mood.emoji).then(() => setPicked(null)).catch(() => undefined);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px]',
                  mine === mood.emoji ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Emoji emoji={mood.emoji} className="h-4 w-4" />
                {mood.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      ) : null}
    </section>
  );
};
