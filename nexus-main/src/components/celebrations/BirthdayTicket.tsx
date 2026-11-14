import { BIRTHDAY_STICKERS, birthdayStickerArt } from '@/data/birthdayStickers';
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
import { cn } from '@/lib/utils';
import { Cake } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent, type UIEvent } from 'react';
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

const SHELF_COLUMNS = 4;
const SHELF_ROW = 72;
const SHELF_ROWS = 7;

function stamp(day: number, month: number) {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
}

function StickerShelf({ onPick }: { onPick: (id: string) => void }) {
  const [startRow, setStartRow] = useState(0);
  const rows = Math.ceil(BIRTHDAY_STICKERS.length / SHELF_COLUMNS);
  const start = startRow * SHELF_COLUMNS;
  const visible = BIRTHDAY_STICKERS.slice(start, start + SHELF_ROWS * SHELF_COLUMNS);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const next = Math.max(0, Math.floor(event.currentTarget.scrollTop / SHELF_ROW) - 1);
    setStartRow((current) => current === next ? current : next);
  }

  return (
    <div
      role="region"
      tabIndex={0}
      aria-label="Rolar adesivos"
      onScroll={onScroll}
      className="sticker-shelf h-[360px] overflow-y-scroll pr-1"
      data-sticker-count={BIRTHDAY_STICKERS.length}
      data-sticker-shown={visible.length}
    >
      <div className="relative" style={{ height: rows * SHELF_ROW }}>
        <div className="absolute inset-x-0 grid grid-cols-4 gap-2" style={{ top: startRow * SHELF_ROW }}>
          {visible.map((item) => (
            <button key={item.id} type="button" onClick={() => onPick(item.id)} aria-label={`Adicionar ${item.id}`} className="grid h-16 place-items-center rounded-2xl bg-[#FBF7F2] p-1.5">
              <img src={item.src} alt="" decoding="async" draggable={false} className="sticker-cut max-h-full max-w-full object-contain" />
            </button>
          ))}
        </div>
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
  const boardRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef(stickers);
  const messageTimer = useRef(0);
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

  const person = people.find((item) => item.id === params.get('pessoa')) ?? null;
  const selected = stickers.find((item) => item.id === selectedId && item.authorId === viewerId) ?? null;
  const composing = Boolean(person && viewerId && viewerId !== person.id);
  const canAdd = unlimited || !mine;
  const minePerson = people.find((item) => item.id === mine?.personId);

  useEffect(() => {
    if (!person) return;
    let alive = true;
    setLift(null);
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

  async function addSticker(stickerId: string) {
    if (!person || !composing || !canAdd) return;
    const place = spot(stickersRef.current);
    try {
      const result = await placeBirthdaySticker({ personId: person.id, stickerId, width: 24, rotation: 0, message: '', ...place });
      setStickers((current) => [...current, result.sticker]);
      setMine(result.mine);
      setSelectedId(result.sticker.id);
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'limit' ? 'Você já usou o seu adesivo.' : 'Não foi possível colocar o adesivo.');
    }
  }

  function saveMessage(id: string, message: string) {
    setStickers((current) => current.map((item) => item.id === id ? { ...item, message } : item));
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => {
      void updateBirthdaySticker(id, { message }).catch(() => toast.error('Não foi possível salvar o recado.'));
    }, 350);
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
      if (!moved) return;
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

  return (
    <section className="mt-6 rounded-[28px] border border-gray-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F4EEFF] text-[#6B33F6]">
          <Cake className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Aniversários</h2>
          <p className="text-sm text-gray-500">Celebre as pessoas especiais do nosso time!</p>
        </div>
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
        <div className="mt-2 flex flex-col gap-4 lg:flex-row">
          <div ref={boardRef} onClick={(event) => { if (lift && event.target === event.currentTarget) closeLift(); }} className={cn('relative min-h-[420px] flex-1 overflow-hidden rounded-[28px] bg-[#FBF7F2]', lift && 'z-50')}>
            <div className="pointer-events-none absolute -left-10 top-8 h-40 w-56 rounded-full bg-[#F8D5E4]" />
            <div className="pointer-events-none absolute -right-8 top-0 h-52 w-64 rounded-full bg-[#E4D4F7]" />
            <div className="pointer-events-none absolute bottom-0 left-8 h-36 w-56 rounded-full bg-[#D7F0E4]" />
            <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-52 rounded-full bg-[#F8E3C8]" />
            {!composing ? <p className="pointer-events-none absolute bottom-4 left-4 text-sm text-gray-500">Toque em um adesivo para ler o recado.</p> : null}
            {stickers.map((sticker) => {
              const art = birthdayStickerArt(sticker.stickerId);
              const own = sticker.authorId === viewerId;
              return (
                <div key={sticker.id} className="absolute" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, width: `${sticker.width}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`, zIndex: selectedId === sticker.id ? 2 : 1, visibility: lift?.id === sticker.id ? 'hidden' : 'visible' }}>
                  <div className="relative aspect-square" style={{ containerType: 'inline-size', perspective: '900px' }}>
                    {composing && own && selectedId === sticker.id ? (
                      <>
                        <button type="button" aria-label="Girar adesivo" onPointerDown={(event) => beginRotate(event, sticker)} className="absolute -top-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                        <button type="button" aria-label="Redimensionar adesivo" onPointerDown={(event) => beginResize(event, sticker)} className="absolute -bottom-2 -right-2 z-10 h-6 w-6 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                      </>
                    ) : null}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={composing ? (own ? `Mover adesivo de ${sticker.authorName}` : `Adesivo de ${sticker.authorName}`) : `Abrir recado de ${sticker.authorName}`}
                      onPointerDown={(event) => beginDrag(event, sticker)}
                      onClick={(event) => { if (!composing && art) { event.stopPropagation(); openSticker(sticker, event.currentTarget.parentElement?.parentElement ?? event.currentTarget); } }}
                      className={cn('absolute inset-0', composing && own ? 'cursor-grab touch-none' : 'cursor-pointer', composing && selectedId === sticker.id && own && 'rounded-2xl ring-2 ring-blue-600')}
                    >
                      {art ? <StickerFaces src={art.src} message={sticker.message} author={sticker.authorName} turned={false} /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {composing ? (
            <aside className="w-full shrink-0 rounded-[28px] border border-gray-100 p-4 lg:w-[248px]">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Adesivos</h3>
              {selected ? (
                <label className="mb-3 block">
                  <span className="mb-2 block text-xs font-medium text-gray-500">Recado deste adesivo</span>
                  <textarea value={selected.message} maxLength={240} onChange={(event) => saveMessage(selected.id, event.target.value)} onBlur={(event) => { window.clearTimeout(messageTimer.current); void updateBirthdaySticker(selected.id, { message: event.target.value }).catch(() => toast.error('Não foi possível salvar o recado.')); }} className="min-h-20 w-full rounded-2xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Escreva o recado do verso." />
                </label>
              ) : null}
              {canAdd ? <StickerShelf onPick={(id) => void addSticker(id)} /> : (
                <p className="text-sm text-gray-500">
                  {minePerson && mine?.personId !== person.id ? `Seu adesivo já está no bilhete de ${minePerson.name.split(' ')[0]}.` : 'Você já colocou o seu adesivo. Dá para mover, girar e reescrever o recado, sem adicionar outro.'}
                </p>
              )}
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
