import { BIRTHDAY_STICKERS, birthdayStickerArt } from '@/data/birthdayStickers';
import { MURAL_FIGURINES } from '@/data/muralStickers';
import { calendarEvents } from '@/data/mockData';
import {
  loadBirthdayCard,
  placeBirthdaySticker,
  updateBirthdaySticker,
  type BirthdaySticker,
} from '@/lib/birthdayCard';
import { celebrationPersonId } from '@/lib/celebrations';
import { parseAgendaDate, useAgendaEvents } from '@/lib/events';
import { useDemoProfile } from '@/lib/session';
import { listStickers } from '@/lib/stickers';
import { cn } from '@/lib/utils';
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type PersonCard = { id: string; name: string; avatar: string; day: number; month: number };
type Lift = { id: string; from: DOMRect; zoom: boolean; closing: boolean };

function spot(stickers: BirthdaySticker[]) {
  const taken = new Set(stickers.map((item) => `${Math.round(item.x / 8)}:${Math.round(item.y / 8)}`));
  const options = [[50, 42], [28, 34], [72, 34], [30, 68], [70, 68], [50, 72], [18, 50], [82, 50]];
  const free = options.find(([x, y]) => !taken.has(`${Math.round(x / 8)}:${Math.round(y / 8)}`));
  return { x: free?.[0] ?? 50, y: free?.[1] ?? 42 };
}

const PAGE = 16;

type ShelfArt = { id: string; src: string; label: string };

function stamp(day: number, month: number) {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
}

function StickerShelf({ items, selected, onPick }: { items: ShelfArt[]; selected: string | null; onPick: (id: string) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2" data-sticker-count={items.length} data-sticker-shown={visible.length}>
        {visible.map((item) => (
          <button key={item.id} type="button" aria-pressed={selected === item.id} aria-label={item.label} onClick={() => onPick(item.id)} className={cn('grid h-16 place-items-center rounded-2xl bg-white/80 p-1.5', selected === item.id && 'ring-2 ring-blue-600')}>
            <img src={item.src} alt="" decoding="async" draggable={false} className="sticker-cut max-h-full max-w-full object-contain" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" aria-label="Adesivos anteriores" disabled={current === 0} onClick={() => setPage(current - 1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-500">{current + 1} / {pages}</span>
        <button type="button" aria-label="Próximos adesivos" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="grid h-9 w-9 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StickerFaces({ src, message, author, turned }: { src: string; message: string; author: string; turned: boolean }) {
  return (
    <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: turned ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 700ms cubic-bezier(0.22, 0.8, 0.24, 1)' }}>
      <span className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <img src={src} alt="" draggable={false} className="sticker-cut h-full w-full object-contain" />
      </span>
      <span className="absolute inset-0" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', backgroundColor: '#fff', WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }} />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-[12%] text-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <span className="text-[clamp(15px,4.2cqw,28px)] font-medium leading-snug text-gray-800">{message || 'Este adesivo ainda não tem recado.'}</span>
        <span className="text-[clamp(11px,2.4cqw,14px)] text-gray-500">{author}</span>
      </span>
    </div>
  );
}

export const BirthdayTicket: FC = () => {
  const demo = useDemoProfile();
  const saved = useAgendaEvents();
  const [params, setParams] = useSearchParams();
  const [stickers, setStickers] = useState<BirthdaySticker[]>([]);
  const [viewerId, setViewerId] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [mine, setMine] = useState<{ id: string; personId: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);
  const [library, setLibrary] = useState<ShelfArt[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftArt, setDraftArt] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [asGuest, setAsGuest] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const people = useMemo(() => {
    const map = new Map<string, PersonCard>();
    for (const event of calendarEvents) {
      if (event.type !== 'birthday' || !event.personName) continue;
      const id = celebrationPersonId(event.personName);
      map.set(id, { id, name: event.personName, avatar: event.avatar ?? '', day: event.date.getDate(), month: event.date.getMonth() });
    }
    for (const event of saved) {
      if (event.type !== 'aniversario' || !event.personName) continue;
      const id = event.personId || celebrationPersonId(event.personName);
      const date = parseAgendaDate(event.date);
      const current = map.get(id);
      map.set(id, { id, name: event.personName, avatar: event.avatar || current?.avatar || '', day: date.getDate(), month: date.getMonth() });
    }
    return [...map.values()].sort((a, b) => a.month - b.month || a.day - b.day || a.name.localeCompare(b.name, 'pt-BR'));
  }, [saved]);

  const shelf = useMemo<ShelfArt[]>(() => [
    ...MURAL_FIGURINES.map((item) => ({ id: item.id, src: item.src, label: item.label })),
    ...library,
    ...BIRTHDAY_STICKERS.map((item) => ({ id: item.id, src: item.src, label: `Adicionar ${item.id}` })),
  ], [library]);

  const person = people.find((item) => item.id === params.get('pessoa')) ?? null;
  const composing = Boolean(person && viewerId && viewerId !== person.id);
  const canAdd = unlimited || !mine;
  const minePerson = people.find((item) => item.id === mine?.personId);

  useEffect(() => {
    let alive = true;
    void listStickers().then((items) => {
      if (alive) setLibrary(items.map((item) => ({ id: item.id, src: item.url, label: 'Minha figurinha' })));
    }).catch(() => { if (alive) setLibrary([]); });
    return () => { alive = false; };
  }, [demo]);

  useEffect(() => {
    if (!person) return;
    let alive = true;
    setLift(null);
    setAsGuest(false);
    setDraftArt(null);
    setDraftMessage('');
    setEditingId(null);
    setSavedFlash(false);
    void loadBirthdayCard(person.id).then((payload) => {
      if (!alive) return;
      setStickers(payload.stickers);
      setViewerId(payload.viewer.id);
      setUnlimited(payload.viewer.unlimited);
      setMine(payload.mine);
      setSelectedId(null);
    }).catch(() => toast.error('Não foi possível abrir o bilhete.'));
    return () => { alive = false; };
  }, [person?.id, demo]);

  function choosePerson(id: string) {
    const next = new URLSearchParams(params);
    next.set('tipo', 'aniversarios');
    next.set('pessoa', id);
    setParams(next);
  }

  useEffect(() => {
    if (params.get('tipo') !== 'aniversarios' || params.get('pessoa') || people.length === 0) return;
    const next = new URLSearchParams(params);
    next.set('pessoa', people[0].id);
    setParams(next, { replace: true });
  }, [params, people, setParams]);

  function chooseArt(id: string) {
    setDraftArt(id);
    setEditingId(null);
    setSavedFlash(false);
  }

  async function finish() {
    if (!person || saving) return;
    const message = draftMessage.trim();
    const art = draftArt;
    if (!message) {
      toast.error('Escreva o recado antes de finalizar.');
      return;
    }
    if (!editingId && (!art || !canAdd)) {
      toast.error('Escolha um adesivo.');
      return;
    }
    setSaving(true);
    setSavedFlash(false);
    try {
      if (editingId) {
        const result = await updateBirthdaySticker(editingId, { message });
        setStickers((current) => current.map((item) => item.id === result.sticker.id ? result.sticker : item));
        toast.success('Recado atualizado.');
      } else {
        const place = spot(stickersRef.current);
        if (!art) return;
        const result = await placeBirthdaySticker({ personId: person.id, stickerId: art, width: 24, rotation: 0, message, ...place });
        setStickers((current) => [...current, result.sticker]);
        setMine(result.mine);
        setSelectedId(result.sticker.id);
        toast.success('Recado salvo no bilhete.');
      }
      setDraftArt(null);
      setDraftMessage('');
      setEditingId(null);
      setSavedFlash(true);
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'limit' ? 'Você já usou o seu adesivo.' : 'Não foi possível salvar o recado.');
    } finally {
      setSaving(false);
    }
  }

  function closeLift() {
    setLift((current) => current && !current.closing ? { ...current, zoom: false, closing: true } : current);
    window.setTimeout(() => setLift((current) => current?.closing ? null : current), 700);
  }

  function openSticker(sticker: BirthdaySticker, element: HTMLElement) {
    const from = element.getBoundingClientRect();
    const start = () => {
      setLift({ id: sticker.id, from, zoom: false, closing: false });
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setLift((current) => current?.id === sticker.id && !current.closing ? { ...current, zoom: true } : current);
      }));
    };
    if (lift && lift.id !== sticker.id && !lift.closing) {
      setLift({ ...lift, zoom: false, closing: true });
      window.setTimeout(start, 420);
      return;
    }
    if (lift?.id === sticker.id && !lift.closing) {
      closeLift();
      return;
    }
    start();
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, sticker: BirthdaySticker) {
    if (!composing || sticker.authorId !== viewerId) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    setSelectedId(sticker.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: sticker.x, y: sticker.y };
    let next = origin;
    let moved = false;
    const move = (pointer: PointerEvent) => {
      if (Math.hypot(pointer.clientX - startX, pointer.clientY - startY) > 4) moved = true;
      next = {
        x: Math.min(92, Math.max(8, ((pointer.clientX - board.left) / board.width) * 100)),
        y: Math.min(88, Math.max(12, ((pointer.clientY - board.top) / board.height) * 100)),
      };
      setStickers((current) => current.map((item) => item.id === sticker.id ? { ...item, ...next } : item));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) {
        setEditingId(sticker.id);
        setDraftMessage(sticker.message);
        setDraftArt(sticker.stickerId);
        setSavedFlash(false);
        return;
      }
      void updateBirthdaySticker(sticker.id, next).catch(() => {
        setStickers((items) => items.map((item) => item.id === sticker.id ? { ...item, ...origin } : item));
        toast.error('Não foi possível mover o adesivo.');
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, sticker: BirthdaySticker) {
    event.stopPropagation();
    event.preventDefault();
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const start = event.clientX;
    const origin = sticker.width;
    let width = origin;
    const move = (pointer: PointerEvent) => {
      width = Math.min(46, Math.max(14, origin + ((pointer.clientX - start) / board.width) * 100));
      setStickers((current) => current.map((item) => item.id === sticker.id ? { ...item, width } : item));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      void updateBirthdaySticker(sticker.id, { width }).catch(() => {
        setStickers((items) => items.map((item) => item.id === sticker.id ? { ...item, width: origin } : item));
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function beginRotate(event: ReactPointerEvent<HTMLButtonElement>, sticker: BirthdaySticker) {
    event.stopPropagation();
    event.preventDefault();
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const origin = sticker.rotation;
    let rotation = origin;
    const move = (pointer: PointerEvent) => {
      const cx = board.left + (sticker.x / 100) * board.width;
      const cy = board.top + (sticker.y / 100) * board.height;
      rotation = Math.round(Math.atan2(pointer.clientY - cy, pointer.clientX - cx) * (180 / Math.PI) + 90);
      setStickers((current) => current.map((item) => item.id === sticker.id ? { ...item, rotation } : item));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      void updateBirthdaySticker(sticker.id, { rotation }).catch(() => {
        setStickers((items) => items.map((item) => item.id === sticker.id ? { ...item, rotation: origin } : item));
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const lifted = lift ? stickers.find((item) => item.id === lift.id) : null;
  const liftedArt = lifted ? birthdayStickerArt(lifted.stickerId) : null;
  const reading = !composing || asGuest;
  const draftPreview = draftArt ? birthdayStickerArt(draftArt) : null;

  return (
    <section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F4EEFF] text-[#6B33F6]">
            <Cake className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-800">Aniversários</h2>
            <p className="text-sm text-gray-500">Celebre as pessoas especiais do nosso time!</p>
          </div>
        </div>
        {composing ? (
          <button type="button" aria-pressed={asGuest} onClick={() => setAsGuest((value) => !value)} className="h-11 shrink-0 rounded-2xl border border-gray-100 bg-white px-4 text-sm font-semibold text-gray-800 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            {asGuest ? 'Voltar a montar' : 'Ver como aniversariante'}
          </button>
        ) : null}
      </div>
      <div className="mt-5 flex gap-5 overflow-x-auto">
        {people.map((item) => {
          const active = person?.id === item.id;
          return (
            <button key={item.id} type="button" onClick={() => choosePerson(item.id)} aria-label={`${item.name}, ${item.day} de ${months[item.month]}`} aria-pressed={active} className="grid w-16 shrink-0 justify-items-center gap-2">
              <img src={item.avatar} alt="" className={cn('h-14 w-14 rounded-full object-cover', active && 'ring-2 ring-[#6B33F6] ring-offset-2')} />
              <span className={cn('text-xs', active ? 'font-semibold text-[#6B33F6]' : 'text-gray-500')}>{stamp(item.day, item.month)}</span>
              <span className={cn('h-0.5 w-10 rounded-full', active ? 'bg-[#6B33F6]' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
      {person ? (
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start">
          <div ref={boardRef} onClick={(event) => { if (lift && event.target === event.currentTarget) closeLift(); }} className={cn('relative aspect-[967/577] w-full flex-1 overflow-hidden rounded-[28px] bg-[#c4b4aa]', lift && 'z-50')}>
            <img src="/aniversario/cartao.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            {reading ? <p className="pointer-events-none absolute bottom-4 left-4 text-sm font-medium text-gray-700">Toque em um adesivo para ler o recado.</p> : null}
            {composing && !asGuest && draftPreview ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 w-[22%] -translate-x-1/2 -translate-y-1/2">
                <img src={draftPreview.src} alt="" className="sticker-cut aspect-square w-full object-contain" />
              </div>
            ) : null}
            {stickers.map((sticker) => {
              const art = birthdayStickerArt(sticker.stickerId);
              const own = sticker.authorId === viewerId;
              return (
                <div key={sticker.id} className="absolute" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, width: `${sticker.width}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`, zIndex: selectedId === sticker.id ? 2 : 1, visibility: lift?.id === sticker.id ? 'hidden' : 'visible' }}>
                  <div className="relative aspect-square" style={{ containerType: 'inline-size', perspective: '900px' }}>
                    {!reading && own && selectedId === sticker.id ? (
                      <>
                        <button type="button" aria-label="Girar adesivo" onPointerDown={(event) => beginRotate(event, sticker)} className="absolute -top-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                        <button type="button" aria-label="Redimensionar adesivo" onPointerDown={(event) => beginResize(event, sticker)} className="absolute -bottom-2 -right-2 z-10 h-6 w-6 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                      </>
                    ) : null}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={reading ? `Abrir recado de ${sticker.authorName}` : (own ? `Mover adesivo de ${sticker.authorName}` : `Adesivo de ${sticker.authorName}`)}
                      onPointerDown={(event) => { if (!reading) beginDrag(event, sticker); }}
                      onClick={(event) => { if (reading && art) { event.stopPropagation(); openSticker(sticker, event.currentTarget.parentElement?.parentElement ?? event.currentTarget); } }}
                      className={cn('absolute inset-0', !reading && own ? 'cursor-grab touch-none' : 'cursor-pointer', !reading && composing && selectedId === sticker.id && own && 'rounded-2xl ring-2 ring-blue-600')}
                    >
                      {art ? <StickerFaces src={art.src} message={sticker.message} author={sticker.authorName} turned={false} /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {composing && !asGuest ? (
            <aside className="w-full shrink-0 rounded-[28px] border border-gray-100 p-4 lg:w-[248px]">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Adesivos</h3>
              <label className="mb-3 block">
                <span className="mb-2 block text-xs font-medium text-gray-500">Recado</span>
                <textarea value={draftMessage} maxLength={240} onChange={(event) => { setDraftMessage(event.target.value); setSavedFlash(false); }} className="min-h-20 w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Escreva o recado primeiro." />
              </label>
              {canAdd ? <StickerShelf items={shelf} selected={draftArt} onPick={chooseArt} /> : (
                <p className="text-sm text-gray-500">
                  {minePerson && mine?.personId !== person.id ? `Seu adesivo já está no bilhete de ${minePerson.name.split(' ')[0]}.` : 'Você já colocou o seu adesivo. Toque nele para reescrever o recado.'}
                </p>
              )}
              {canAdd || editingId ? (
                <button type="button" disabled={saving || !draftMessage.trim() || (!editingId && !draftArt)} onClick={() => void finish()} className="mt-3 h-11 w-full rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-45">
                  {saving ? 'Salvando...' : editingId ? 'Atualizar recado' : 'Finalizar'}
                </button>
              ) : null}
              {savedFlash ? <p className="mt-2 text-center text-xs font-medium text-[#3600C2]">Recado salvo no bilhete.</p> : null}
            </aside>
          ) : null}
        </div>
      ) : null}
      {lift && lifted && liftedArt ? createPortal(
        <>
          <button type="button" aria-label="Fechar bilhete" className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-md" onClick={closeLift} />
          <div
            className="fixed z-[70]"
            style={{
              left: lift.zoom && !lift.closing ? '50%' : lift.from.left,
              top: lift.zoom && !lift.closing ? '50%' : lift.from.top,
              width: lift.zoom && !lift.closing ? 'min(78vw, 440px)' : lift.from.width,
              height: lift.zoom && !lift.closing ? 'min(78vw, 440px)' : lift.from.height,
              transform: lift.zoom && !lift.closing ? 'translate(-50%, -50%)' : undefined,
              transition: 'left 700ms cubic-bezier(0.22, 0.8, 0.24, 1), top 700ms cubic-bezier(0.22, 0.8, 0.24, 1), width 700ms cubic-bezier(0.22, 0.8, 0.24, 1), height 700ms cubic-bezier(0.22, 0.8, 0.24, 1), transform 700ms cubic-bezier(0.22, 0.8, 0.24, 1)',
            }}
          >
            <div className="relative h-full w-full" style={{ containerType: 'inline-size', perspective: '1200px' }}>
              <button type="button" aria-label={`Recado de ${lifted.authorName}`} className="absolute inset-0" onClick={closeLift}>
                <StickerFaces src={liftedArt.src} message={lifted.message} author={lifted.authorName} turned={Boolean(lift.zoom && !lift.closing)} />
              </button>
            </div>
          </div>
        </>,
        document.body,
      ) : null}
    </section>
  );
}
