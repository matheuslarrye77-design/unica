import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useSyncExternalStore, useRef, useState, type FC, type PointerEvent } from 'react';

const STORAGE_KEY = 'unica-moods';

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

const listeners = new Set<() => void>();
let snapshot = readStored();

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function saveMood(userId: string, emoji: string) {
  const current = parseMoods(snapshot);
  current[userId] = emoji;
  snapshot = JSON.stringify(current);
  localStorage.setItem(STORAGE_KEY, snapshot);
  listeners.forEach((listener) => listener());
}

function parseMoods(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const TeamMood: FC = () => {
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => '{}');
  const moods = parseMoods(stored);
  const mine = moods[currentUser.id];
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, left: 0 });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
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
          return (
            <div key={person.id} className="w-14 shrink-0 text-center">
              <div className="relative mx-auto h-14 w-14">
                <img src={person.avatar} alt="" className="h-14 w-14 rounded-full bg-muted object-cover" />
                {emoji ? (
                  <span className="absolute -right-1.5 -bottom-1 rounded-full bg-card px-0.5 text-sm leading-none ring-1 ring-border">{emoji}</span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-xs">{first}</p>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-3 w-full rounded-lg border px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      >
        Definir meu humor
      </button>
      {open ? (
        <div className="mt-2 rounded-xl border bg-background p-1">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => {
                saveMood(currentUser.id, mood.emoji);
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
