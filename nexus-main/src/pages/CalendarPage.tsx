import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { calendarEvents, type CalendarEvent } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Calendar, Cake, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';

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

function eventTone(type: CalendarEvent['type']) {
  if (type === 'birthday') return 'bg-rose-500/10 text-rose-700';
  if (type === 'anniversary') return 'bg-violet-500/10 text-violet-700';
  return 'bg-primary/10 text-primary';
}

function nextBirthday(date: Date, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const same = new Date(from.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return same >= start ? same : new Date(from.getFullYear() + 1, date.getMonth(), date.getDate()).getTime();
}

export const CalendarPage: FC<{ embedded?: boolean; compact?: boolean; page?: boolean }> = ({ embedded = false, compact = false, page = false }) => {
  const [params] = useSearchParams();
  const birthdaysFocus = params.get('tipo') === 'aniversarios';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [display, setDisplay] = useState<BirthdayDisplay>(loadDisplay);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [active, setActive] = useState<{ event: CalendarEvent; top: number; left: number } | null>(null);

  useEffect(() => {
    if (birthdaysFocus) setLeftOpen(true);
  }, [birthdaysFocus]);

  useEffect(() => {
    localStorage.setItem(DISPLAY_KEY, display);
  }, [display]);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(calendarEvents.map((event) => event.category).filter(Boolean))) as string[]],
    [],
  );

  const visibleEvents = calendarEvents.filter((event) => {
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

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const selectedEvents = selectedDay ? eventsOn(selectedDay) : [];

  return (
    <section id="calendario" className={cn(page || compact || embedded ? 'scroll-mt-20 shrink-0 overflow-hidden rounded-2xl border bg-card' : 'min-h-screen bg-background')} onClick={() => setActive(null)}>
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
            <h2 className={cn('font-semibold', compact ? 'text-sm' : 'text-xl')}>{(() => { const label = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); })()}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date().getDate()); }}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-l border-t bg-background">
            {weekdays.map((day) => (
              <div key={day} className={cn('border-r border-b text-center font-medium text-muted-foreground', compact ? 'px-0 py-1 text-[10px]' : 'p-2 text-sm')}>{compact ? day.charAt(0) : day}</div>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <div key={`empty-${index}`} className={cn('border-r border-b bg-muted/20', compact ? 'min-h-9' : 'p-2')} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const dayEvents = eventsOn(day);
              const isCurrent = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth() && today.getDate() === day;
              return (
                <div key={day} className={cn('border-r border-b bg-background transition-colors hover:bg-muted/30', compact ? 'min-h-11 p-0.5' : 'min-h-[120px] p-2')} onClick={(event) => { event.stopPropagation(); setSelectedDay(day); setActive(null); }}>
                  <div className={cn('flex items-center justify-center font-medium', compact ? 'mb-0.5 h-5 w-5 text-[11px]' : 'mb-1 h-6 w-6 text-sm', isCurrent && 'rounded-full bg-primary text-primary-foreground', selectedDay === day && !isCurrent && 'rounded-full bg-muted')}>
                    {day}
                  </div>
                  <div className={cn(compact ? 'flex flex-wrap justify-center gap-0.5' : 'space-y-1')}>
                    {dayEvents.slice(0, 3).map((event) => {
                      const firstName = event.personName?.split(' ')[0];
                      const label = event.type !== 'birthday'
                        ? event.title
                        : display === 'name'
                          ? `Aniversário de ${firstName}`
                          : display === 'both'
                            ? firstName
                            : '';
                      return (
                        <button key={event.id} type="button" aria-label={event.title} title={event.title} onClick={(click) => { click.stopPropagation(); setSelectedDay(day); openEvent(event, click.currentTarget); }} className={cn('flex items-center gap-1 truncate rounded text-left text-[11px]', compact ? 'justify-center' : 'w-full px-1 py-0.5', eventTone(event.type))}>
                          {event.type === 'birthday' && display !== 'name' ? <img src={event.avatar} alt="" className={cn('shrink-0 rounded-full bg-background', compact ? 'h-4 w-4' : 'h-5 w-5')} /> : <span className="text-[10px]">●</span>}
                          {compact || !label ? null : <span className="truncate">{label}</span>}
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 ? <p className="text-[11px] text-muted-foreground">+{dayEvents.length - 3}</p> : null}
                  </div>
                </div>
              );
            })}
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

      {active ? (
        <div role="dialog" aria-label={active.event.title} className="fixed z-50 w-72 rounded-xl border bg-card p-4 text-sm shadow-lg" style={{ top: active.top, left: active.left }} onClick={(event) => event.stopPropagation()}>
          <p className="text-xs font-medium text-primary">{active.event.category ?? 'Evento'}</p>
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
        </div>
      ) : null}
    </section>
  );
};
