import { Emoji } from '@/components/Emoji';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { MOODS } from '@/components/shell/TeamMood';
import { calendarEvents } from '@/data/mockData';
import { teamRoster, type TeamMember } from '@/data/team';
import { canSeeMission, loadActivityStore } from '@/data/activities';
import { parseAgendaDate, useAgendaEvents } from '@/lib/events';
import { saveMood, useInstitution } from '@/lib/institution';
import { actor } from '@/lib/session';
import { cn } from '@/lib/utils';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, Gift, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import { Link } from 'react-router-dom';

const ORDER_KEY = 'unica-avatar-order';
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Person = { id: string; name: string; avatar: string };

function startOfWeek(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const monday = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - monday);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function nextBirthday(month: number, day: number, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const thisYear = new Date(from.getFullYear(), month, day).getTime();
  return thisYear >= start ? thisYear : new Date(from.getFullYear() + 1, month, day).getTime();
}

function readOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const Face: FC<{ person: Person; self?: boolean; mood?: string; gift?: string; onMood?: () => void }> = ({ person, self, mood, gift, onMood }) => {
  const portrait = (
    <span className="relative block h-14 w-14">
      {self ? <Sparkles className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[#6B33F6]" /> : null}
      <img src={person.avatar} alt="" className="h-14 w-14 rounded-full bg-[#EDE7FE] object-cover ring-2 ring-white" />
      {mood ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm">
          <Emoji emoji={mood} className="h-3.5 w-3.5" />
        </span>
      ) : null}
      {gift ? (
        <span className="group/gift absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[#4600F3] ring-2 ring-[#4600F3]">
          <Gift className="h-3 w-3" />
          <span className="pointer-events-none absolute top-6 left-1/2 z-20 hidden w-max -translate-x-1/2 rounded-lg bg-[#1F2937] px-2.5 py-1.5 text-left text-[11px] font-medium text-white group-hover/gift:block group-focus-within/gift:block">
            {gift}
          </span>
        </span>
      ) : null}
    </span>
  );
  if (!self) return portrait;
  return (
    <button type="button" aria-label="Alterar meu humor" onClick={onMood} className="rounded-full">
      {portrait}
    </button>
  );
};

const SortableFace: FC<{ person: Person; mood?: string; gift?: string }> = ({ person, mood, gift }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: person.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="shrink-0 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
      <Face person={person} mood={mood} gift={gift} />
    </div>
  );
};

export const MuralTop: FC = () => {
  const user = actor();
  const { moods } = useInstitution();
  const agenda = useAgendaEvents();
  const [cursor, setCursor] = useState(() => startOfWeek(new Date()));
  const [tip, setTip] = useState<number | null>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(readOrder);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index);
    return date;
  }), [cursor]);

  const events = useMemo(() => {
    const saved = agenda.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.type === 'aniversario' ? nextOccurrenceDate(event.date) : parseAgendaDate(event.date),
      time: event.startTime,
    }));
    const seeded = calendarEvents
      .filter((event) => event.type !== 'birthday')
      .map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.time }));
    return [...saved, ...seeded];
  }, [agenda]);

  const birthdays = useMemo(() => {
    const now = Date.now();
    const soon = 14 * 24 * 60 * 60 * 1000;
    const rows = [
      ...calendarEvents.filter((event) => event.type === 'birthday' && event.personName).map((event) => ({
        name: event.personName ?? '',
        when: nextBirthday(event.date.getMonth(), event.date.getDate()),
        label: event.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }),
      })),
      ...agenda.filter((event) => event.type === 'aniversario' && event.personName).map((event) => {
        const date = parseAgendaDate(event.date);
        return { name: event.personName, when: nextBirthday(date.getMonth(), date.getDate()), label: date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) };
      }),
    ];
    return rows.filter((item) => item.when - now <= soon);
  }, [agenda]);

  const people = useMemo(() => {
    const roster: Person[] = teamRoster.map((person: TeamMember) => ({ id: person.id, name: person.name, avatar: person.avatar }));
    const others = roster.filter((person) => person.name !== user.name && person.id !== user.id);
    const ranked = [...others].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return ranked;
  }, [order, user.id, user.name]);

  const missions = loadActivityStore().activities.filter((activity) => activity.origin === 'leadership' && activity.status !== 'done' && canSeeMission(activity)).length;
  const monthLabel = days[3].toLocaleDateString('pt-BR', { month: 'long' });
  const mine = moods[user.id];

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(people.map((person) => person.id)));
  }, [people]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((current) => {
      const ids = people.map((person) => person.id);
      const base = current.length ? ids : ids;
      const from = base.indexOf(String(active.id));
      const to = base.indexOf(String(over.id));
      if (from < 0 || to < 0) return base;
      return arrayMove(base, from, to);
    });
  }

  function moodOf(person: Person) {
    return moods[person.id];
  }

  function giftOf(person: Person) {
    const hit = birthdays.find((item) => item.name.toLowerCase() === person.name.toLowerCase());
    return hit ? `${hit.name} · ${hit.label}` : undefined;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-3">
        <NotificationDropdown compact />
        <div className="flex min-w-0 flex-col items-center">
          <p className="text-[12px] font-semibold capitalize tracking-wide text-[#6B33F6]">{monthLabel}</p>
          <div className="mt-1 flex items-center gap-1">
            <button type="button" aria-label="Semana anterior" onClick={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth(), value.getDate() - 7))} className="grid h-7 w-7 place-items-center rounded-full text-[#8A7C98] hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-end gap-1.5">
              {days.map((date, index) => {
                const today = sameDay(date, new Date());
                const dayEvents = events.filter((event) => sameDay(event.date, date));
                const open = tip === index;
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className="group relative flex w-8 flex-col items-center"
                    onMouseEnter={() => dayEvents.length ? setTip(index) : undefined}
                    onMouseLeave={() => setTip((value) => value === index ? null : value)}
                    onClick={() => dayEvents.length ? setTip((value) => value === index ? null : index) : undefined}
                  >
                    <span className="text-[10px] font-medium text-[#A398B0]">{WEEKDAYS[date.getDay()]}</span>
                    <span className={cn('mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold', today ? 'bg-[#6B33F6] text-white' : 'text-[#3C3952]')}>
                      {date.getDate()}
                    </span>
                    <span className={cn('mt-0.5 h-1 w-1 rounded-full', dayEvents.length ? 'bg-[#DB2777]' : 'bg-transparent')} />
                    {open ? (
                      <span className="absolute top-12 z-30 w-44 rounded-xl bg-[#1F2937] px-3 py-2 text-left text-[12px] leading-5 text-white shadow-lg">
                        {dayEvents.map((event) => (
                          <span key={event.id} className="block">
                            <span className="font-semibold">{event.title}</span>
                            <span className="block text-white/75">{date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}{event.time ? ` · ${event.time}` : ''}</span>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button type="button" aria-label="Próxima semana" onClick={() => setCursor((value) => new Date(value.getFullYear(), value.getMonth(), value.getDate() + 7))} className="grid h-7 w-7 place-items-center rounded-full text-[#8A7C98] hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Link to="/projects?painel=missoes" aria-label="Missões ativas" className="relative grid h-8 w-8 place-items-center rounded-full text-[#6B33F6] hover:bg-white">
          <Target className="h-4 w-4" />
          {missions > 0 ? <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#DB2777] px-1 text-[10px] font-semibold text-white">{missions}</span> : null}
        </Link>
      </div>

      <div className="relative">
        <div className="flex items-end gap-3 overflow-x-auto px-1 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0">
            <Face person={{ id: user.id, name: user.name, avatar: user.avatar }} self mood={mine} gift={giftOf({ id: user.id, name: user.name, avatar: user.avatar })} onMood={() => setMoodOpen((value) => !value)} />
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={people.map((person) => person.id)} strategy={horizontalListSortingStrategy}>
              {people.map((person) => <SortableFace key={person.id} person={person} mood={moodOf(person)} gift={giftOf(person)} />)}
            </SortableContext>
          </DndContext>
        </div>
        {moodOpen ? (
          <div className="absolute top-16 left-0 z-30 w-44 rounded-2xl border border-gray-100 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            {MOODS.map((mood) => (
              <button key={mood.id} type="button" className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[13px] hover:bg-[#F6F4FC]" onClick={() => { void saveMood(mood.emoji).finally(() => setMoodOpen(false)); }}>
                <Emoji emoji={mood.emoji} className="h-4 w-4" />
                {mood.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

function nextOccurrenceDate(value: string) {
  const birth = parseAgendaDate(value);
  const start = new Date();
  const thisYear = new Date(start.getFullYear(), birth.getMonth(), birth.getDate());
  return thisYear >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) ? thisYear : new Date(start.getFullYear() + 1, birth.getMonth(), birth.getDate());
}
