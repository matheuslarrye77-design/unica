import { actor } from '@/lib/session';
import { saveMood, useInstitution } from '@/lib/institution';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { useRef, useState, type FC, type PointerEvent } from 'react';

export const MOODS = [
  { id: 'sobrecarregado', emoji: '😮‍💨', label: 'Sobrecarregado' },
  { id: 'cabisbaixo', emoji: '😔', label: 'Cabisbaixo' },
  { id: 'cansado', emoji: '😴', label: 'Cansado' },
  { id: 'neutro', emoji: '😐', label: 'Neutro' },
  { id: 'feliz', emoji: '😊', label: 'Feliz' },
  { id: 'motivado', emoji: '🚀', label: 'Motivado' },
] as const;

const others = [
  { id: 'ana', name: 'Ana Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
  { id: 'joao', name: 'João Ferreira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao' },
  { id: 'caio', name: 'Caio Mendes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Caio' },
  { id: 'marina', name: 'Marina Costa', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina' },
  { id: 'helena', name: 'Helena Duarte', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Helena' },
];

const moodTone: Record<string, { label: string; className: string }> = {
  '🚀': { label: 'Motivado', className: 'bg-[var(--unica-positive)] text-[#1E7A46]' },
  '😊': { label: 'Feliz', className: 'bg-[var(--unica-positive)] text-[#1E7A46]' },
  '😐': { label: 'Normal', className: 'bg-[var(--unica-neutral)] text-[#8A6412]' },
  '😴': { label: 'Cansado', className: 'bg-[var(--unica-alert)] text-[#9A3D66]' },
  '😔': { label: 'Cabisbaixo', className: 'bg-[var(--unica-alert)] text-[#9A3D66]' },
  '😮‍💨': { label: 'Sobrecarregado', className: 'bg-[var(--unica-neutral)] text-[#8A6412]' },
};

function scrollRail(element: HTMLDivElement | null, direction: -1 | 1) {
  element?.scrollBy({ left: direction * 140, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

export const TeamMood: FC = () => {
  const user = actor();
  const team = [{ id: user.id, name: user.name, avatar: user.avatar }, ...others.filter((person) => person.id !== user.id)];
  const { moods } = useInstitution();
  const mine = moods[user.id];
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, left: 0 });

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
    <section className="unica-surface shrink-0 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span className="unica-icon">
            <Smile className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          Humor da equipe
        </h2>
        <div className="flex items-center">
          <button type="button" aria-label="Anterior" className="flex h-6 w-6 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-[#F1EAFE]" onClick={() => scrollRail(scroller.current, -1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Próximo" className="flex h-6 w-6 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-[#F1EAFE]" onClick={() => scrollRail(scroller.current, 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current.active = false; }}
        onPointerCancel={() => { drag.current.active = false; }}
        className="mt-1.5 flex cursor-grab gap-2 overflow-x-auto pb-0.5 active:cursor-grabbing"
      >
        {team.map((person) => {
          const emoji = moods[person.id];
          const tone = emoji ? moodTone[emoji] : undefined;
          const first = person.name.split(' ')[0];
          const self = person.id === user.id;
          const portrait = (
            <div className="relative mx-auto h-9 w-9">
              <img src={person.avatar} alt="" className="h-9 w-9 rounded-full bg-muted object-cover ring-2 ring-[#F1EAFE]" />
              {emoji ? (
                <span className="mood-emoji absolute -right-1 -bottom-1 rounded-full bg-card px-0.5 text-[13px] leading-none ring-1 ring-border">{emoji}</span>
              ) : self ? (
                <span className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card text-[10px] leading-none text-muted-foreground ring-1 ring-border">+</span>
              ) : null}
            </div>
          );
          const caption = (
            <>
              <span className="mt-1 block max-w-[64px] truncate text-[11px] leading-4">{first}</span>
              {tone ? <span className={cn('mt-0.5 inline-flex rounded-full px-1.5 py-0 text-[10px] font-medium leading-4', tone.className)}>{tone.label}</span> : <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">—</span>}
            </>
          );
          return (
            <div key={person.id} className="w-[64px] shrink-0 text-center">
              {self ? (
                <button type="button" data-mood-self className="w-full" aria-label={mine ? 'Alterar humor' : 'Definir humor'} onClick={() => setOpen((value) => !value)}>
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
      {open ? (
        <div className="mt-2 rounded-[12px] border border-border bg-background p-1">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => {
                void saveMood(mood.emoji);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[13px]',
                mine === mood.emoji ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span className="mood-emoji" aria-hidden>{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};
