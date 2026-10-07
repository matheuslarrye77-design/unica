import { currentUser } from '@/data/mockData';
import { saveMood, useInstitution } from '@/lib/institution';
import { cn } from '@/lib/utils';
import { useRef, useState, type FC, type PointerEvent } from 'react';

export const MOODS = [
  { id: 'sobrecarregado', emoji: '😮‍💨', label: 'Sobrecarregado' },
  { id: 'cabisbaixo', emoji: '😔', label: 'Cabisbaixo' },
  { id: 'cansado', emoji: '😴', label: 'Cansado' },
  { id: 'neutro', emoji: '😐', label: 'Neutro' },
  { id: 'feliz', emoji: '😊', label: 'Feliz' },
  { id: 'motivado', emoji: '🚀', label: 'Motivado' },
] as const;

const team = [
  { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
  { id: 'ana', name: 'Ana Santos', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
  { id: 'joao', name: 'João Ferreira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao' },
  { id: 'caio', name: 'Caio Mendes', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Caio' },
  { id: 'marina', name: 'Marina Costa', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina' },
  { id: 'helena', name: 'Helena Duarte', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Helena' },
];

export const TeamMood: FC = () => {
  const { moods } = useInstitution();
  const mine = moods[currentUser.id];
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
    <section className="shrink-0 rounded-2xl border bg-card p-3">
      <h2 className="px-1 text-sm font-semibold">Humor da equipe</h2>
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current.active = false; }}
        onPointerCancel={() => { drag.current.active = false; }}
        className="mt-3 flex cursor-grab gap-3 overflow-x-auto px-1 pb-1 active:cursor-grabbing"
      >
        {team.map((person) => {
          const emoji = moods[person.id];
          const first = person.name.split(' ')[0];
          const mine = person.id === currentUser.id;
          const portrait = (
            <div className="relative mx-auto h-14 w-14">
              <img src={person.avatar} alt="" className="h-14 w-14 rounded-full bg-muted object-cover" />
              {emoji ? (
                <span className="absolute -right-1.5 -bottom-1 rounded-full bg-card px-0.5 text-sm leading-none ring-1 ring-border">{emoji}</span>
              ) : mine ? (
                <span className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card text-[10px] leading-none text-muted-foreground ring-1 ring-border">+</span>
              ) : null}
            </div>
          );
          return (
            <div key={person.id} className="w-14 shrink-0 text-center">
              {mine ? (
                <button type="button" data-mood-self className="w-full" aria-label="Definir meu humor" onClick={() => setOpen((value) => !value)}>
                  {portrait}
                </button>
              ) : portrait}
              <p className="mt-1 truncate text-xs">{first}</p>
            </div>
          );
        })}
      </div>
      {open ? (
        <div className="mt-2 rounded-xl border bg-background p-1">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => {
                void saveMood(mood.emoji);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                mine === mood.emoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
};
