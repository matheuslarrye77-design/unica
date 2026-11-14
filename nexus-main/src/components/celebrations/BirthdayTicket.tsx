import { BIRTHDAY_STICKERS, birthdayStickerArt } from '@/data/birthdayStickers';
import { calendarEvents } from '@/data/mockData';
import {
  loadBirthdayCard,
  placeBirthdaySticker,
  updateBirthdaySticker,
  type BirthdaySticker,
} from '@/lib/birthdayCard';
import { celebrationPersonId } from '@/lib/celebrations';
import { useDemoProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState, type FC, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function spot(stickers: BirthdaySticker[]) {
  const taken = new Set(stickers.map((item) => `${Math.round(item.x / 8)}:${Math.round(item.y / 8)}`));
  const options = [[50, 42], [28, 34], [72, 34], [30, 68], [70, 68], [50, 72], [18, 50], [82, 50]];
  const free = options.find(([x, y]) => !taken.has(`${Math.round(x / 8)}:${Math.round(y / 8)}`));
  return { x: free?.[0] ?? 50, y: free?.[1] ?? 42 };
}

export const BirthdayTicket: FC = () => {
  const demo = useDemoProfile();
  const [params, setParams] = useSearchParams();
  const [stickers, setStickers] = useState<BirthdaySticker[]>([]);
  const [viewerId, setViewerId] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [mine, setMine] = useState<{ id: string; personId: string } | null>(null);
  const [mode, setMode] = useState<'ver' | 'editar'>('ver');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const stickersRef = useRef(stickers);
  const messageTimer = useRef(0);
  stickersRef.current = stickers;

  const people = useMemo(() => calendarEvents.filter((event) => event.type === 'birthday' && event.personName).map((event) => ({
    id: celebrationPersonId(event.personName ?? ''),
    name: event.personName ?? '',
    day: event.date.getDate(),
    month: event.date.getMonth(),
  })), []);
  const person = people.find((item) => item.id === params.get('pessoa')) ?? people[0];
  const selected = stickers.find((item) => item.id === selectedId && item.authorId === viewerId) ?? null;
  const canAdd = unlimited || !mine;
  const minePerson = people.find((item) => item.id === mine?.personId);

  useEffect(() => {
    if (!person) return;
    let alive = true;
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

  async function addSticker(stickerId: string) {
    if (!person || !canAdd) return;
    const place = spot(stickersRef.current);
    try {
      const result = await placeBirthdaySticker({ personId: person.id, stickerId, width: 24, rotation: 0, message: '', ...place });
      setStickers((current) => [...current, result.sticker]);
      setMine(result.mine);
      setSelectedId(result.sticker.id);
      setMode('editar');
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

  function patch(id: string, change: Partial<BirthdaySticker>, saved: Partial<BirthdaySticker>) {
    setStickers((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
    void updateBirthdaySticker(id, saved).catch(() => {
      void loadBirthdayCard(person.id).then((payload) => setStickers(payload.stickers)).catch(() => undefined);
      toast.error('Não foi possível salvar o adesivo.');
    });
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, sticker: BirthdaySticker) {
    if (mode !== 'editar' || sticker.authorId !== viewerId) return;
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

  return (
    <section className="mt-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {people.map((item) => (
          <button key={item.id} type="button" onClick={() => choosePerson(item.id)} className={cn('h-11 shrink-0 rounded-2xl px-4 text-sm font-medium', item.id === person?.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]')}>
            {item.name.split(' ')[0]} <span className={cn('text-xs', item.id === person?.id ? 'text-white/80' : 'text-gray-500')}>{item.day} {months[item.month]}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Bilhete de {person?.name.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">{mode === 'ver' ? 'Toque em um adesivo para ler o recado do verso.' : 'Arraste o adesivo. O recado fica no verso e só aparece na visualização.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { if (selected) void updateBirthdaySticker(selected.id, { message: selected.message }); setMode('ver'); setSelectedId(null); }} className={cn('h-11 rounded-2xl px-4 text-sm font-medium', mode === 'ver' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]')}>Ver bilhete</button>
          <button type="button" onClick={() => setMode('editar')} className={cn('h-11 rounded-2xl px-4 text-sm font-medium', mode === 'editar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]')}>Montar</button>
        </div>
      </div>
      <div ref={boardRef} className="relative mt-4 aspect-[5/4] w-full overflow-hidden rounded-[28px] border border-[#F3D7E4] bg-[#FFF7F2] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-4 rounded-[22px] border border-dashed border-[#F0C9D8]" />
        {stickers.map((sticker) => {
          const art = birthdayStickerArt(sticker.stickerId);
          const flipped = mode === 'ver' && sticker.open;
          const own = sticker.authorId === viewerId;
          return (
            <div key={sticker.id} className="absolute" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, width: `${sticker.width}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`, zIndex: flipped || selectedId === sticker.id ? 3 : 1 }}>
              <div className="relative aspect-square" style={{ perspective: '900px' }}>
                {mode === 'editar' && own && selectedId === sticker.id ? (
                  <>
                    <button type="button" aria-label="Girar adesivo" onPointerDown={(event) => beginRotate(event, sticker)} className="absolute -top-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                    <button type="button" aria-label="Redimensionar adesivo" onPointerDown={(event) => beginResize(event, sticker)} className="absolute -bottom-2 -right-2 z-10 h-6 w-6 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                  </>
                ) : null}
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={flipped}
                  aria-label={mode === 'ver' ? `Abrir recado de ${sticker.authorName}` : own ? `Mover adesivo de ${sticker.authorName}` : `Adesivo de ${sticker.authorName}`}
                  onPointerDown={(event) => beginDrag(event, sticker)}
                  onClick={() => { if (mode === 'ver') patch(sticker.id, { open: !sticker.open }, { open: !sticker.open }); }}
                  onKeyDown={(event) => { if (mode === 'ver' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); patch(sticker.id, { open: !sticker.open }, { open: !sticker.open }); } }}
                  className={cn('absolute inset-0 cursor-pointer', mode === 'editar' && own && 'cursor-grab touch-none', mode === 'editar' && selectedId === sticker.id && own && 'rounded-2xl ring-2 ring-blue-600')}
                  style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 680ms cubic-bezier(0.22, 0.8, 0.24, 1)' }}
                >
                  <span className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    {art ? <img src={art.src} alt="" draggable={false} className="h-full w-full object-contain" /> : null}
                  </span>
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-white p-3 text-center shadow-[0_8px_24px_rgba(15,23,42,0.06)]" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <span className="text-[13px] font-medium leading-snug text-gray-800">{sticker.message || 'Este adesivo ainda não tem recado.'}</span>
                    <span className="text-[11px] text-gray-500">{sticker.authorName}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {mode === 'editar' ? (
        <div className="mt-4">
          {selected ? (
            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-800">Recado deste adesivo</span>
              <textarea value={selected.message} maxLength={240} onChange={(event) => saveMessage(selected.id, event.target.value)} onBlur={(event) => { window.clearTimeout(messageTimer.current); void updateBirthdaySticker(selected.id, { message: event.target.value }).catch(() => toast.error('Não foi possível salvar o recado.')); }} className="min-h-24 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-800 shadow-[0_8px_24px_rgba(15,23,42,0.06)] outline-none" placeholder="Escreva o recado que aparece no verso." />
            </label>
          ) : null}
          {canAdd ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {BIRTHDAY_STICKERS.map((item) => (
                <button key={item.id} type="button" onClick={() => void addSticker(item.id)} className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" aria-label="Adicionar adesivo">
                  <img src={item.src} alt="" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              {minePerson && mine?.personId !== person?.id ? `Seu adesivo já está no bilhete de ${minePerson.name.split(' ')[0]}.` : 'Você já colocou o seu adesivo. Dá para mover, girar e reescrever o recado, sem adicionar outro.'}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
