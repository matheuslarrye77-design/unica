import { OrnamentArt, ORNAMENTS } from '@/components/celebrations/OrnamentArt';
import { CelebrationScene } from '@/components/celebrations/Scenes';
import { calendarEvents } from '@/data/mockData';
import { uploadMedia } from '@/lib/feed';
import {
  createCollectiveEdition,
  celebrationPersonId,
  loadCelebration,
  moveOrnament,
  publishOrnament,
  registerBirthday,
  removeOrnament,
  saveCelebrationSettings,
  type CelebrationEdition,
  type Ornament,
  type OrnamentMedia,
} from '@/lib/celebrations';
import { actor, useDemoProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Cake, TreePine, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FC, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

function labelDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export const CelebrationsCenter: FC = () => {
  const demo = useDemoProfile();
  const [params, setParams] = useSearchParams();
  const scope = params.get('escopo') === 'equipe' ? 'equipe' : 'aniversarios';
  const selectedPerson = params.get('pessoa') ?? '';
  const selectedEdition = params.get('edicao') ?? '';
  const [edition, setEdition] = useState<CelebrationEdition | null>(null);
  const [editions, setEditions] = useState<CelebrationEdition[]>([]);
  const [ornaments, setOrnaments] = useState<Ornament[]>([]);
  const [leader, setLeader] = useState(false);
  const [viewerId, setViewerId] = useState('');
  const [mode, setMode] = useState<'decorar' | 'ler'>('ler');
  const [draftKind, setDraftKind] = useState('bombom');
  const [message, setMessage] = useState('');
  const [media, setMedia] = useState<OrnamentMedia | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const people = useMemo(() => calendarEvents.filter((event) => event.type === 'birthday' && event.personName).map((event) => ({
    id: celebrationPersonId(event.personName ?? ''),
    name: event.personName ?? '',
    avatar: event.avatar ?? '',
    month: event.date.getMonth() + 1,
    day: event.date.getDate(),
  })), []);

  const person = people.find((item) => item.id === selectedPerson) ?? people[0];

  async function refresh() {
    if (scope === 'aniversarios') {
      if (!person) return;
      await registerBirthday({ personId: person.id, name: person.name, avatar: person.avatar, month: person.month, day: person.day });
      const payload = await loadCelebration(`scope=birthday&personId=${encodeURIComponent(person.id)}`);
      setEdition(payload.edition);
      setOrnaments(payload.ornaments);
      setLeader(payload.viewer.leader);
      setViewerId(payload.viewer.id);
      setEditions(payload.editions);
      return;
    }
    const payload = await loadCelebration(`scope=collective${selectedEdition ? `&editionId=${encodeURIComponent(selectedEdition)}` : ''}`);
    const current = payload.edition ?? payload.editions[0] ?? null;
    if (current && current.id !== selectedEdition) {
      const next = new URLSearchParams(params);
      next.set('edicao', current.id);
      setParams(next, { replace: true });
    }
    if (!current) {
      setEdition(null);
      setOrnaments([]);
      setEditions(payload.editions);
      return;
    }
    const full = current.id === payload.edition?.id ? payload : await loadCelebration(`scope=collective&editionId=${encodeURIComponent(current.id)}`);
    setEdition(full.edition);
    setOrnaments(full.ornaments);
    setLeader(full.viewer.leader);
    setViewerId(full.viewer.id);
    setEditions(full.editions);
  }

  useEffect(() => {
    void refresh().catch(() => toast.error('Não foi possível carregar a celebração.'));
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 12000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [scope, person?.id, selectedEdition, demo]);

  const catalog = ORNAMENTS.filter((item) => item.themes.includes(edition?.theme || (scope === 'aniversarios' ? 'bolo' : 'extra')));
  const opened = ornaments.find((item) => item.id === openId) ?? null;
  const selected = ornaments.find((item) => item.id === selectedId) ?? null;

  function chooseScope(next: 'aniversarios' | 'equipe') {
    const query = new URLSearchParams(params);
    query.set('tipo', 'aniversarios');
    query.set('escopo', next);
    setParams(query);
  }

  async function publish() {
    if (!edition) return;
    setBusy(true);
    try {
      const spot = freeSpot(ornaments);
      await publishOrnament({ editionId: edition.id, kind: draftKind, message, media, scale: 1, ...spot });
      setMessage('');
      setMedia(null);
      await refresh();
      toast.success('Recado publicado no enfeite.');
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'closed' ? 'O prazo para novos recados encerrou.' : 'Não foi possível publicar.');
    } finally {
      setBusy(false);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, ornament: Ornament) {
    if (mode !== 'decorar') {
      setOpenId(ornament.id);
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: ornament.x, y: ornament.y };
    const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
    let moved = false;
    setSelectedId(ornament.id);
    const move = (pointer: Event) => {
      if (!(pointer instanceof PointerEvent) || !bounds) return;
      if (Math.hypot(pointer.clientX - startX, pointer.clientY - startY) > 8) moved = true;
      if (!moved) return;
      const x = Math.min(88, Math.max(8, ((pointer.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.min(88, Math.max(12, ((pointer.clientY - bounds.top) / bounds.height) * 100));
      setOrnaments((current) => current.map((item) => item.id === ornament.id ? { ...item, x, y } : item));
    };
    const up = (pointer: Event) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!(pointer instanceof PointerEvent) || !moved || !bounds) return;
      const x = Math.min(88, Math.max(8, ((pointer.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.min(88, Math.max(12, ((pointer.clientY - bounds.top) / bounds.height) * 100));
      void moveOrnament(ornament.id, { x, y }).catch(() => {
        setOrnaments((current) => current.map((item) => item.id === ornament.id ? { ...item, ...origin } : item));
        toast.error('Não foi possível mover o enfeite.');
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <section className="mt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => chooseScope('aniversarios')} className={cn('grid h-14 w-14 place-items-center rounded-full border', scope === 'aniversarios' ? 'border-[#8E35B8] bg-[#8E35B8] text-white' : 'border-[#E7DFF0] bg-white text-[#6A228C]') } aria-label="Aniversários"><Cake className="h-5 w-5" /></button>
          <button type="button" onClick={() => chooseScope('equipe')} className={cn('grid h-14 w-14 place-items-center rounded-full border', scope === 'equipe' ? 'border-[#8E35B8] bg-[#8E35B8] text-white' : 'border-[#E7DFF0] bg-white text-[#6A228C]')} aria-label="Celebrações da equipe"><TreePine className="h-5 w-5" /></button>
        </div>
        <Link to="/calendar" className="text-[13px] font-medium text-[#6A228C]">Ver calendário</Link>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {scope === 'aniversarios' ? people.map((item) => (
          <button key={item.id} type="button" onClick={() => { const next = new URLSearchParams(params); next.set('pessoa', item.id); setParams(next); }} className={cn('shrink-0 rounded-full px-3 py-1.5 text-[13px]', item.id === person?.id ? 'bg-[#8E35B8] text-white' : 'bg-white text-[#6A228C]')}>{item.name.split(' ')[0]}</button>
        )) : editions.map((item) => (
          <button key={item.id} type="button" onClick={() => { const next = new URLSearchParams(params); next.set('edicao', item.id); setParams(next); }} className={cn('shrink-0 rounded-full px-3 py-1.5 text-[13px]', item.id === edition?.id ? 'bg-[#8E35B8] text-white' : 'bg-white text-[#6A228C]')}>{item.title}</button>
        ))}
      </div>
      {edition ? (
        <p className="mb-3 text-[13px] text-[#8A7C98]">
          {edition.title} · {edition.phase === 'preparing' ? 'Preparação' : edition.phase === 'open' ? 'Aberto' : edition.phase === 'upcoming' ? 'Em breve' : 'Encerrado'} · recados até {labelDate(edition.messageUntil)} · leitura de {labelDate(edition.openAt)} a {labelDate(edition.viewUntil)}
        </p>
      ) : <p className="mb-3 text-[13px] text-[#8A7C98]">Escolha um aniversariante ou uma celebração.</p>}
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setMode('ler')} className={cn('rounded-full px-3 py-1 text-[12px]', mode === 'ler' ? 'bg-[#241B33] text-white' : 'bg-white text-[#5C5168]')}>Ler recados</button>
        <button type="button" onClick={() => setMode('decorar')} className={cn('rounded-full px-3 py-1 text-[12px]', mode === 'decorar' ? 'bg-[#241B33] text-white' : 'bg-white text-[#5C5168]')}>Decorar</button>
      </div>
      <CelebrationScene theme={edition?.theme || 'bolo'}>
        {ornaments.map((ornament) => (
          <button
            key={ornament.id}
            type="button"
            aria-label={`Enfeite de ${ornament.authorName}`}
            onPointerDown={(event) => onPointerDown(event, ornament)}
            className={cn('absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center', selectedId === ornament.id && 'rounded-full ring-2 ring-[#8E35B8]')}
            style={{ left: `${ornament.x}%`, top: `${ornament.y}%`, transform: `translate(-50%, -50%) scale(${ornament.scale})` }}
          >
            <OrnamentArt kind={ornament.kind} />
          </button>
        ))}
      </CelebrationScene>
      {mode === 'decorar' && selected && (selected.authorId === viewerId || leader) ? (
        <div className="mx-auto mt-3 flex max-w-[440px] items-center justify-center gap-2">
          <button type="button" className="rounded-full bg-white px-3 py-1 text-[12px]" onClick={() => void moveOrnament(selected.id, { scale: Math.max(0.7, selected.scale - 0.1) }).then(refresh)}>Menor</button>
          <button type="button" className="rounded-full bg-white px-3 py-1 text-[12px]" onClick={() => void moveOrnament(selected.id, { scale: Math.min(1.4, selected.scale + 0.1) }).then(refresh)}>Maior</button>
          <button type="button" className="rounded-full bg-white px-3 py-1 text-[12px]" onClick={() => setOpenId(selected.id)}>Ler recado</button>
        </div>
      ) : null}
      <div className="mx-auto mt-4 max-w-[440px]">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {catalog.map((item) => (
            <button key={item.id} type="button" onClick={() => setDraftKind(item.id)} className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl border bg-white', draftKind === item.id ? 'border-[#8E35B8]' : 'border-[#F0E7F6]')} aria-label={item.label}>
              <span className="h-8 w-8"><OrnamentArt kind={item.id} /></span>
            </button>
          ))}
        </div>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="Escreva o recado que fica escondido neste enfeite" className="mt-2 min-h-20 w-full rounded-2xl border border-[#E7DFF0] bg-white px-3 py-2 text-sm" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="rounded-full bg-white px-3 py-1.5 text-[12px] text-[#6A228C]">
            Foto ou GIF
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void uploadMedia(file).then((uploaded) => setMedia({ kind: file.type === 'image/gif' ? 'gif' : 'photo', url: uploaded.url })).catch(() => toast.error('Não foi possível enviar o anexo.'));
            }} />
          </label>
          {['coracao', 'estrela', 'festa'].map((sticker) => (
            <button key={sticker} type="button" className="h-9 w-9 rounded-full bg-white p-1" onClick={() => setMedia({ kind: 'sticker', url: `/figurinhas/${sticker}.svg` })} aria-label={sticker}>
              <img src={`/figurinhas/${sticker}.svg`} alt="" />
            </button>
          ))}
          <button type="button" disabled={busy || !edition?.writable || message.trim().length < 1} onClick={() => void publish()} className="ml-auto rounded-full bg-[#8E35B8] px-4 py-2 text-sm text-white disabled:opacity-40">Publicar</button>
        </div>
        {edition && !edition.writable ? <p className="mt-2 text-[12px] text-[#8A7C98]">Novos recados estão bloqueados neste período.</p> : null}
      </div>
      {leader ? <LeaderTools onSaved={refresh} /> : null}
      {opened ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#241B33]/40 p-4" onClick={() => setOpenId(null)}>
          <article className="w-full max-w-sm rounded-3xl bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <img src={opened.authorAvatar} alt="" className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#241B33]">{opened.authorName}</p>
                <p className="text-[12px] text-[#8A7C98]">{new Date(opened.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setOpenId(null)}><X className="h-4 w-4" /></button>
            </div>
            {opened.sealed ? <p className="mt-4 text-sm text-[#6A228C]">Este recado ainda não foi liberado.</p> : (
              <>
                <p className="mt-4 whitespace-pre-wrap text-sm text-[#241B33]">{opened.message}</p>
                {opened.media ? <img src={opened.media.url} alt="" className="mt-3 max-h-48 rounded-2xl" /> : null}
              </>
            )}
            {(opened.authorId === viewerId || leader) && edition?.writable && !opened.sealed ? (
              <div className="mt-4 flex gap-3">
                <button type="button" className="text-[13px] text-[#6A228C]" onClick={() => {
                  const next = window.prompt('Editar recado', opened.message);
                  if (!next?.trim()) return;
                  void moveOrnament(opened.id, { message: next.trim() }).then(refresh);
                }}>Editar recado</button>
                <button type="button" className="text-[13px] text-[#BE185D]" onClick={() => void removeOrnament(opened.id).then(() => { setOpenId(null); return refresh(); })}>Remover enfeite</button>
              </div>
            ) : null}
          </article>
        </div>
      ) : null}
      <p className="sr-only">{actor().name}</p>
    </section>
  );
};

function freeSpot(ornaments: Ornament[]) {
  let x = 50;
  let y = 42;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const clash = ornaments.some((item) => Math.hypot(item.x - x, item.y - y) < 10);
    if (!clash) return { x, y };
    x = 20 + ((attempt * 17) % 60);
    y = 28 + ((attempt * 11) % 40);
  }
  return { x, y };
}

const LeaderTools: FC<{ onSaved: () => Promise<void> }> = ({ onSaved }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Celebração da equipe');
  const [theme, setTheme] = useState('extra');
  const [prepareFrom, setPrepareFrom] = useState('');
  const [messageUntil, setMessageUntil] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [viewUntil, setViewUntil] = useState('');
  if (!open) return <button type="button" className="mt-4 text-[12px] text-[#6A228C]" onClick={() => setOpen(true)}>Configurar períodos</button>;
  return (
    <form className="mt-4 grid gap-2 rounded-2xl bg-white p-3 text-[13px]" onSubmit={(event) => {
      event.preventDefault();
      void createCollectiveEdition({ theme, title, prepareFrom, messageUntil, openAt, viewUntil }).then(() => onSaved()).then(() => setOpen(false)).catch(() => toast.error('Não foi possível criar a celebração.'));
    }}>
      <p className="font-medium text-[#241B33]">Nova celebração da equipe</p>
      <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border px-3 py-2" placeholder="Título" />
      <select value={theme} onChange={(event) => setTheme(event.target.value)} className="rounded-xl border px-3 py-2">
        {['extra', 'natal', 'anonovo', 'carnaval', 'halloween', 'namorados', 'pascoa', 'maes', 'pais', 'trabalhador'].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <label className="grid gap-1">Início da preparação<input type="date" value={prepareFrom} onChange={(event) => setPrepareFrom(event.target.value)} className="rounded-xl border px-3 py-2" /></label>
      <label className="grid gap-1">Prazo dos recados<input type="date" value={messageUntil} onChange={(event) => setMessageUntil(event.target.value)} className="rounded-xl border px-3 py-2" /></label>
      <label className="grid gap-1">Abertura da leitura<input type="date" value={openAt} onChange={(event) => setOpenAt(event.target.value)} className="rounded-xl border px-3 py-2" /></label>
      <label className="grid gap-1">Encerramento<input type="date" value={viewUntil} onChange={(event) => setViewUntil(event.target.value)} className="rounded-xl border px-3 py-2" /></label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-full bg-[#8E35B8] px-3 py-1.5 text-white">Criar</button>
        <button type="button" className="rounded-full bg-[#F8EAFB] px-3 py-1.5" onClick={() => void saveCelebrationSettings(2).then(() => onSaved())}>Retenção de 2 meses</button>
      </div>
    </form>
  );
};
