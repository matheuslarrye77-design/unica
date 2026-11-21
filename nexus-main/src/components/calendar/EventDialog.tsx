import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { type Employee } from '@/data/mockData';
import { directoryPeople, saveBirthDate } from '@/lib/institution';
import { createEvent, notifyEvents, updateEvent, type AgendaEvent, type AgendaType } from '@/lib/events';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const TYPES: { id: AgendaType; label: string; color: string }[] = [
  { id: 'reuniao', label: 'Reunião', color: '#7c5cf5' },
  { id: 'evento', label: 'Evento', color: '#3b82f6' },
  { id: 'aniversario', label: 'Aniversário', color: '#f59aa8' },
  { id: 'ferias', label: 'Férias', color: '#4cd1d4' },
  { id: 'folga', label: 'Folga', color: '#f2a33a' },
  { id: 'outro', label: 'Outro', color: '#9a96ad' },
];

const empty = {
  title: '',
  type: 'reuniao' as AgendaType,
  date: '',
  startTime: '',
  endTime: '',
  place: '',
  description: '',
  personId: '',
  personName: '',
  avatar: '',
};

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function shiftIso(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function labelDate(value: string) {
  const [, month, day] = value.split('-');
  return `${day}/${month}`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

const field = 'h-11 w-full rounded-[18px] border-0 bg-[#f0f3f9] px-4 text-sm text-[#12274a] outline-none placeholder:text-[#8a97ad] focus:shadow-[0_0_0_2px_#4cd1d4]';
const chip = 'inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-white px-1 text-[13px] font-medium text-[#8a97ad] shadow-[3px_3px_7px_#d6deeb,-3px_-3px_7px_#fff]';

export const EventDialog: FC<{
  open: boolean;
  event: AgendaEvent | null;
  birthDates: Record<string, string | undefined>;
  onOpenChange: (open: boolean) => void;
  initialType?: AgendaType;
}> = ({ open, event, birthDates, onOpenChange, initialType }) => {
  const [form, setForm] = useState(empty);
  const [multi, setMulti] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [perDay, setPerDay] = useState(false);
  const [dayTimes, setDayTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [mode, setMode] = useState<'me' | 'all' | 'pick'>('me');
  const [sectors, setSectors] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [personError, setPersonError] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const birthdayRef = useRef<HTMLDivElement>(null);

  const departments = useMemo(() => {
    const names = [...new Set(directoryPeople.map((person) => person.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return names;
  }, []);

  useEffect(() => {
    if (!open) return;
    const next = event ? {
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      place: event.place,
      description: event.description,
      personId: event.personId,
      personName: event.personName,
      avatar: event.avatar,
    } : { ...empty, type: initialType ?? 'reuniao', date: todayIso() };
    setForm(next);
    setMulti(false);
    setEndDate(next.date ? shiftIso(next.date, 1) : '');
    setAllDay(next.type === 'aniversario' || next.type === 'ferias' || next.type === 'folga' || (!event ? false : !next.startTime && !next.endTime));
    setPerDay(false);
    setDayTimes({});
    setMode(event?.everyone ? 'all' : event && event.participantIds.length ? 'pick' : 'me');
    setSectors([]);
    setPicked(event?.everyone ? [] : event?.participantIds ?? []);
    setQuery('');
    setPersonQuery('');
    setFilterOpen(false);
    setPeopleOpen(false);
    setBirthdayOpen(false);
    setTitleError(false);
    setPersonError(false);
  }, [open, event, initialType]);

  useEffect(() => {
    if (!open) return;
    const close = (pointer: MouseEvent) => {
      const target = pointer.target as Node;
      if (!searchRef.current?.contains(target)) setPeopleOpen(false);
      if (!filterRef.current?.contains(target)) setFilterOpen(false);
      if (!birthdayRef.current?.contains(target)) setBirthdayOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const birthday = form.type === 'aniversario';
  const dates = useMemo(() => {
    if (!multi || !form.date || !endDate || endDate < form.date) return form.date ? [form.date] : [];
    const list: string[] = [];
    let cursor = form.date;
    while (cursor <= endDate && list.length < 60) {
      list.push(cursor);
      cursor = shiftIso(cursor, 1);
    }
    return list;
  }, [multi, form.date, endDate]);

  function covered(person: Employee) {
    return mode === 'all' || sectors.includes(person.department);
  }

  const invited = directoryPeople.filter((person) => covered(person) || picked.includes(person.id));
  const onlyOrganizer = mode === 'me' && sectors.length === 0 && picked.length === 0;

  function chooseType(type: AgendaType) {
    setForm((current) => ({ ...current, type }));
    if (type === 'aniversario') {
      setMulti(false);
      setAllDay(true);
      setPerDay(false);
    } else if (type === 'ferias') {
      setAllDay(true);
      setMulti(true);
    } else if (type === 'folga') {
      setAllDay(true);
    } else {
      setAllDay(false);
    }
    setFilterOpen(false);
    setPeopleOpen(false);
    setBirthdayOpen(false);
  }

  function chooseBirthday(person: Employee) {
    const known = birthDates[person.id];
    setForm((current) => ({
      ...current,
      personId: person.id,
      personName: person.name,
      avatar: person.avatar,
      title: `Aniversário de ${person.name}`,
      date: known || current.date,
    }));
    setPersonError(false);
    setBirthdayOpen(false);
    setPersonQuery('');
  }

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    if (birthday && !form.personId) {
      setPersonError(true);
      return;
    }
    if (!birthday && !form.title.trim()) {
      setTitleError(true);
      return;
    }
    const everyone = mode === 'all';
    const participantIds = everyone || onlyOrganizer ? [] : invited.map((person) => person.id);
    const base = {
      ...form,
      title: birthday ? `Aniversário de ${form.personName}` : form.title.trim(),
      startTime: birthday || allDay ? '' : form.startTime,
      endTime: birthday || allDay ? '' : form.endTime,
      everyone,
      participantIds,
    };
    setSaving(true);
    try {
      if (event) {
        const saved = await updateEvent(event.id, base);
        if (saved.event.type === 'aniversario' && saved.event.personId && saved.event.date) {
          await saveBirthDate(saved.event.personId, saved.event.date).catch(() => undefined);
        }
      } else {
        const span = dates.length ? dates : [form.date];
        for (const date of span) {
          const custom = perDay && !allDay ? dayTimes[date] : undefined;
          const saved = await createEvent({
            ...base,
            date,
            startTime: birthday || allDay ? '' : custom?.start ?? form.startTime,
            endTime: birthday || allDay ? '' : custom?.end ?? form.endTime,
          });
          if (saved.event.type === 'aniversario' && saved.event.personId && saved.event.date) {
            await saveBirthDate(saved.event.personId, saved.event.date).catch(() => undefined);
          }
        }
      }
      notifyEvents();
      toast.success(event ? 'Evento atualizado.' : 'Evento criado.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error && error.message === '403' ? 'Somente a liderança pode alterar o calendário.' : 'Não foi possível salvar o evento.');
    } finally {
      setSaving(false);
    }
  }

  const personMatches = directoryPeople.filter((person) => person.name.toLowerCase().includes(personQuery.trim().toLowerCase()));
  const inviteMatches = directoryPeople.filter((person) => !covered(person) && !picked.includes(person.id) && person.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} overlayClassName="bg-[rgba(18,39,74,0.28)]" className="!flex max-h-[min(92vh,760px)] w-[min(580px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !overflow-hidden !rounded-[34px] !border-0 !bg-white !p-0 text-[#12274a] shadow-[12px_12px_28px_#d6deeb,-10px_-10px_24px_#fff]">
        <form className="flex min-h-0 flex-1 flex-col px-7 pt-6 pb-5" onSubmit={(submitEvent) => void submit(submitEvent)}>
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="font-fraunces text-[27px] font-normal text-[#12274a]">{event ? 'Editar evento' : 'Novo evento'}</DialogTitle>
            <DialogDescription className="sr-only">Tipo, data, local e participantes do evento.</DialogDescription>
            <button type="button" aria-label="Fechar" onClick={() => onOpenChange(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-[#8a97ad] shadow-[4px_4px_9px_#d6deeb,-4px_-4px_9px_#fff]">×</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-color:#d6deeb_transparent] [scrollbar-width:thin]">
            <div className="mb-3.5">
              <span className="mb-2 ml-1 block text-xs text-[#8a97ad]">Tipo</span>
              <div className="flex gap-1.5 p-0.5">
                {TYPES.map((item) => (
                  <button key={item.id} type="button" aria-pressed={form.type === item.id} onClick={() => chooseType(item.id)} className={cn(chip, form.type === item.id && 'font-bold text-[#12274a] shadow-[0_0_0_1.5px_#4cd1d4]')}>
                    <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {birthday ? null : (
              <>
                <div className="mb-3.5">
                  <input value={form.title} onChange={(change) => { setForm({ ...form, title: change.target.value }); setTitleError(false); }} placeholder="Título do evento" className={cn(field, 'text-base font-medium', titleError && 'shadow-[0_0_0_2px_#f0647a]')} />
                </div>
                <div className="mb-3.5">
                  <textarea value={form.description} onChange={(change) => setForm({ ...form, description: change.target.value })} placeholder="Descrição (opcional)" className={cn(field, 'h-16 resize-none py-3 leading-snug')} />
                </div>
              </>
            )}
            <div className="mb-3.5">
              <span className="mb-2 ml-1 block text-xs text-[#8a97ad]">{birthday ? 'Data' : 'Quando'}</span>
              <div className="flex items-center gap-2.5">
                <input type="date" required value={form.date} onChange={(change) => setForm({ ...form, date: change.target.value })} className={field} />
                {multi && !birthday ? <span className="text-[13px] text-[#8a97ad]">até</span> : null}
                {multi && !birthday ? <input type="date" min={form.date} value={endDate} onChange={(change) => setEndDate(change.target.value)} className={field} /> : null}
              </div>
              {birthday || event ? null : (
                <div className="mt-3 flex items-center justify-between gap-2.5 px-1">
                  <button type="button" onClick={() => { setMulti((value) => !value); setPerDay(false); }} className="text-[13px] font-medium text-[#7a2cff]">
                    {multi ? '− Apenas um dia' : '+ Vários dias'}
                  </button>
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                    <input type="checkbox" className="peer sr-only" checked={allDay} onChange={(change) => { setAllDay(change.target.checked); if (change.target.checked) setPerDay(false); }} />
                    <span className="relative h-[26px] w-[46px] rounded-full bg-[#d6deeb] transition peer-checked:bg-[#4cd1d4] after:absolute after:top-[3px] after:left-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                    Dia inteiro
                  </label>
                </div>
              )}
              {!birthday && !event && multi && !allDay ? (
                <label className="mt-3 ml-1 flex w-fit cursor-pointer items-center gap-2.5 text-[13px]">
                  <input type="checkbox" className="peer sr-only" checked={perDay} onChange={(change) => setPerDay(change.target.checked)} />
                  <span className="relative h-[26px] w-[46px] rounded-full bg-[#d6deeb] transition peer-checked:bg-[#4cd1d4] after:absolute after:top-[3px] after:left-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                  Horários diferentes por dia
                </label>
              ) : null}
              {birthday || allDay || (perDay && multi) ? null : (
                <div className="mt-3 flex items-center gap-2.5">
                  <input type="time" value={form.startTime} onChange={(change) => setForm({ ...form, startTime: change.target.value })} className={field} />
                  <span className="text-[13px] text-[#8a97ad]">até</span>
                  <input type="time" value={form.endTime} onChange={(change) => setForm({ ...form, endTime: change.target.value })} className={field} />
                </div>
              )}
              {!birthday && perDay && multi && !allDay ? (
                <div className="mt-3 flex max-h-[132px] flex-col gap-2 overflow-y-auto pr-1 [scrollbar-color:#d6deeb_transparent] [scrollbar-width:thin]">
                  {dates.map((date) => (
                    <div key={date} className="grid grid-cols-[86px_1fr_1fr] items-center gap-2">
                      <b className="text-[13px] font-medium">{labelDate(date)}</b>
                      <input type="time" value={dayTimes[date]?.start ?? form.startTime} onChange={(change) => setDayTimes((current) => ({ ...current, [date]: { start: change.target.value, end: current[date]?.end ?? form.endTime } }))} className={cn(field, 'h-[38px] rounded-2xl px-3 text-[13px]')} />
                      <input type="time" value={dayTimes[date]?.end ?? form.endTime} onChange={(change) => setDayTimes((current) => ({ ...current, [date]: { start: current[date]?.start ?? form.startTime, end: change.target.value } }))} className={cn(field, 'h-[38px] rounded-2xl px-3 text-[13px]')} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {birthday ? (
              <div className="mb-3.5">
                <span className="mb-2 ml-1 block text-xs text-[#8a97ad]">De quem é o aniversário</span>
                {form.personId ? (
                  <div className="flex h-11 items-center gap-2.5 rounded-[18px] bg-[#f0f3f9] px-2.5 text-sm font-medium">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[10.5px] font-bold">{initials(form.personName)}</span>
                    {form.personName}
                    <button type="button" aria-label="Remover" onClick={() => setForm((current) => ({ ...current, personId: '', personName: '', avatar: '', title: '' }))} className="ml-auto text-lg text-[#8a97ad]">×</button>
                  </div>
                ) : (
                  <div ref={birthdayRef} className="relative">
                    <input value={personQuery} onFocus={() => setBirthdayOpen(true)} onChange={(change) => { setPersonQuery(change.target.value); setBirthdayOpen(true); setPersonError(false); }} placeholder="Buscar pessoa…" className={cn(field, 'pl-10', personError && 'shadow-[0_0_0_2px_#f0647a]')} />
                    <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#8a97ad]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    {birthdayOpen ? (
                      <div className="absolute right-0 left-0 z-30 mt-2 max-h-[184px] overflow-y-auto rounded-[22px] bg-white p-1.5 shadow-[14px_14px_30px_#d6deeb,-8px_-8px_22px_#fff] [scrollbar-color:#d6deeb_transparent] [scrollbar-width:thin]">
                        {personMatches.length === 0 ? <p className="px-3 py-3 text-center text-[13px] text-[#8a97ad]">Ninguém encontrado</p> : personMatches.map((person) => (
                          <button key={person.id} type="button" onMouseDown={(click) => { click.preventDefault(); chooseBirthday(person); }} className="flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-sm hover:bg-[#f0f3f9]">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0f3f9] text-[10.5px] font-bold">{initials(person.name)}</span>
                            {person.name}
                            <em className="ml-auto text-[11px] text-[#8a97ad] not-italic">{person.department}</em>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3.5">
                  <input value={form.place} onChange={(change) => setForm({ ...form, place: change.target.value })} placeholder="Local (sala, link ou endereço)" className={field} />
                </div>
                <div>
                  <span className="mb-2 ml-1 block text-xs text-[#8a97ad]">Participantes</span>
                  <div className="flex flex-wrap items-center gap-2.5 p-0.5">
                    {mode === 'all' ? null : (
                      <div ref={searchRef} className="relative min-w-[180px] flex-1">
                        <input value={query} onFocus={() => { setPeopleOpen(true); setFilterOpen(false); }} onChange={(change) => { setQuery(change.target.value); setPeopleOpen(true); }} placeholder="Buscar pessoa…" className={cn(field, 'pl-10')} />
                        <svg className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#8a97ad]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        {peopleOpen ? (
                          <div className="absolute right-0 left-0 z-30 mt-2 max-h-[184px] overflow-y-auto rounded-[22px] bg-white p-1.5 shadow-[14px_14px_30px_#d6deeb,-8px_-8px_22px_#fff] [scrollbar-color:#d6deeb_transparent] [scrollbar-width:thin]">
                            {inviteMatches.length === 0 ? <p className="px-3 py-3 text-center text-[13px] text-[#8a97ad]">Ninguém encontrado</p> : inviteMatches.map((person) => (
                              <button key={person.id} type="button" onMouseDown={(click) => { click.preventDefault(); setMode('pick'); setPicked((current) => [...current, person.id]); setQuery(''); }} className="flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-sm hover:bg-[#f0f3f9]">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0f3f9] text-[10.5px] font-bold">{initials(person.name)}</span>
                                {person.name}
                                <em className="ml-auto text-[11px] text-[#8a97ad] not-italic">{person.department}</em>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {mode === 'all' ? null : (
                      <div ref={filterRef} className="relative">
                        <button type="button" aria-label="Filtrar por equipe" aria-pressed={sectors.length > 0} onClick={() => { setFilterOpen((value) => !value); setPeopleOpen(false); }} className={cn('relative grid h-[42px] w-[42px] place-items-center rounded-full bg-white text-[#8a97ad] shadow-[4px_4px_9px_#d6deeb,-4px_-4px_9px_#fff]', sectors.length > 0 && 'text-[#12274a] shadow-[0_0_0_1.5px_#4cd1d4]')}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
                          {sectors.length ? <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gradient-to-b from-[#7a2cff] to-[#6417f0] px-1 text-[10.5px] font-bold text-white">{sectors.length}</span> : null}
                        </button>
                        {filterOpen ? (
                          <div className="absolute top-[calc(100%+10px)] right-0 z-30 flex w-[200px] flex-col gap-2 rounded-[22px] bg-white p-2.5 shadow-[14px_14px_30px_#d6deeb,-8px_-8px_22px_#fff]">
                            {departments.map((name) => {
                              const count = directoryPeople.filter((person) => person.department === name).length;
                              const on = sectors.includes(name);
                              return (
                                <button key={name} type="button" aria-pressed={on} onClick={() => { setMode('pick'); setSectors((current) => on ? current.filter((item) => item !== name) : [...current, name]); }} className={cn('flex h-[38px] items-center justify-between rounded-full bg-white px-3.5 text-[13px] font-medium text-[#8a97ad] shadow-[3px_3px_7px_#d6deeb,-3px_-3px_7px_#fff]', on && 'font-bold text-[#12274a] shadow-[0_0_0_1.5px_#4cd1d4]')}>
                                  {name}<em className="text-[11.5px] font-normal not-italic opacity-70">{count}</em>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <button type="button" aria-pressed={mode === 'all'} onClick={() => { setMode(mode === 'all' ? 'me' : 'all'); setSectors([]); setPicked([]); setFilterOpen(false); setPeopleOpen(false); }} className={cn(chip, 'h-[42px] flex-none px-4', mode === 'all' && 'font-bold text-[#12274a] shadow-[0_0_0_1.5px_#4cd1d4]')}>Todos</button>
                    <button type="button" aria-pressed={onlyOrganizer} onClick={() => { setMode('me'); setSectors([]); setPicked([]); setFilterOpen(false); setPeopleOpen(false); }} className={cn(chip, 'h-[42px] flex-none px-4', onlyOrganizer && 'font-bold text-[#12274a] shadow-[0_0_0_1.5px_#4cd1d4]')}>Somente organizador</button>
                  </div>
                  {mode === 'all' || (sectors.length === 0 && picked.length === 0) ? null : (
                    <div className="mt-3 flex max-h-[72px] flex-wrap content-start gap-2 overflow-y-auto p-0.5 [scrollbar-color:#d6deeb_transparent] [scrollbar-width:thin]">
                      {sectors.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-2 pl-3.5 text-[12.5px] font-medium shadow-[3px_3px_7px_#d6deeb,-3px_-3px_7px_#fff]">
                          {name} · {directoryPeople.filter((person) => person.department === name).length}
                          <button type="button" aria-label={`Remover ${name}`} onClick={() => setSectors((current) => current.filter((item) => item !== name))} className="text-sm text-[#8a97ad]">×</button>
                        </span>
                      ))}
                      {directoryPeople.filter((person) => picked.includes(person.id) && !sectors.includes(person.department)).map((person) => (
                        <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pr-2 pl-1 text-[12.5px] font-medium shadow-[3px_3px_7px_#d6deeb,-3px_-3px_7px_#fff]">
                          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#f0f3f9] text-[9px] font-bold">{initials(person.name)}</span>
                          {person.name.split(' ')[0]}
                          <button type="button" aria-label={`Remover ${person.name}`} onClick={() => setPicked((current) => current.filter((id) => id !== person.id))} className="text-sm text-[#8a97ad]">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eceff5] pt-4">
            {birthday ? <span /> : <p className="pl-1 text-[13px] text-[#8a97ad]">{onlyOrganizer ? <b className="font-bold text-[#12274a]">Sem convidados</b> : <><b className="font-bold text-[#12274a]">{invited.length}</b> {invited.length === 1 ? 'participante' : 'participantes'}</>}</p>}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-full px-6 py-3 text-sm font-medium text-[#8a97ad]">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-b from-[#7a2cff] to-[#6417f0] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_18px_rgba(100,23,240,0.3)] disabled:opacity-60">{event ? 'Salvar' : 'Criar evento'}</button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
