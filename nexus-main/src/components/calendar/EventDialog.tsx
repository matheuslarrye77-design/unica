import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { teamRoster } from '@/data/team';
import { saveBirthDate } from '@/lib/institution';
import { createEvent, notifyEvents, updateEvent, type AgendaEvent, type AgendaType } from '@/lib/events';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const TYPES: { id: AgendaType; label: string; color: string }[] = [
  { id: 'reuniao', label: 'Reunião', color: '#7c5cf5' },
  { id: 'evento', label: 'Evento', color: '#3b82f6' },
  { id: 'aniversario', label: 'Aniversário', color: '#ec6fb0' },
  { id: 'ferias', label: 'Férias', color: '#22b8a0' },
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
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

type Person = { id: string; name: string; sector: string; avatar: string };

const SECTORS = [
  { id: 'Chat', label: 'Chat' },
  { id: 'E-mail', label: 'E-mail' },
  { id: 'Ligação', label: 'Ligação' },
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

const field = 'h-[42px] w-full rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] px-[13px] text-sm font-normal text-[#1f1b2e] outline-none placeholder:text-[#b4b0c6] transition focus:border-[#9b82ff] focus:bg-white';
const label = 'mb-[7px] block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase';
const typeChip = 'inline-flex h-10 min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 overflow-hidden rounded-[11px] border border-[#e8e4f4] bg-white px-1 text-[12.5px] font-medium whitespace-nowrap text-[#4a4560] transition-[flex-grow,height,background,border-color,color,box-shadow] duration-300';
const typeOn = 'h-[46px] flex-[1.8] border-[#6644e0] bg-[#6644e0] text-[13.5px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)] hover:border-[#6644e0] hover:bg-[#6644e0]';
const actionChip = 'inline-flex h-[42px] shrink-0 items-center justify-center rounded-[11px] border border-[#e8e4f4] bg-white px-[15px] text-[12.5px] font-medium text-[#4a4560] hover:border-[#d9ccff] hover:bg-[#f6f3ff]';
const actionOn = 'border-[#6644e0] bg-[#6644e0] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)] hover:bg-[#6644e0]';
const toggle = 'relative h-5 w-[34px] shrink-0 rounded-full bg-[#d9d5e8] transition peer-checked:bg-[#7c5cf5] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-3.5';

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

  const people = useMemo<Person[]>(() => teamRoster.map((member) => ({
    id: member.id,
    name: member.name,
    sector: member.funcao,
    avatar: member.avatar,
  })), []);

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

  function covered(person: Person) {
    return mode === 'all' || sectors.includes(person.sector);
  }

  const invited = people.filter((person) => covered(person) || picked.includes(person.id));
  const onlyOrganizer = mode !== 'all' && sectors.length === 0 && picked.length === 0;

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

  function chooseBirthday(person: Person) {
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

  const personMatches = people.filter((person) => person.name.toLowerCase().includes(personQuery.trim().toLowerCase()));
  const inviteMatches = people.filter((person) => !covered(person) && !picked.includes(person.id) && person.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} overlayClassName="bg-[rgba(31,27,46,0.45)]" className={cn('!flex max-h-[min(92vh,760px)] w-[min(560px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !rounded-[22px] !border-0 !bg-white !p-0 text-[#1f1b2e] shadow-[0_30px_80px_-20px_rgba(79,51,184,0.35),0_2px_6px_rgba(31,27,46,0.06)]', peopleOpen || filterOpen || birthdayOpen ? '!overflow-visible' : '!overflow-hidden')}>
        <form className="flex min-h-0 flex-1 flex-col px-6 pt-[22px] pb-5 sm:px-[26px]" onSubmit={(submitEvent) => void submit(submitEvent)}>
          <div className="mb-3.5 flex items-center justify-between">
            <DialogTitle className="text-[18px] font-bold tracking-tight">{event ? 'Editar evento' : 'Novo evento'}</DialogTitle>
            <DialogDescription className="sr-only">Tipo, data, local e participantes do evento.</DialogDescription>
            <button type="button" aria-label="Fechar" onClick={() => onOpenChange(false)} className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg leading-none text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">×</button>
          </div>
          <div className={cn('min-h-0 flex-1 pr-1 [scrollbar-color:#d9ccff_transparent] [scrollbar-width:thin]', peopleOpen || filterOpen || birthdayOpen ? 'overflow-visible' : 'overflow-y-auto')}>
            <div className="mb-3">
              <span className={label}>Tipo</span>
              <div className="flex items-center gap-1.5">
                {TYPES.map((item) => {
                  const on = form.type === item.id;
                  return (
                    <button key={item.id} type="button" aria-pressed={on} onClick={() => chooseType(item.id)} className={cn(typeChip, on ? typeOn : 'hover:flex-[1.4] hover:border-[#d9ccff] hover:bg-[#f6f3ff]', 'max-[480px]:text-[11px]')}>
                      <i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: on ? '#fff' : item.color }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {birthday ? null : (
              <>
                <div className="mb-3">
                  <input value={form.title} onChange={(change) => { setForm({ ...form, title: change.target.value }); setTitleError(false); }} placeholder="Título do evento" className={cn(field, titleError && 'border-[#e5484d]')} />
                </div>
                <div className="mb-3">
                  <textarea value={form.description} onChange={(change) => setForm({ ...form, description: change.target.value })} placeholder="Descrição (opcional)" className={cn(field, 'h-[62px] resize-none py-2.5 leading-snug transition-[height,border-color,background] duration-300 focus:h-[150px]')} />
                </div>
              </>
            )}
            <div className="mb-3">
              <span className={label}>{birthday ? 'Data' : 'Quando'}</span>
              <div className="flex items-center gap-2.5">
                <input type="date" required value={form.date} onChange={(change) => setForm({ ...form, date: change.target.value })} className={field} />
                {multi && !birthday ? <span className="text-[13px] text-[#8a85a0]">até</span> : null}
                {multi && !birthday ? <input type="date" min={form.date} value={endDate} onChange={(change) => setEndDate(change.target.value)} className={field} /> : null}
              </div>
              {birthday ? null : (
                <div className="mt-[9px] flex items-center justify-between gap-2.5">
                  <label className="flex w-fit cursor-pointer items-center gap-[9px] text-[13px] text-[#4a4560] select-none">
                    <input type="checkbox" className="peer sr-only" checked={allDay} onChange={(change) => { setAllDay(change.target.checked); if (change.target.checked) setPerDay(false); }} />
                    <span className={toggle} />
                    Dia inteiro
                  </label>
                  {event ? null : (
                    <button type="button" onClick={() => { setMulti((value) => !value); setPerDay(false); }} className="text-[13px] font-semibold text-[#6644e0] hover:text-[#4f33b8]">
                      {multi ? '− Apenas um dia' : '+ Vários dias'}
                    </button>
                  )}
                </div>
              )}
              {!birthday && !event && multi && !allDay ? (
                <label className="mt-[9px] flex w-fit cursor-pointer items-center gap-[9px] text-[13px] text-[#4a4560] select-none">
                  <input type="checkbox" className="peer sr-only" checked={perDay} onChange={(change) => setPerDay(change.target.checked)} />
                  <span className={toggle} />
                  Horários diferentes por dia
                </label>
              ) : null}
              {birthday || allDay || (perDay && multi) ? null : (
                <div className="mt-[9px] flex items-center gap-2.5">
                  <input type="time" value={form.startTime} onChange={(change) => setForm({ ...form, startTime: change.target.value })} className={field} />
                  <span className="text-[13px] text-[#8a85a0]">até</span>
                  <input type="time" value={form.endTime} onChange={(change) => setForm({ ...form, endTime: change.target.value })} className={field} />
                </div>
              )}
              {!birthday && perDay && multi && !allDay ? (
                <div className="mt-[9px] flex max-h-32 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-color:#d9ccff_transparent] [scrollbar-width:thin]">
                  {dates.map((date) => (
                    <div key={date} className="grid grid-cols-[86px_1fr_1fr] items-center gap-2">
                      <b className="text-[12.5px] font-semibold text-[#4f33b8]">{labelDate(date)}</b>
                      <input type="time" value={dayTimes[date]?.start ?? form.startTime} onChange={(change) => setDayTimes((current) => ({ ...current, [date]: { start: change.target.value, end: current[date]?.end ?? form.endTime } }))} className={cn(field, 'h-9 px-2.5 text-[13px]')} />
                      <input type="time" value={dayTimes[date]?.end ?? form.endTime} onChange={(change) => setDayTimes((current) => ({ ...current, [date]: { start: current[date]?.start ?? form.startTime, end: change.target.value } }))} className={cn(field, 'h-9 px-2.5 text-[13px]')} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {birthday ? (
              <div className="mb-3">
                <span className={label}>De quem é o aniversário</span>
                {form.personId ? (
                  <div className="mx-[3px] flex h-11 items-center gap-2.5 rounded-full bg-white pr-3 pl-2 text-sm font-semibold text-[#4f33b8] shadow-[4px_4px_10px_#d8d2ee,-4px_-4px_10px_#fff]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ece6ff] text-[10.5px] font-bold">{initials(form.personName)}</span>
                    {form.personName}
                    <button type="button" aria-label="Remover" onClick={() => setForm((current) => ({ ...current, personId: '', personName: '', avatar: '', title: '' }))} className="ml-auto text-lg leading-none text-[#9b82ff] hover:text-[#4f33b8]">×</button>
                  </div>
                ) : (
                  <div ref={birthdayRef} className="relative">
                    <input value={personQuery} onFocus={() => setBirthdayOpen(true)} onChange={(change) => { setPersonQuery(change.target.value); setBirthdayOpen(true); setPersonError(false); }} placeholder="Buscar pessoa…" className={cn(field, 'pl-[37px]', personError && 'border-[#e5484d]')} />
                    <svg className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-[#8a85a0]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    {birthdayOpen ? (
                      <div className="absolute right-0 bottom-[calc(100%+8px)] left-0 z-30 max-h-[184px] overflow-y-auto rounded-[22px] bg-white p-1.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4] [scrollbar-color:#d9ccff_transparent] [scrollbar-width:thin]">
                        {personMatches.length === 0 ? <p className="px-3 py-3 text-center text-[13px] text-[#8a85a0]">Ninguém encontrado</p> : personMatches.map((person) => (
                          <button key={person.id} type="button" onMouseDown={(click) => { click.preventDefault(); chooseBirthday(person); }} className="flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-[13.5px] hover:bg-white hover:shadow-[3px_3px_8px_#d8d2ee,-3px_-3px_8px_#fff]">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[10.5px] font-bold text-[#4f33b8]">{initials(person.name)}</span>
                            {person.name}
                            <em className="ml-auto text-[11px] text-[#8a85a0] not-italic">{person.sector}</em>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <input value={form.place} onChange={(change) => setForm({ ...form, place: change.target.value })} placeholder="Local (sala, link ou endereço)" className={field} />
                </div>
                <div className="mb-0">
                  <span className={label}>Participantes</span>
                  <div className={cn('flex items-center gap-2', mode === 'all' && 'justify-end')}>
                    {mode === 'all' ? null : (
                      <div ref={searchRef} className="relative min-w-0 flex-1">
                        <input value={query} onFocus={() => { setPeopleOpen(true); setFilterOpen(false); }} onChange={(change) => { setQuery(change.target.value); setPeopleOpen(true); }} placeholder="Buscar pessoa…" className={cn(field, 'pl-[37px]')} />
                        <svg className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-[#8a85a0]" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                        {peopleOpen ? (
                          <div className="absolute right-0 bottom-[calc(100%+8px)] left-0 z-30 max-h-[184px] overflow-y-auto rounded-[22px] bg-white p-1.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4] [scrollbar-color:#d9ccff_transparent] [scrollbar-width:thin]">
                            {inviteMatches.length === 0 ? <p className="px-3 py-3 text-center text-[13px] text-[#8a85a0]">Ninguém encontrado</p> : inviteMatches.map((person) => (
                              <button key={person.id} type="button" onMouseDown={(click) => { click.preventDefault(); setMode('pick'); setPicked((current) => [...current, person.id]); setQuery(''); }} className="flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-[13.5px] hover:bg-white hover:shadow-[3px_3px_8px_#d8d2ee,-3px_-3px_8px_#fff]">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[10.5px] font-bold text-[#4f33b8]">{initials(person.name)}</span>
                                {person.name}
                                <em className="ml-auto text-[11px] text-[#8a85a0] not-italic">{person.sector}</em>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {mode === 'all' ? null : (
                      <div ref={filterRef} className="relative shrink-0">
                        <button type="button" aria-label="Filtrar por equipe" aria-pressed={sectors.length > 0} onClick={() => { setFilterOpen((value) => !value); setPeopleOpen(false); }} className={cn('relative grid h-[42px] w-[42px] place-items-center rounded-[11px] border border-[#e8e4f4] bg-white text-[#6b6682] hover:border-[#d9ccff] hover:bg-[#f6f3ff] hover:text-[#6644e0]', sectors.length > 0 && 'border-[#9b82ff] bg-[#f6f3ff] text-[#6644e0]')}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
                          {sectors.length ? <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#6644e0] px-[5px] text-[10.5px] font-bold text-white">{sectors.length}</span> : null}
                        </button>
                        {filterOpen ? (
                          <div className="absolute right-0 bottom-[calc(100%+10px)] z-30 flex w-[200px] flex-col gap-[7px] rounded-[22px] bg-white p-2.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4]">
                            {SECTORS.map((sector) => {
                              const count = people.filter((person) => person.sector === sector.id).length;
                              const on = sectors.includes(sector.id);
                              return (
                                <button key={sector.id} type="button" aria-pressed={on} onClick={() => { setMode('pick'); setSectors((current) => on ? current.filter((item) => item !== sector.id) : [...current, sector.id]); }} className={cn('flex h-[38px] items-center justify-between rounded-full border-0 bg-white px-3.5 text-[13px] font-medium text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]', on && 'bg-[#f6f3ff] font-semibold text-[#4f33b8] shadow-[0_0_0_1.5px_#7c5cf5]')}>
                                  {sector.label}<em className="text-[11.5px] font-normal not-italic opacity-70">{count}</em>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <button type="button" aria-pressed={mode === 'all'} onClick={() => { setMode(mode === 'all' ? 'me' : 'all'); setSectors([]); setPicked([]); setFilterOpen(false); setPeopleOpen(false); }} className={cn(actionChip, mode === 'all' && actionOn)}>Todos</button>
                    <button type="button" aria-pressed={onlyOrganizer} onClick={() => { setMode('me'); setSectors([]); setPicked([]); setFilterOpen(false); setPeopleOpen(false); }} className={cn(actionChip, onlyOrganizer && actionOn)}>Só eu</button>
                  </div>
                  {mode === 'all' || (sectors.length === 0 && picked.length === 0) ? null : (
                    <div className="mt-3 flex max-h-[74px] flex-wrap content-start gap-2 overflow-y-auto p-[3px] [scrollbar-color:#d9ccff_transparent] [scrollbar-width:thin]">
                      {sectors.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white py-[5px] pr-2 pl-3.5 text-[12.5px] font-medium text-[#4f33b8] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]">
                          {name} · {people.filter((person) => person.sector === name).length}
                          <button type="button" aria-label={`Remover ${name}`} onClick={() => setSectors((current) => current.filter((item) => item !== name))} className="text-sm leading-none text-[#9b82ff] hover:text-[#4f33b8]">×</button>
                        </span>
                      ))}
                      {people.filter((person) => picked.includes(person.id) && !sectors.includes(person.sector)).map((person) => (
                        <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pr-2 pl-1 text-[12.5px] font-medium text-[#4f33b8] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]">
                          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#ece6ff] text-[9px] font-bold">{initials(person.name)}</span>
                          {person.name.split(' ')[0]}
                          <button type="button" aria-label={`Remover ${person.name}`} onClick={() => setPicked((current) => current.filter((id) => id !== person.id))} className="px-0.5 text-sm leading-none text-[#9b82ff] hover:text-[#4f33b8]">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[#e8e4f4] pt-3.5">
            {birthday ? <span /> : <p className="text-[13px] text-[#8a85a0]">{onlyOrganizer ? <b className="font-bold text-[#4f33b8]">Só você</b> : <><b className="font-bold text-[#4f33b8]">{invited.length}</b> {invited.length === 1 ? 'participante' : 'participantes'}</>}</p>}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-[11px] px-5 py-[11px] text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-[11px] bg-[#6644e0] px-5 py-[11px] text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8] disabled:bg-[#d9ccff] disabled:shadow-none">{event ? 'Salvar' : 'Criar evento'}</button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
