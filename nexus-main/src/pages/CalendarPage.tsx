import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { calendarEvents, type CalendarEvent } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { directoryPeople, isLeader, useInstitution, wallpaperUrl, type CalendarTheme } from '@/lib/institution';
import { Calendar, Cake, ChevronLeft, ChevronRight, MapPin, Plus, Search, X } from 'lucide-react';
import { CelebrationsCenter } from '@/components/celebrations/CelebrationsCenter';
import { EventDialog } from '@/components/calendar/EventDialog';
import { deleteEvent, notifyEvents, parseAgendaDate, useAgendaEvents, type AgendaEvent } from '@/lib/events';
import { actor } from '@/lib/session';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';

type BirthdayDisplay = 'name' | 'photo' | 'both';

const DISPLAY_KEY = 'unica-birthday-display';
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function loadDisplay(): BirthdayDisplay {
  const stored = localStorage.getItem(DISPLAY_KEY);
  if (stored === 'name' || stored === 'photo' || stored === 'both') return stored;
  return 'both';
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function skinStyle(theme: CalendarTheme, hasWallpaper: boolean, version: number) {
  if (!hasWallpaper) return undefined;
  void theme;
  return {
    backgroundImage: `linear-gradient(var(--card), color-mix(in oklch, var(--card) 86%, transparent)), url("${wallpaperUrl(version)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

function eventTone(event: CalendarEvent) {
  if (event.type === 'birthday') return 'bg-[#F8E8F0] text-[#8A4A66]';
  if (event.category === 'Treinamento') return 'bg-[#E7F6EE] text-[#2E6B48]';
  if (event.category === 'Reunião') return 'bg-[#F3E8FA] text-[#6A3A86]';
  return 'bg-[#F8F3E4] text-[#7A6230]';
}

function nextBirthday(date: Date, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const same = new Date(from.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return same >= start ? same : new Date(from.getFullYear() + 1, date.getMonth(), date.getDate()).getTime();
}

export const CalendarPage: FC<{ embedded?: boolean; compact?: boolean; page?: boolean; rail?: boolean }> = ({ embedded = false, compact = false, page = false, rail = false }) => {
  const [params, setParams] = useSearchParams();
  const birthdaysFocus = params.get('tipo') === 'aniversarios';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [display, setDisplay] = useState<BirthdayDisplay>(loadDisplay);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [active, setActive] = useState<{ event: CalendarEvent; top: number; left: number } | null>(null);
  const [pile, setPile] = useState<{ events: CalendarEvent[]; top: number; left: number } | null>(null);
  const [hint, setHint] = useState<{ text: string; top: number; left: number; below: boolean } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const institution = useInstitution();
  const theme = institution.settings.calendar.theme;
  const savedEvents = useAgendaEvents();
  const leader = isLeader(actor());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [boardView, setBoardView] = useState<'month' | 'week' | 'agenda'>('month');
  const [createType, setCreateType] = useState<'reuniao' | 'aniversario'>('reuniao');

  useEffect(() => {
    if (birthdaysFocus) setLeftOpen(true);
  }, [birthdaysFocus]);

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, display);
  }, [display]);

  useEffect(() => {
    if (!active && !pile) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActive(null);
        setPile(null);
      }
    }
    function onClick(event: MouseEvent) {
      const dialog = dialogRef.current;
      if (dialog && event.target instanceof Node && dialog.contains(event.target)) return;
      setActive(null);
      setPile(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [active, pile]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(calendarEvents.map((event) => event.category).filter(Boolean))) as string[]],
    [],
  );

  const monthEvents = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const savedNames = new Set(savedEvents.filter((event) => event.type === 'aniversario').map((event) => event.personName));
    const base = calendarEvents.filter((event) => {
      if (event.type === 'birthday' && savedNames.has(event.personName ?? '')) return false;
      return event.date.getFullYear() === year && event.date.getMonth() === month || event.type === 'birthday' && event.date.getMonth() === month;
    });
    const extra: CalendarEvent[] = [];
    for (const event of savedEvents) {
      const parsed = parseAgendaDate(event.date);
      if (event.type === 'aniversario') {
        if (parsed.getMonth() !== month) continue;
        extra.push({
          id: event.id,
          title: `Aniversário de ${event.personName}`,
          date: new Date(year, month, parsed.getDate()),
          type: 'birthday',
          personName: event.personName,
          avatar: event.avatar,
          description: event.description,
          category: 'Aniversário',
        });
        continue;
      }
      if (parsed.getFullYear() !== year || parsed.getMonth() !== month) continue;
      extra.push({
        id: event.id,
        title: event.title,
        date: parsed,
        type: 'event',
        time: [event.startTime, event.endTime].filter(Boolean).join(' – '),
        place: event.place,
        description: event.description,
        category: event.type === 'reuniao' ? 'Reunião' : event.type === 'outro' ? 'Outro' : 'Evento',
        participants: event.everyone
          ? ['Todos os colaboradores']
          : (event.participantIds ?? []).map((id) => directoryPeople.find((person) => person.id === id)?.name).filter((name): name is string => Boolean(name)),
      });
    }
    const knownBirthdays = new Set([...base, ...extra].filter((event) => event.type === 'birthday').map((event) => event.personName));
    const fromProfiles: CalendarEvent[] = [];
    for (const [id, person] of Object.entries(institution.people)) {
      if (!person.birthDate) continue;
      const parsed = parseAgendaDate(person.birthDate);
      if (parsed.getMonth() !== month) continue;
      const name = savedEvents.find((event) => event.personId === id)?.personName;
      if (name && knownBirthdays.has(name)) continue;
      if (base.some((event) => event.type === 'birthday' && event.date.getDate() === parsed.getDate())) continue;
      fromProfiles.push({
        id: `perfil-${id}`,
        title: 'Aniversário',
        date: new Date(year, month, parsed.getDate()),
        type: 'birthday',
        description: 'Data registrada no perfil.',
        category: 'Aniversário',
      });
    }
    return [...extra, ...fromProfiles, ...base];
  }, [currentDate, savedEvents, institution.people]);

  const visibleEvents = monthEvents.filter((event) => {
    const text = `${event.title} ${event.description ?? ''} ${event.personName ?? ''}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesCategory = category === 'all' || event.category === category;
    return matchesQuery && matchesCategory;
  });

  const today = new Date();
  const birthdays = [...visibleEvents]
    .filter((event) => event.type === 'birthday')
    .sort((a, b) => nextBirthday(a.date) - nextBirthday(b.date));
  const todayBirthdays = birthdays.filter((event) => sameDay(event.date, today));
  const upcomingBirthdays = birthdays.filter((event) => !sameDay(event.date, today));

  const upcoming = [...visibleEvents]
    .filter((event) => event.type !== 'birthday' && event.date.getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  function eventsOn(day: number) {
    const target = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return visibleEvents.filter((event) => sameDay(event.date, target));
  }

  function dayReason(events: CalendarEvent[]) {
    return events.map((event) => {
      if (event.type === 'birthday') return `Aniversário de ${event.personName ?? 'colaborador'}`;
      const when = [event.time, event.place].filter(Boolean).join(' · ');
      return [event.title, when, event.description].filter(Boolean).join('\n');
    }).join('\n\n');
  }

  function openEvent(event: CalendarEvent, anchor: HTMLElement) {
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 320);
    const top = Math.min(rect.bottom + 8, window.innerHeight - 280);
    setActive({ event, top: Math.max(72, top), left: Math.max(16, left) });
  }

  function shiftMonth(direction: -1 | 1) {
    setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
    setSelectedDay(null);
    setActive(null);
  }

  function shiftWeek(direction: -1 | 1) {
    setCurrentDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + direction * 7);
      return next;
    });
    setActive(null);
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const selectedEvents = selectedDay ? eventsOn(selectedDay) : [];
  const monthLabel = (() => { const label = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); })();

  if (rail) {
    const initials = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
    const rangeLabel = `${week[0].getDate()}–${week[6].getDate()} ${week[6].toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
    return (
      <>
        <section className="unica-surface shrink-0 px-3 py-2.5">
          <div className="flex items-center justify-between gap-1">
            <h2 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
              <Link to="/calendar" className="truncate hover:text-primary">{rangeLabel}</Link>
            </h2>
            <div className="flex shrink-0 items-center">
              <button type="button" onClick={() => shiftWeek(-1)} aria-label="Semana anterior" className="flex h-6 w-6 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => shiftWeek(1)} aria-label="Próxima semana" className="flex h-6 w-6 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-accent hover:text-foreground"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-7 text-center">
            {week.map((date, index) => {
              const dayEvents = calendarEvents.filter((event) => event.date.getFullYear() === date.getFullYear() && event.date.getMonth() === date.getMonth() && event.date.getDate() === date.getDate());
              const isCurrent = sameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  title={dayEvents.length > 0 ? dayReason(dayEvents) : undefined}
                  onMouseEnter={(hover) => {
                    if (dayEvents.length === 0) return;
                    const rect = hover.currentTarget.getBoundingClientRect();
                    const below = rect.top < 110;
                    setHint({ text: dayReason(dayEvents), top: below ? rect.bottom + 8 : rect.top - 6, left: rect.left + rect.width / 2, below });
                  }}
                  onMouseLeave={() => setHint(null)}
                  onClick={(click) => {
                    if (dayEvents.length === 1) openEvent(dayEvents[0], click.currentTarget);
                    else if (dayEvents.length > 1) {
                      const rect = click.currentTarget.getBoundingClientRect();
                      setPile({ events: dayEvents, top: Math.min(rect.bottom + 8, window.innerHeight - 220), left: Math.max(16, Math.min(rect.left, window.innerWidth - 300)) });
                    }
                  }}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">{initials[index]}</span>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[12px]', isCurrent && 'bg-primary font-medium text-primary-foreground')}>{date.getDate()}</span>
                  <span className={cn('h-1 w-1 rounded-full', dayEvents.length > 0 ? 'bg-primary' : 'bg-transparent')} />
                </button>
              );
            })}
          </div>
        </section>
        {hint ? createPortal(
          <div role="tooltip" className={cn('pointer-events-none fixed z-[80] max-w-[240px] -translate-x-1/2 whitespace-pre-line rounded-lg bg-foreground px-2.5 py-1.5 text-left text-[11px] font-medium leading-4 text-background shadow-lg', hint.below ? 'translate-y-0' : '-translate-y-full')} style={{ top: hint.top, left: hint.left }}>
            {hint.text}
          </div>,
          document.body,
        ) : null}
        {pile ? (
          <div ref={dialogRef} role="dialog" aria-label="Eventos do dia" className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: pile.top, left: pile.left }} onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fechar" className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setPile(null)}><X className="h-4 w-4" /></button>
            <p className="pr-6 text-xs font-medium text-primary">Neste dia</p>
            <div className="mt-2 space-y-1">
              {pile.events.map((event) => (
                <button key={event.id} type="button" className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted" onClick={(click) => { setPile(null); openEvent(event, click.currentTarget); }}>{event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}</button>
              ))}
            </div>
          </div>
        ) : null}
        {active ? (
          <div ref={dialogRef} role="dialog" aria-label={active.event.title} className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: active.top, left: active.left }} onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fechar" className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setActive(null)}><X className="h-4 w-4" /></button>
            <p className="pr-6 text-xs font-medium text-primary">{active.event.category ?? 'Evento'}</p>
            <h2 className="mt-1 text-base font-semibold">{active.event.type === 'birthday' ? `Aniversário de ${active.event.personName}` : active.event.title}</h2>
            {active.event.description ? <p className="mt-3 leading-5 text-muted-foreground">{active.event.description}</p> : null}
          </div>
        ) : null}
      </>
    );
  }

  if (page) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const previousCount = new Date(year, month, 0).getDate();
    const cells: { day: number; outside: boolean }[] = [];
    for (let index = firstWeekday - 1; index >= 0; index -= 1) cells.push({ day: previousCount - index, outside: true });
    for (let day = 1; day <= daysInMonth; day += 1) cells.push({ day, outside: false });
    let nextDay = 1;
    while (cells.length % 7 !== 0) cells.push({ day: nextDay++, outside: true });
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
    const agenda = [...visibleEvents].sort((a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title, 'pt-BR'));
    const openBirthdays = () => {
      const next = new URLSearchParams(params);
      next.set('tipo', 'aniversarios');
      setParams(next);
    };
    const openCalendar = () => {
      const next = new URLSearchParams(params);
      next.delete('tipo');
      next.delete('escopo');
      next.delete('pessoa');
      next.delete('edicao');
      setParams(next);
    };
    const sectionTabs = (
      <div className="mt-4 flex gap-5 border-b border-[#EDE6F3]">
        <button type="button" onClick={openCalendar} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-medium', !birthdaysFocus ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}>
          <Calendar className="h-3.5 w-3.5" /> Calendário
        </button>
        <button type="button" onClick={openBirthdays} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[13px] font-medium', birthdaysFocus ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}>
          <Cake className="h-3.5 w-3.5" /> Aniversários
        </button>
      </div>
    );
    if (birthdaysFocus) {
      return (
        <div id="calendario" className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><Cake className="h-5 w-5" /></span>
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-[#241B33]">Celebrações</h1>
              <p className="text-[13.5px] text-[#8A7C98]">Decore o bolo e as datas da equipe. O recado aparece ao tocar no enfeite.</p>
            </div>
          </div>
          {sectionTabs}
          <CelebrationsCenter />
        </div>
      );
    }
    return (
      <div id="calendario" className="min-w-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
              <Calendar className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#241B33]">Calendário</h1>
              <p className="mt-0.5 truncate text-[13.5px] text-[#8A7C98]">Acompanhe seus compromissos, eventos e aniversários da equipe.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button className="h-10 rounded-full bg-[#8E35B8] px-4 hover:bg-[#7A2CA0]" onClick={() => { setEditingEvent(null); setCreateType('reuniao'); setEditorOpen(true); }}>
              <Plus className="h-4 w-4" /> Adicionar evento
            </Button>
            <Button variant="outline" className="h-10 rounded-full border-[#E7DFF0] bg-white px-4" onClick={() => { setEditingEvent(null); setCreateType('aniversario'); setEditorOpen(true); }}>
              <Cake className="h-4 w-4" /> Adicionar aniversário
            </Button>
          </div>
        </div>
        {sectionTabs}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mês anterior" onClick={() => boardView === 'week' ? shiftWeek(-1) : shiftMonth(-1)} className="grid h-8 w-8 place-items-center rounded-full text-[#5C5168] hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <p className="min-w-[140px] text-center text-[15px] font-semibold text-[#2C2433]">{monthLabel}</p>
            <button type="button" aria-label="Próximo mês" onClick={() => boardView === 'week' ? shiftWeek(1) : shiftMonth(1)} className="grid h-8 w-8 place-items-center rounded-full text-[#5C5168] hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="flex rounded-full bg-white p-1 shadow-[0_4px_14px_rgba(80,40,120,0.05)]">
            {([['month', 'Mês'], ['week', 'Semana'], ['agenda', 'Agenda']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setBoardView(id)} className={cn('rounded-full px-4 py-1.5 text-[13px] font-medium', boardView === id ? 'bg-[#8E35B8] text-white' : 'text-[#8A7C98]')}>{label}</button>
            ))}
          </div>
        </div>
        {boardView === 'agenda' ? (
          <div className="mt-4 grid gap-3">
            {agenda.length === 0 ? <p className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-8 text-sm text-[#8A7C98]">Nenhum compromisso neste mês.</p> : agenda.reduce<{ date: Date; events: typeof agenda }[]>((groups, event) => {
              const last = groups[groups.length - 1];
              if (last && sameDay(last.date, event.date)) last.events.push(event);
              else groups.push({ date: event.date, events: [event] });
              return groups;
            }, []).map((group) => (
              <article key={group.date.toISOString()} className="flex gap-3 rounded-[22px] border border-[#F0E7F6] bg-white p-3 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#F8EAFB] text-center leading-tight text-[#6A228C]">
                  <span className="text-[18px] font-semibold">{group.date.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                  <span className="text-[11px] capitalize">{group.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                </div>
                <div className="grid min-w-0 flex-1 gap-2">
                  {group.events.map((event) => (
                    <button key={event.id} type="button" onClick={(click) => openEvent(event, click.currentTarget)} className="flex items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-[#FBF7FC]">
                      <span className={cn('min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-[13px] font-medium', eventTone(event))}>{event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}</span>
                      <span className="shrink-0 text-[12px] text-[#8A7C98]">{[event.time, event.place].filter(Boolean).join(' · ')}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : boardView === 'week' ? (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const dayEvents = calendarEvents.filter((event) => sameDay(event.date, date));
              const isCurrent = sameDay(date, today);
              return (
                <div key={date.toISOString()} className="flex aspect-square flex-col overflow-hidden rounded-2xl border border-[#F0E7F6] bg-white p-2">
                  <p className="text-center text-[11px] text-[#8A7C98]">{weekdays[date.getDay()]}</p>
                  <p className={cn('mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-[13px] font-semibold', isCurrent ? 'bg-[#8E35B8] text-white' : 'text-[#2C2433]')}>{date.getDate()}</p>
                  <div className="mt-1 grid min-h-0 gap-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button key={event.id} type="button" onClick={(click) => openEvent(event, click.currentTarget)} className={cn('truncate rounded-md px-1.5 py-0.5 text-left text-[10px]', eventTone(event))}>
                        {event.type === 'birthday' ? event.personName?.split(' ')[0] : event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 ? <p className="text-center text-[10px] text-[#8A7C98]">+{dayEvents.length - 2}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 min-w-0 overflow-hidden rounded-[22px] border border-[#F0E7F6] bg-white">
            <div className="grid grid-cols-7 border-b border-[#F3EDF6]">
              {weekdays.map((day) => <div key={day} className="px-2 py-2 text-center text-[12px] font-medium text-[#8A7C98]">{day}</div>)}
            </div>
            <div className="grid min-w-0 grid-cols-7">
              {cells.map((cell, index) => {
                const dayEvents = cell.outside ? [] : eventsOn(cell.day);
                const isCurrent = !cell.outside && sameDay(new Date(year, month, cell.day), today);
                return (
                  <div key={`${cell.outside}-${cell.day}-${index}`} className="min-h-[112px] min-w-0 border-r border-b border-[#F6F1F8] p-1.5">
                    <p className={cn('mb-1 grid h-6 w-6 place-items-center rounded-full text-[12px]', cell.outside && 'text-[#C4B6D4]', isCurrent && 'bg-[#8E35B8] font-semibold text-white')}>{cell.day}</p>
                    <div className="grid gap-1">
                      {dayEvents.slice(0, 2).map((event) => {
                        const first = event.personName?.split(' ')[0];
                        return (
                          <button key={event.id} type="button" onClick={(click) => openEvent(event, click.currentTarget)} className={cn('min-w-0 rounded-lg px-1.5 py-1 text-left', eventTone(event))}>
                            {event.type === 'birthday' ? (
                              <span className="flex min-w-0 items-center gap-1">
                                {event.avatar ? <img src={event.avatar} alt="" className="h-5 w-5 shrink-0 rounded-full" /> : null}
                                <span className="min-w-0">
                                  <span className="block truncate text-[11px] font-semibold">{first}</span>
                                  <span className="block truncate text-[10px] opacity-80">Aniversário</span>
                                </span>
                              </span>
                            ) : (
                              <>
                                <span className="block truncate text-[11px] font-medium">{event.time ? `${event.time} · ` : ''}{event.title}</span>
                                {event.place ? <span className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] opacity-75"><MapPin className="h-2.5 w-2.5 shrink-0" />{event.place}</span> : null}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {active ? (
          <div ref={dialogRef} role="dialog" aria-label={active.event.title} className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: active.top, left: active.left }} onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fechar" className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setActive(null)}><X className="h-4 w-4" /></button>
            <p className="pr-6 text-xs font-medium text-primary">{active.event.category ?? 'Evento'}</p>
            <h2 className="mt-1 text-base font-semibold">{active.event.type === 'birthday' ? `Aniversário de ${active.event.personName}` : active.event.title}</h2>
            {active.event.time ? <p className="mt-2 text-muted-foreground">{active.event.time}{active.event.place ? ` · ${active.event.place}` : ''}</p> : null}
          </div>
        ) : null}
        <EventDialog
          open={editorOpen}
          event={editingEvent}
          initialType={createType}
          birthDates={Object.fromEntries(Object.entries(institution.people).map(([id, person]) => [id, person.birthDate ?? savedEvents.find((event) => event.type === 'aniversario' && event.personId === id)?.date]))}
          onOpenChange={setEditorOpen}
        />
      </div>
    );
  }

  return (
    <section id="calendario" className={cn(page || compact || embedded ? 'scroll-mt-20 shrink-0 overflow-hidden rounded-2xl border bg-card' : 'min-h-screen bg-background', theme !== 'padrao' && `calendar-skin-${theme}`)} style={skinStyle(theme, institution.hasWallpaper, institution.settings.calendar.wallpaperVersion)}>
      {embedded || compact || page ? null : <Header />}
      <div className={cn('flex', compact || page ? '' : embedded ? 'min-h-[640px]' : 'min-h-[calc(100vh-4rem)]')}>
        {compact || page ? null : <aside id="aniversarios" className={cn('hidden shrink-0 scroll-mt-20 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex', leftOpen ? 'w-60' : 'w-10')}>
          <button type="button" aria-label={leftOpen ? 'Recolher painel esquerdo' : 'Expandir painel esquerdo'} onClick={(event) => { event.stopPropagation(); setLeftOpen((open) => !open); }} className="m-2 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', !leftOpen && 'rotate-180')} />
            {leftOpen ? <span>Aniversariantes</span> : null}
          </button>
          {leftOpen ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
              <div>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Hoje</p>
                {todayBirthdays.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum aniversário hoje.</p> : todayBirthdays.map((person) => (
                  <button key={person.id} type="button" onClick={(event) => { event.stopPropagation(); openEvent(person, event.currentTarget); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/60">
                    <img src={person.avatar} alt="" className="h-9 w-9 rounded-full bg-muted object-cover" />
                    <span>
                      <span className="block text-sm font-medium">{person.personName?.split(' ')[0]}</span>
                      <span className="block text-xs text-muted-foreground">Aniversário hoje</span>
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Próximos</p>
                {upcomingBirthdays.map((person) => (
                  <button key={person.id} type="button" onClick={(event) => { event.stopPropagation(); openEvent(person, event.currentTarget); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted/60">
                    <img src={person.avatar} alt="" className="h-9 w-9 rounded-full bg-muted object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{person.personName?.split(' ')[0]}</span>
                      <span className="block text-xs text-muted-foreground">{person.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>}

        <main className={cn('min-w-0 flex-1', compact ? 'px-3 py-3' : 'px-4 py-6 sm:px-6')}>
          <div className={cn('flex items-center justify-between gap-2', compact ? 'mb-2' : 'mb-4')}>
            <h2 className={cn('font-semibold', compact ? 'text-sm' : 'text-xl')}>{monthLabel}</h2>
            <div className="flex items-center gap-2">
              {compact || !leader ? null : (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditingEvent(null); setEditorOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  Novo evento
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()); }}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card/80">
            <div className="grid grid-cols-7">
            {weekdays.map((day) => (
              <div key={day} className={cn('border-r border-b bg-muted/40 text-center font-medium text-muted-foreground last:border-r-0', compact ? 'px-0 py-1 text-[10px]' : 'p-2 text-sm')}>{compact ? day.charAt(0) : day}</div>
            ))}
            </div>
            <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <div key={`empty-${index}`} className="aspect-square w-full self-start border-r border-b bg-muted/20" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dayEvents = eventsOn(day);
              const visibleCount = compact ? 1 : 2;
              const isCurrent = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === day;
              return (
                <div key={day} className="relative aspect-square w-full self-start border-r border-b bg-transparent" onClick={(event) => { event.stopPropagation(); setSelectedDay(day); setActive(null); setPile(null); }}>
                  <div className={cn('absolute inset-0 overflow-hidden hover:bg-muted/30', compact ? 'p-0.5' : 'p-1.5')}>
                  <div className={cn('flex items-center justify-center font-medium', compact ? 'mb-0.5 h-4 w-4 text-[10px]' : 'mb-1 h-6 w-6 text-sm', isCurrent && 'rounded-full bg-primary text-primary-foreground', selectedDay === day && !isCurrent && 'rounded-full bg-muted')}>
                    {day}
                  </div>
                  <div className={cn(compact ? 'flex flex-wrap justify-center gap-0.5' : 'space-y-1')}>
                    {dayEvents.slice(0, visibleCount).map((event) => {
                      const firstName = event.personName?.split(' ')[0];
                      const label = event.type !== 'birthday'
                        ? event.title
                        : display === 'name'
                          ? `Aniversário de ${firstName}`
                          : display === 'both'
                            ? firstName
                            : '';
                      return (
                        <button key={event.id} type="button" aria-label={event.title} title={event.title} onClick={(click) => { click.stopPropagation(); setSelectedDay(day); setPile(null); openEvent(event, click.currentTarget); }} className={cn('flex items-center gap-1 truncate rounded-md text-left text-[11px] ring-1 ring-inset ring-current/10', compact ? 'justify-center' : 'w-full px-1 py-0.5', eventTone(event))}>
                          {event.type === 'birthday' && display !== 'name' ? <img src={event.avatar} alt="" className={cn('shrink-0 rounded-full bg-background', compact ? 'h-4 w-4' : 'h-5 w-5')} /> : <span className="text-[10px]">●</span>}
                          {compact || !label ? null : <span className="truncate">{label}</span>}
                        </button>
                      );
                    })}
                    {dayEvents.length > visibleCount ? (
                      <button type="button" className="text-[11px] text-muted-foreground" onClick={(click) => { click.stopPropagation(); const rect = click.currentTarget.getBoundingClientRect(); setActive(null); setPile({ events: dayEvents, top: Math.min(rect.bottom + 8, window.innerHeight - 280), left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)) }); }}>+{dayEvents.length - visibleCount}</button>
                    ) : null}
                  </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </main>

        {compact || page ? null : <aside className={cn('hidden shrink-0 flex-col overflow-hidden border-l bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex', rightOpen ? 'w-60' : 'w-10')}>
          <button type="button" aria-label={rightOpen ? 'Recolher painel direito' : 'Expandir painel direito'} onClick={(event) => { event.stopPropagation(); setRightOpen((open) => !open); }} className="m-2 flex items-center justify-end gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            {rightOpen ? <span>Agenda</span> : null}
            <ChevronRight className={cn('h-4 w-4 transition-transform', !rightOpen && 'rotate-180')} />
          </button>
          {rightOpen ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4" onClick={(event) => event.stopPropagation()}>
              <label className="relative block">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar eventos..." className="bg-background pl-9" />
              </label>
              <div>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Categorias</p>
                <div className="flex flex-col">
                  {categories.map((item) => (
                    <button key={item} type="button" onClick={() => setCategory(item)} className={cn('rounded-lg px-3 py-2 text-left text-sm font-medium', category === item ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
                      {item === 'all' ? 'Todas' : item}
                    </button>
                  ))}
                </div>
              </div>
              <fieldset>
                <legend className="mb-1 px-1 text-xs font-medium text-muted-foreground">Exibição dos aniversários</legend>
                {([['name', 'Nome'], ['photo', 'Foto'], ['both', 'Foto + nome']] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                    <input type="radio" name="aniversario" checked={display === value} onChange={() => setDisplay(value)} />
                    {label}
                  </label>
                ))}
              </fieldset>
              <div>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Próximos eventos</p>
                {upcoming.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum evento próximo.</p> : upcoming.map((event) => (
                  <button key={event.id} type="button" onClick={(click) => openEvent(event, click.currentTarget)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                    {event.type === 'anniversary' ? <Cake className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">{selectedDay ? `Dia ${selectedDay}` : 'Dia selecionado'}</p>
                {selectedEvents.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum evento neste dia.</p> : selectedEvents.map((event) => (
                  <button key={event.id} type="button" onClick={(click) => openEvent(event, click.currentTarget)} className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                    {event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>}
      </div>

      {pile ? (
        <div ref={dialogRef} role="dialog" aria-label="Eventos do dia" className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: pile.top, left: pile.left }} onClick={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Fechar" className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground" onClick={() => setPile(null)}>
            <X className="h-4 w-4" />
          </button>
          <p className="pr-6 text-xs font-medium text-primary">Neste dia</p>
          <div className="mt-2 space-y-1">
            {pile.events.map((event) => (
              <button key={event.id} type="button" className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/60" onClick={(click) => { setPile(null); openEvent(event, click.currentTarget); }}>{event.type === 'birthday' ? `Aniversário de ${event.personName?.split(' ')[0]}` : event.title}</button>
            ))}
          </div>
        </div>
      ) : null}
      {active ? (
        <div ref={dialogRef} role="dialog" aria-label={active.event.title} className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: active.top, left: active.left }} onClick={(event) => event.stopPropagation()}>
          <button type="button" aria-label="Fechar" className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground" onClick={() => setActive(null)}>
            <X className="h-4 w-4" />
          </button>
          <p className="pr-6 text-xs font-medium text-primary">{active.event.category ?? 'Evento'}</p>
          <h2 className="mt-1 text-base font-semibold">{active.event.type === 'birthday' ? `Aniversário de ${active.event.personName}` : active.event.title}</h2>
          {active.event.type === 'birthday' && active.event.avatar ? <img src={active.event.avatar} alt="" className="mt-3 h-12 w-12 rounded-full bg-muted" /> : null}
          <dl className="mt-3 space-y-1 text-muted-foreground">
            <div><dt className="inline">Data: </dt><dd className="inline text-foreground">{active.event.date.toLocaleDateString('pt-BR')}</dd></div>
            {active.event.time ? <div><dt className="inline">Horário: </dt><dd className="inline text-foreground">{active.event.time}</dd></div> : null}
            {active.event.place ? <div><dt className="inline">Local: </dt><dd className="inline text-foreground">{active.event.place}</dd></div> : null}
            {active.event.owner ? <div><dt className="inline">Responsável: </dt><dd className="inline text-foreground">{active.event.owner}</dd></div> : null}
            {active.event.participants?.length ? <div><dt className="inline">Participantes: </dt><dd className="inline text-foreground">{active.event.participants.join(', ')}</dd></div> : null}
          </dl>
          {active.event.description ? <p className="mt-3 leading-5">{active.event.description}</p> : null}
          {leader && savedEvents.some((event) => event.id === active.event.id) ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingEvent(savedEvents.find((event) => event.id === active.event.id) ?? null); setActive(null); setEditorOpen(true); }}>Editar</Button>
              <Button size="sm" variant="outline" onClick={() => { if (!window.confirm('Excluir este evento?')) return; void deleteEvent(active.event.id).then(() => { notifyEvents(); setActive(null); }); }}>Excluir</Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <EventDialog
        open={editorOpen}
        event={editingEvent}
        birthDates={Object.fromEntries(Object.entries(institution.people).map(([id, person]) => [id, person.birthDate ?? savedEvents.find((event) => event.type === 'aniversario' && event.personId === id)?.date]))}
        onOpenChange={setEditorOpen}
      />
    </section>
  );
};
