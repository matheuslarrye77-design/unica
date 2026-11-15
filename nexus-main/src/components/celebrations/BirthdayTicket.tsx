import { BIRTHDAY_STICKERS, birthdayStickerArt } from '@/data/birthdayStickers';
import { calendarEvents } from '@/data/mockData';
import {
  deleteBirthdaySticker,
  deleteBirthdayText,
  loadBirthdayCard,
  placeBirthdaySticker,
  placeBirthdayText,
  saveBirthdayColor,
  updateBirthdaySticker,
  updateBirthdayText,
  type BirthdaySticker,
  type BirthdayText,
  type TextStyle,
} from '@/lib/birthdayCard';
import { celebrationPersonId } from '@/lib/celebrations';
import { fitPhoto, removePhotoBackground } from '@/lib/cutout';
import { parseAgendaDate, useAgendaEvents } from '@/lib/events';
import { useDemoProfile } from '@/lib/session';
import { listStickers, saveSticker } from '@/lib/stickers';
import { cn } from '@/lib/utils';
import { AlignCenter, AlignLeft, AlignRight, Cake, ChevronDown, Eraser, Heart, ImagePlus, Paintbrush, Pencil, Pipette, Scaling, Sparkles, Star, Sticker, Trash2, Type, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from 'react';
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

const PAGE = 8;
const DEFAULT_CARD = '#8c4632';
const SWATCH_KEY = 'unica-card-colors';
type ShelfArt = { id: string; src: string; label: string };
const PACK: ShelfArt[] = BIRTHDAY_STICKERS.map((item) => ({ id: item.id, src: item.src, label: `Adicionar ${item.id}` }));
const FAMILIES: Record<string, string> = {
  arial: 'Arial, Helvetica, sans-serif',
  general: '"General Sans", sans-serif',
  clash: '"Clash Display", sans-serif',
  dm: '"DM Sans", sans-serif',
  poppins: 'Poppins, sans-serif',
  montserrat: 'Montserrat, sans-serif',
  playfair: '"Playfair Display", serif',
  cormorant: '"Cormorant Garamond", serif',
  lora: 'Lora, serif',
  baskerville: '"Libre Baskerville", serif',
  sora: 'Sora, sans-serif',
  manrope: 'Manrope, sans-serif',
  outfit: 'Outfit, sans-serif',
  grotesk: '"Space Grotesk", sans-serif',
  vibes: '"Great Vibes", cursive',
  pacifico: 'Pacifico, cursive',
  lobster: 'Lobster, cursive',
  caveat: 'Caveat, cursive',
  sacramento: 'Sacramento, cursive',
  abril: '"Abril Fatface", serif',
  bebas: '"Bebas Neue", sans-serif',
  cinzel: 'Cinzel, serif',
  bungee: 'Bungee, sans-serif',
  unbounded: 'Unbounded, sans-serif',
  fredoka: 'Fredoka, sans-serif',
  yeseva: '"Yeseva One", serif',
  comfortaa: 'Comfortaa, sans-serif',
};
const FONTS = [
  { id: 'vibes', label: 'Great Vibes' },
  { id: 'pacifico', label: 'Pacifico' },
  { id: 'lobster', label: 'Lobster' },
  { id: 'caveat', label: 'Caveat' },
  { id: 'sacramento', label: 'Sacramento' },
  { id: 'abril', label: 'Abril Fatface' },
  { id: 'bebas', label: 'Bebas Neue' },
  { id: 'cinzel', label: 'Cinzel' },
  { id: 'bungee', label: 'Bungee' },
  { id: 'unbounded', label: 'Unbounded' },
  { id: 'fredoka', label: 'Fredoka' },
  { id: 'yeseva', label: 'Yeseva One' },
  { id: 'comfortaa', label: 'Comfortaa' },
  { id: 'playfair', label: 'Playfair Display' },
];
const PRESETS = ['#f6f1ea', '#f3d6e4', '#e4d7f5', '#d7e6f8', '#d7efe4', '#f8e3c4', '#ffffff', '#5c564f', '#6b33f6', '#4600f3', '#db2777', '#e11d48', '#f59e0b', '#0f766e', '#8c4632', '#1f2937'];
const QUICK = ['#ffffff', '#f6f1ea', '#6b33f6', '#db2777', '#f59e0b', '#1f2937'];
const EMPTY_LOOK: TextStyle = { font: 'vibes', effect: 'plain', color: '#ffffff', size: 36, bold: false, italic: false, underline: false, strike: false, align: 'center', upper: false, tracking: 0, shadow: false, outline: false, opacity: 1, glyph: 'none' };
type Tool = 'color' | 'stickers' | 'text';
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function readSwatches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SWATCH_KEY) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && /^#[0-9a-f]{6}$/i.test(item)).map((item) => item.toLowerCase()).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function hexToHsv(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_CARD;
  const bits = Number.parseInt(value.slice(1), 16);
  const r = ((bits >> 16) & 255) / 255;
  const g = ((bits >> 8) & 255) / 255;
  const b = (bits & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - chroma;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  const byte = (channel: number) => Math.round((channel + m) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function letterStyle(item: TextStyle): CSSProperties {
  const family = FAMILIES[item.font] ?? FAMILIES.vibes;
  const decoration = [item.underline ? 'underline' : '', item.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  const style: CSSProperties = {
    fontFamily: family,
    fontSize: item.size,
    color: item.color,
    fontWeight: item.bold ? 700 : 500,
    fontStyle: item.italic ? 'italic' : 'normal',
    textDecoration: decoration || 'none',
    textAlign: item.align,
    textTransform: item.upper ? 'uppercase' : 'none',
    letterSpacing: `${item.tracking || 0}px`,
    opacity: item.opacity ?? 1,
    lineHeight: 1.15,
    whiteSpace: 'pre-wrap',
  };
  if (item.shadow || item.effect === 'shadow') style.textShadow = '0 2px 0 rgba(15,23,42,0.28)';
  if (item.outline || item.effect === 'outline') {
    style.WebkitTextStroke = '1px rgba(255,255,255,0.92)';
    style.paintOrder = 'stroke fill';
  }
  if (item.effect === 'highlight') {
    style.background = 'rgba(255,255,255,0.92)';
    style.borderRadius = 12;
    style.padding = '4px 10px';
  }
  return style;
}

function GlyphMark({ kind }: { kind: TextStyle['glyph'] }) {
  if (kind === 'heart') return <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />;
  if (kind === 'star') return <Star className="h-3.5 w-3.5" strokeWidth={1.5} />;
  if (kind === 'spark') return <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />;
  return null;
}

function lookFrom(item: BirthdayText): TextStyle {
  const font = FONTS.some((entry) => entry.id === item.font) ? item.font : 'vibes';
  return {
    ...EMPTY_LOOK,
    font,
    effect: item.effect || 'plain',
    color: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color.toLowerCase() : '#ffffff',
    size: item.size || 36,
    bold: Boolean(item.bold),
    italic: Boolean(item.italic),
    underline: Boolean(item.underline),
    strike: Boolean(item.strike),
    align: item.align === 'left' || item.align === 'right' ? item.align : 'center',
    glyph: item.glyph === 'heart' || item.glyph === 'star' || item.glyph === 'spark' ? item.glyph : 'none',
    upper: Boolean(item.upper),
    tracking: Number(item.tracking) || 0,
    shadow: Boolean(item.shadow) || item.effect === 'shadow',
    outline: Boolean(item.outline) || item.effect === 'outline',
    opacity: typeof item.opacity === 'number' ? item.opacity : 1,
  };
}

function cardHex(value: string | undefined) {
  const color = String(value ?? '').toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : DEFAULT_CARD;
}

function stamp(day: number, month: number) {
  return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
}

function StickerShelf({ items, selected, onPick }: { items: ShelfArt[]; selected: string | null; onPick: (id: string) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * PAGE, current * PAGE + PAGE);
  const cells = Array.from({ length: PAGE }, (_, index) => visible[index] ?? null);

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Adesivos anteriores" disabled={current === 0} onClick={() => setPage(current - 1)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-gray-500 hover:bg-[#F4F1FB] disabled:opacity-30">‹</button>
      <div className="grid flex-1 grid-cols-4 gap-2" data-sticker-count={items.length} data-sticker-shown={visible.length}>
        {cells.map((item, index) => item ? (
          <button key={item.id} type="button" aria-pressed={selected === item.id} aria-label={item.label} onClick={() => onPick(item.id)} className={cn('grid aspect-square place-items-center rounded-xl bg-[#F6F4FB] p-1.5', selected === item.id && 'ring-2 ring-[#6B33F6]')}>
            <img src={item.src} alt="" decoding="async" draggable={false} className="sticker-cut max-h-full max-w-full object-contain" />
          </button>
        ) : <span key={`empty-${index}`} className="aspect-square rounded-xl bg-[#F6F4FB]" />)}
      </div>
      <button type="button" aria-label="Próximos adesivos" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-gray-500 hover:bg-[#F4F1FB] disabled:opacity-30">›</button>
    </div>
  );
}

function ColorGraph({ color, onLive, onCommit }: { color: string; onLive: (hex: string) => void; onCommit: (hex: string) => void }) {
  const hsv = hexToHsv(color);
  const field = useRef<HTMLDivElement>(null);
  function paint(event: ReactPointerEvent<HTMLDivElement>, commit: boolean) {
    const rect = field.current?.getBoundingClientRect();
    if (!rect) return;
    const saturation = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const value = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const hex = hsvToHex(hsv.h, saturation, value);
    onLive(hex);
    if (commit) onCommit(hex);
  }
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div
        ref={field}
        role="slider"
        aria-label="Gráfico de cor"
        aria-valuetext={color}
        className="relative h-28 w-full cursor-crosshair rounded-2xl"
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)`, backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); paint(event, false); }}
        onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(event, false); }}
        onPointerUp={(event) => paint(event, true)}
      >
        <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        aria-label="Matiz"
        onChange={(event) => onLive(hsvToHex(Number(event.target.value), hsv.s, hsv.v))}
        onPointerUp={(event) => onCommit(hsvToHex(Number(event.currentTarget.value), hsv.s, hsv.v))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
        style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
      />
    </div>
  );
}

function Swatch({ color, pressed, label, onPick, onRemove }: { color: string; pressed?: boolean; label: string; onPick: () => void; onRemove?: () => void }) {
  return (
    <span className="group relative">
      <button type="button" aria-label={label} aria-pressed={pressed} onClick={onPick} className={cn('h-7 w-7 rounded-full border border-black/10', pressed && 'ring-2 ring-[#6B33F6] ring-offset-2')} style={{ backgroundColor: color }} />
      {onRemove ? <button type="button" aria-label={`Remover cor ${color}`} onClick={onRemove} className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] leading-none text-gray-500 shadow">×</button> : null}
    </span>
  );
}

function StickerFaces({ src, message, author, turned }: { src: string; message: string; author: string; turned: boolean }) {
  return (
    <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: turned ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 700ms cubic-bezier(0.22, 0.8, 0.24, 1)' }}>
      <span className="absolute inset-0 grid place-items-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <img src={src} alt="" draggable={false} className="sticker-cut max-h-full max-w-full object-contain" />
      </span>
      <span className="absolute inset-0 flex flex-col justify-center gap-3 rounded-2xl border border-white/80 bg-[#FFF8F2] px-6 py-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)]" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{author}</span>
        <span className="text-[clamp(16px,4.4cqw,26px)] font-medium leading-snug text-gray-800">{message || 'Este adesivo ainda não tem recado.'}</span>
      </span>
    </div>
  );
}

export const BirthdayTicket: FC = () => {
  const demo = useDemoProfile();
  const saved = useAgendaEvents();
  const [params, setParams] = useSearchParams();
  const [stickers, setStickers] = useState<BirthdaySticker[]>([]);
  const [texts, setTexts] = useState<BirthdayText[]>([]);
  const [viewerId, setViewerId] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [mine, setMine] = useState<{ id: string; personId: string } | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftArt, setDraftArt] = useState<string | null>(null);
  const [draftPos, setDraftPos] = useState({ x: 50, y: 46 });
  const [draftWidth, setDraftWidth] = useState(24);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cardColor, setCardColor] = useState(DEFAULT_CARD);
  const [library, setLibrary] = useState<ShelfArt[]>([]);
  const [tool, setTool] = useState<Tool>('stickers');
  const [letter, setLetter] = useState('');
  const [look, setLook] = useState<TextStyle>(EMPTY_LOOK);
  const [fontOpen, setFontOpen] = useState(false);
  const [swatches, setSwatches] = useState<string[]>(readSwatches);
  const [canUndo, setCanUndo] = useState(false);
  const [letterPos, setLetterPos] = useState({ x: 50, y: 50 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'plain' | 'cut' | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [asGuest, setAsGuest] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const past = useRef<{ cardColor: string; letter: string; look: TextStyle }[]>([]);
  const applying = useRef(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const cutRef = useRef<HTMLInputElement>(null);
  const stickersRef = useRef(stickers);
  const draftWidthRef = useRef(draftWidth);
  stickersRef.current = stickers;
  draftWidthRef.current = draftWidth;

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

  useEffect(() => {
    let alive = true;
    void listStickers().then((items) => {
      if (alive) setLibrary(items.map((item) => ({ id: item.id, src: item.url, label: 'Minha figurinha' })));
    }).catch(() => { if (alive) setLibrary([]); });
    return () => { alive = false; };
  }, [demo]);

  const person = people.find((item) => item.id === params.get('pessoa')) ?? null;

  useEffect(() => {
    past.current = [];
    setCanUndo(false);
  }, [person?.id]);
  const composing = Boolean(person && viewerId && viewerId !== person.id);
  const canAdd = unlimited || !mine;
  const minePerson = people.find((item) => item.id === mine?.personId);

  useEffect(() => {
    if (!person) return;
    let alive = true;
    setLift(null);
    setAsGuest(false);
    setDraftArt(null);
    setDraftMessage('');
    setDraftWidth(24);
    setEditingId(null);
    setEditingText(null);
    setLetter('');
    setSavedFlash(false);
    void loadBirthdayCard(person.id).then((payload) => {
      if (!alive) return;
      setStickers(payload.stickers);
      setTexts(payload.texts ?? []);
      setCardColor(cardHex(payload.color));
      setViewerId(payload.viewer.id);
      setUnlimited(payload.viewer.unlimited);
      setMine(payload.mine);
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
    if (!draftMessage.trim()) {
      toast.error('Escreva o recado antes de escolher o adesivo.');
      return;
    }
    setDraftArt(id);
    setDraftPos(spot(stickersRef.current));
    setEditingId(null);
    setSavedFlash(false);
  }

  function pushPast() {
    if (applying.current) return;
    past.current = [...past.current.slice(-29), { cardColor, letter, look: { ...look } }];
    setCanUndo(true);
  }

  async function undo() {
    const previous = past.current.pop();
    setCanUndo(past.current.length > 0);
    if (!previous || !person) return;
    applying.current = true;
    const colorChanged = previous.cardColor !== cardColor;
    setCardColor(previous.cardColor);
    setLetter(previous.letter);
    setLook(previous.look);
    applying.current = false;
    if (!colorChanged) return;
    try {
      await saveBirthdayColor(person.id, previous.cardColor);
    } catch {
      toast.error('Não foi possível voltar a cor.');
    }
  }

  async function paintCard(color: string, record = true) {
    if (!person) return;
    if (record) pushPast();
    const previous = cardColor;
    setCardColor(color);
    try {
      await saveBirthdayColor(person.id, color);
    } catch {
      setCardColor(previous);
      toast.error('Não foi possível trocar a cor do cartão.');
    }
  }

  function openPhoto(cut: boolean) {
    if (!draftMessage.trim()) {
      toast.error('Escreva o recado antes de escolher o adesivo.');
      return;
    }
    setTool('stickers');
    (cut ? cutRef : photoRef).current?.click();
  }

  async function uploadFigurine(file: File | undefined, cut: boolean) {
    if (!file || uploading) return;
    const image = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
    if (!image) {
      toast.error('Escolha uma foto JPG, PNG, WEBP ou GIF.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('A foto precisa ter até 15 MB.');
      return;
    }
    setUploading(cut ? 'cut' : 'plain');
    try {
      const prepared = cut ? await removePhotoBackground(file) : await fitPhoto(file);
      const saved = await saveSticker(prepared);
      setLibrary((current) => [{ id: saved.id, src: saved.url, label: 'Minha figurinha' }, ...current.filter((item) => item.id !== saved.id)]);
      chooseArt(saved.id);
      toast.success(cut ? 'Figurinha sem fundo pronta. Escreva o recado e finalize.' : 'Figurinha pronta. Escreva o recado e finalize.');
    } catch (error) {
      const unreadable = error instanceof Error && (error.message === 'canvas' || error.message === 'png');
      toast.error(cut ? 'Não foi possível tirar o fundo da foto.' : unreadable ? 'Não foi possível abrir essa foto. Use JPG ou PNG.' : 'Não foi possível salvar a figurinha.');
    } finally {
      setUploading(null);
    }
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
        if (!art) return;
        const result = await placeBirthdaySticker({ personId: person.id, stickerId: art, width: draftWidth, rotation: 0, message, x: draftPos.x, y: draftPos.y });
        setStickers((current) => [...current, result.sticker]);
        setMine(result.mine);
        toast.success('Recado salvo no bilhete.');
      }
      setDraftArt(null);
      setDraftMessage('');
      setDraftWidth(24);
      setEditingId(null);
      setSavedFlash(true);
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'limit' ? 'Você já usou o seu adesivo.' : 'Não foi possível salvar o recado.');
    } finally {
      setSaving(false);
    }
  }

  async function placeLetter() {
    if (!person || saving) return;
    const body = letter.trim();
    if (!body) {
      toast.error('Escreva o texto antes de colocar.');
      return;
    }
    setSaving(true);
    try {
      if (editingText) {
        const result = await updateBirthdayText(editingText, { body, ...look });
        setTexts((current) => current.map((item) => item.id === result.text.id ? result.text : item));
        toast.success('Texto atualizado.');
      } else {
        const result = await placeBirthdayText({ personId: person.id, body, x: letterPos.x, y: letterPos.y, ...look });
        setTexts((current) => [...current, result.text]);
        toast.success('Texto colocado no cartão.');
      }
      setLetter('');
      setEditingText(null);
    } catch {
      toast.error('Não foi possível colocar o texto.');
    } finally {
      setSaving(false);
    }
  }

  function editLetter(item: BirthdayText) {
    setEditingText(item.id);
    setLetter(item.body);
    setLook(lookFrom(item));
    setTool('text');
    setFontOpen(false);
  }

  async function removeLetter(item: BirthdayText) {
    if (item.authorId !== viewerId) return;
    try {
      await deleteBirthdayText(item.id);
      setTexts((current) => current.filter((entry) => entry.id !== item.id));
      if (editingText === item.id) {
        setEditingText(null);
        setLetter('');
      }
      toast.success('Texto excluído.');
    } catch {
      toast.error('Não foi possível excluir o texto.');
    }
  }

  function beginLetterDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    event.stopPropagation();
    const move = (pointer: PointerEvent) => {
      setLetterPos({
        x: Math.min(92, Math.max(8, ((pointer.clientX - board.left) / board.width) * 100)),
        y: Math.min(88, Math.max(12, ((pointer.clientY - board.top) / board.height) * 100)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function beginTextDrag(event: ReactPointerEvent<HTMLDivElement>, item: BirthdayText) {
    if (!composing || asGuest || item.authorId !== viewerId) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    const origin = { x: item.x, y: item.y };
    let next = origin;
    let moved = false;
    const move = (pointer: PointerEvent) => {
      if (Math.hypot(pointer.clientX - event.clientX, pointer.clientY - event.clientY) > 4) moved = true;
      next = {
        x: Math.min(92, Math.max(8, ((pointer.clientX - board.left) / board.width) * 100)),
        y: Math.min(88, Math.max(12, ((pointer.clientY - board.top) / board.height) * 100)),
      };
      setTexts((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...next } : entry));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!moved) return;
      void updateBirthdayText(item.id, next).catch(() => {
        setTexts((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...origin } : entry));
        toast.error('Não foi possível mover o texto.');
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
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

  function beginDraftDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    event.stopPropagation();
    const move = (pointer: PointerEvent) => {
      setDraftPos({
        x: Math.min(92, Math.max(8, ((pointer.clientX - board.left) / board.width) * 100)),
        y: Math.min(88, Math.max(12, ((pointer.clientY - board.top) / board.height) * 100)),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function beginDraftResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const start = event.clientX;
    const origin = draftWidthRef.current;
    let width = origin;
    const move = (pointer: PointerEvent) => {
      width = Math.min(46, Math.max(14, origin + ((pointer.clientX - start) / board.width) * 100));
      setDraftWidth(width);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  async function removeSticker(sticker: BirthdaySticker) {
    if (sticker.authorId !== viewerId) return;
    try {
      const result = await deleteBirthdaySticker(sticker.id);
      setStickers((current) => current.filter((item) => item.id !== sticker.id));
      setMine(result.mine);
      if (editingId === sticker.id) {
        setEditingId(null);
        setDraftMessage('');
      }
      setLift((current) => current?.id === sticker.id ? null : current);
      toast.success('Adesivo excluído.');
    } catch {
      toast.error('Não foi possível excluir o adesivo.');
    }
  }

  function unlock(sticker: BirthdaySticker) {
    setEditingId(sticker.id);
    setDraftArt(null);
    setDraftMessage(sticker.message);
    setSavedFlash(false);
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, sticker: BirthdaySticker) {
    if (!composing || editingId !== sticker.id || sticker.authorId !== viewerId) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
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

  function rememberColor(color: string) {
    const hex = color.toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(hex)) return;
    setSwatches((current) => {
      const next = [hex, ...current.filter((item) => item !== hex)].slice(0, 12);
      localStorage.setItem(SWATCH_KEY, JSON.stringify(next));
      return next;
    });
  }

  function forgetColor(color: string) {
    setSwatches((current) => {
      const next = current.filter((item) => item !== color);
      localStorage.setItem(SWATCH_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function grabColor(apply: (hex: string) => void) {
    const Ctor = (window as Window & { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) {
      toast.error('O conta-gotas funciona no Chrome ou no Edge.');
      return;
    }
    try {
      const result = await new Ctor().open();
      const hex = result.sRGBHex.toLowerCase();
      if (/^#[0-9a-f]{6}$/.test(hex)) apply(hex);
    } catch {
      // A pessoa fechou o conta-gotas.
    }
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
      <div className="mt-5 flex flex-wrap justify-center gap-5">
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
          <div ref={boardRef} onClick={(event) => { if (lift && event.target === event.currentTarget) closeLift(); }} className={cn('relative aspect-[967/577] w-full flex-1 overflow-hidden rounded-[28px]', lift && 'z-50')} style={{ backgroundColor: cardColor }}>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <rect x="3.6%" y="6%" width="92.8%" height="88%" rx="18" fill="none" stroke="rgba(255,248,240,0.9)" strokeWidth="1.75" strokeDasharray="2 7" strokeLinecap="round" />
            </svg>
            {reading ? <p className="pointer-events-none absolute bottom-4 left-4 text-sm font-medium text-white/90">Toque em um adesivo para ler o recado.</p> : null}
            {composing && !asGuest && draftPreview ? (
              <div className="absolute z-10 cursor-grab touch-none" style={{ left: `${draftPos.x}%`, top: `${draftPos.y}%`, width: `${draftWidth}%`, transform: 'translate(-50%, -50%)' }} onPointerDown={beginDraftDrag}>
                <img src={draftPreview.src} alt="" draggable={false} className="sticker-cut aspect-square w-full object-contain" />
                <button type="button" aria-label="Redimensionar adesivo" onPointerDown={beginDraftResize} className="absolute -bottom-1.5 -right-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <Scaling className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
            {stickers.map((sticker) => {
              const art = birthdayStickerArt(sticker.stickerId);
              const own = sticker.authorId === viewerId;
              return (
                <div key={sticker.id} className="group absolute" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, width: `${sticker.width}%`, transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`, zIndex: editingId === sticker.id ? 2 : 1, visibility: lift?.id === sticker.id ? 'hidden' : 'visible' }}>
                  <div className="relative aspect-square" style={{ containerType: 'inline-size', perspective: '900px' }}>
                    {editingId === sticker.id ? (
                      <>
                        <button type="button" aria-label="Girar adesivo" onPointerDown={(event) => beginRotate(event, sticker)} className="absolute -top-3 left-1/2 z-10 h-6 w-6 -translate-x-1/2 rounded-full border border-gray-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]" />
                        <button type="button" aria-label="Redimensionar adesivo" onPointerDown={(event) => beginResize(event, sticker)} className="absolute -bottom-1.5 -right-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                          <Scaling className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                    {composing && !asGuest && own ? (
                      <span className={cn('absolute -right-1 -top-1 z-20 flex gap-1 transition-opacity', editingId === sticker.id ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100')}>
                        {!draftArt && editingId !== sticker.id ? (
                          <button type="button" aria-label="Editar adesivo" onClick={() => unlock(sticker)} className="grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button type="button" aria-label="Excluir adesivo" onClick={() => void removeSticker(sticker)} className="grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-[#9D174D] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ) : null}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={reading ? `Abrir recado de ${sticker.authorName}` : `Adesivo de ${sticker.authorName}`}
                      onPointerDown={(event) => { if (editingId === sticker.id) beginDrag(event, sticker); }}
                      onClick={(event) => { if (reading && art) { event.stopPropagation(); openSticker(sticker, event.currentTarget.parentElement?.parentElement ?? event.currentTarget); } }}
                      className={cn('absolute inset-0', editingId === sticker.id ? 'cursor-grab touch-none' : reading ? 'cursor-pointer' : '')}
                    >
                      {art ? <img src={art.src} alt="" draggable={false} className="pointer-events-none sticker-cut h-full w-full object-contain" /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {texts.map((item) => {
              const live = editingText === item.id ? { ...item, ...look, body: letter.trim() || item.body } : item;
              const own = item.authorId === viewerId;
              return (
                <div key={item.id} className="group absolute z-20 w-[46%] cursor-grab" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }} onPointerDown={(event) => beginTextDrag(event, item)}>
                  {composing && !asGuest && own ? (
                    <span className="absolute -top-8 right-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onPointerDown={(event) => event.stopPropagation()}>
                      <button type="button" aria-label="Editar texto" onClick={() => editLetter(item)} className="grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Excluir texto" onClick={() => void removeLetter(item)} className="grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-[#9D174D] shadow-[0_8px_24px_rgba(15,23,42,0.06)]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  ) : null}
                  {live.glyph && live.glyph !== 'none' ? <span className={cn('mb-1 flex', live.align === 'left' ? 'justify-start' : live.align === 'right' ? 'justify-end' : 'justify-center')} style={{ color: live.color }}><GlyphMark kind={live.glyph} /></span> : null}
                  <p style={letterStyle(live)}>{live.body}</p>
                </div>
              );
            })}
            {composing && !asGuest && !editingText && letter.trim() ? (
              <div className="absolute z-20 w-[46%] cursor-grab" style={{ left: `${letterPos.x}%`, top: `${letterPos.y}%`, transform: 'translate(-50%, -50%)' }} onPointerDown={beginLetterDrag}>
                {look.glyph !== 'none' ? <span className={cn('mb-1 flex', look.align === 'left' ? 'justify-start' : look.align === 'right' ? 'justify-end' : 'justify-center')} style={{ color: look.color }}><GlyphMark kind={look.glyph} /></span> : null}
                <p style={letterStyle(look)}>{letter}</p>
              </div>
            ) : null}
          </div>
          {composing && !asGuest ? (
            <div className="w-full shrink-0 lg:w-[340px]">
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { void uploadFigurine(event.target.files?.[0], false); event.target.value = ''; }} />
              <input ref={cutRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { void uploadFigurine(event.target.files?.[0], true); event.target.value = ''; }} />
              <aside className="max-h-[70vh] w-full overflow-y-auto rounded-[28px] border border-gray-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="mb-4 grid grid-cols-3 rounded-2xl bg-[#F4F1FB] p-1" role="tablist" aria-label="Ferramentas do cartão">
                  {([
                    ['color', 'Fundo', Paintbrush],
                    ['stickers', 'Adesivos', Sticker],
                    ['text', 'Texto', Type],
                  ] as const).map(([id, label, Icon]) => (
                    <button key={id} type="button" role="tab" aria-selected={tool === id} onClick={() => { setTool(id); setFontOpen(false); }} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-medium', tool === id ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:text-gray-800')}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {label}
                    </button>
                  ))}
                </div>
                {tool === 'color' ? (
                  <div className="space-y-3">
                    <div onPointerDownCapture={pushPast}>
                      <ColorGraph color={cardColor} onLive={setCardColor} onCommit={(hex) => void paintCard(hex, false)} />
                    </div>
                    <div className="flex items-center justify-between">
                      {QUICK.map((color) => <Swatch key={color} color={color} pressed={cardColor === color} label={`Cor rápida ${color}`} onPick={() => void paintCard(color)} />)}
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESETS.map((color) => <Swatch key={color} color={color} pressed={cardColor === color} label={`Cor ${color}`} onPick={() => void paintCard(color)} />)}
                      {swatches.map((color) => <Swatch key={`salva-${color}`} color={color} pressed={cardColor === color} label={`Cor salva ${color}`} onPick={() => void paintCard(color)} onRemove={() => forgetColor(color)} />)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" title="Conta-gotas" aria-label="Conta-gotas" onClick={() => void grabColor((hex) => void paintCard(hex))} className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-[#F4F1FB] hover:text-gray-800">
                        <Pipette className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button type="button" onClick={() => rememberColor(cardColor)} className="h-8 rounded-full px-3 text-xs text-gray-500 hover:bg-[#F4F1FB] hover:text-gray-800">Salvar</button>
                      <span className="ml-auto text-[11px] text-gray-400">{cardColor}</span>
                    </div>
                  </div>
                ) : null}
                  {tool === 'stickers' ? (
                    <>
                      <label className="mb-3 block">
                        <span className="mb-2 block text-xs font-medium text-gray-500">Recado</span>
                        <textarea value={draftMessage} maxLength={240} onChange={(event) => { setDraftMessage(event.target.value); setSavedFlash(false); }} className="min-h-20 w-full rounded-2xl border border-gray-100 bg-[#F6F4FB] px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Escreva uma mensagem para o aniversariante..." />
                      </label>
                      {canAdd ? (
                        <div className="mb-3 flex gap-2">
                          <button type="button" aria-label="Enviar figurinha" disabled={Boolean(uploading)} onClick={() => openPhoto(false)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F4F1FB] text-xs font-medium text-gray-700 hover:bg-[#E7E0F8] disabled:opacity-50">
                            <ImagePlus className="h-3.5 w-3.5" />
                            Enviar imagem
                          </button>
                          <button type="button" aria-label="Criar figurinha sem fundo" disabled={Boolean(uploading)} onClick={() => openPhoto(true)} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F4F1FB] text-xs font-medium text-gray-700 hover:bg-[#E7E0F8] disabled:opacity-50">
                            <Eraser className="h-3.5 w-3.5" />
                            Apagar fundo
                          </button>
                        </div>
                      ) : null}
                      {uploading ? <p className="mb-2 text-xs text-gray-500">{uploading === 'cut' ? 'Tirando o fundo...' : 'Salvando...'}</p> : null}
                      {canAdd ? <StickerShelf items={[...library, ...PACK]} selected={draftArt} onPick={chooseArt} /> : (
                        <p className="text-sm text-gray-500">
                          {minePerson && mine?.personId !== person.id ? `Seu adesivo já está no bilhete de ${minePerson.name.split(' ')[0]}.` : 'Você já colocou o seu adesivo. Passe o mouse nele para editar ou excluir.'}
                        </p>
                      )}
                      {canAdd || editingId ? (
                        <button type="button" disabled={saving || !draftMessage.trim() || (!editingId && !draftArt)} onClick={() => void finish()} className="mt-3 h-11 w-full rounded-2xl bg-[#6B33F6] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                          {saving ? 'Salvando...' : editingId ? 'Atualizar recado' : 'Finalizar'}
                        </button>
                      ) : null}
                      {savedFlash ? <p className="mt-2 text-center text-xs font-medium text-[#3600C2]">Recado salvo no bilhete.</p> : null}
                    </>
                  ) : null}
                  {tool === 'text' ? (
                    <div className="space-y-3">
                      <textarea value={letter} maxLength={80} onChange={(event) => { pushPast(); setLetter(event.target.value); }} className="min-h-16 w-full rounded-2xl bg-[#F6F4FB] px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Um texto solto no cartão." />
                      <div className="relative">
                        <button type="button" aria-label="Fonte" aria-expanded={fontOpen} onClick={() => setFontOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-xl bg-[#F6F4FB] px-3 text-sm text-gray-800">
                          <span style={{ fontFamily: FAMILIES[(FONTS.find((font) => font.id === look.font) ?? FONTS[0]).id] }}>{(FONTS.find((font) => font.id === look.font) ?? FONTS[0]).label}</span>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        {fontOpen ? (
                          <div className="mt-1 max-h-52 overflow-y-auto rounded-xl bg-[#F6F4FB] p-1">
                            {FONTS.map((font) => (
                              <button key={font.id} type="button" onClick={() => { pushPast(); setLook((current) => ({ ...current, font: font.id })); setFontOpen(false); }} className={cn('flex h-10 w-full items-center rounded-lg px-3 text-left text-lg', look.font === font.id ? 'bg-white text-[#6B33F6]' : 'text-gray-700 hover:bg-white')} style={{ fontFamily: FAMILIES[font.id] }}>{font.label}</button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        {([
                          ['bold', 'Negrito', <span key="b" className="font-bold">A</span>],
                          ['italic', 'Itálico', <span key="i" className="italic">A</span>],
                          ['underline', 'Sublinhado', <span key="u" className="underline">A</span>],
                          ['strike', 'Tachado', <span key="s" className="line-through">A</span>],
                        ] as const).map(([key, title, mark]) => (
                          <button key={key} type="button" title={title} aria-label={title} aria-pressed={look[key]} onClick={() => { pushPast(); setLook((current) => ({ ...current, [key]: !current[key], effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look[key] ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>{mark}</button>
                        ))}
                        <button type="button" title="Maiúsculas" aria-label="Maiúsculas" aria-pressed={look.upper} onClick={() => { pushPast(); setLook((current) => ({ ...current, upper: !current.upper })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold', look.upper ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>AA</button>
                        <button type="button" title="Sombra no texto" aria-label="Sombra no texto" aria-pressed={look.shadow} onClick={() => { pushPast(); setLook((current) => ({ ...current, shadow: !current.shadow, effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look.shadow ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')} style={{ textShadow: '1px 1px 0 currentColor' }}>A</button>
                        <button type="button" title="Contorno do texto" aria-label="Contorno do texto" aria-pressed={look.outline} onClick={() => { pushPast(); setLook((current) => ({ ...current, outline: !current.outline, effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look.outline ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')} style={{ WebkitTextStroke: '1px currentColor', color: 'transparent', WebkitTextFillColor: look.outline ? '#fff' : '#6b7280' }}>A</button>
                      </div>
                      <div className="flex items-center gap-1">
                        {([
                          ['left', 'Alinhamento à esquerda', AlignLeft],
                          ['center', 'Alinhamento centralizado', AlignCenter],
                          ['right', 'Alinhamento à direita', AlignRight],
                        ] as const).map(([id, title, Icon]) => (
                          <button key={id} type="button" title={title} aria-label={title} aria-pressed={look.align === id} onClick={() => { pushPast(); setLook((current) => ({ ...current, align: id })); }} className={cn('grid h-8 w-8 place-items-center rounded-full', look.align === id ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        ))}
                        <span className="mx-1.5 h-4 w-px bg-gray-200" aria-hidden />
                        {([
                          ['heart', 'Coração', Heart],
                          ['star', 'Estrela', Star],
                          ['spark', 'Brilho', Sparkles],
                        ] as const).map(([id, title, Icon]) => (
                          <button key={id} type="button" title={title} aria-label={title} aria-pressed={look.glyph === id} onClick={() => { pushPast(); setLook((current) => ({ ...current, glyph: current.glyph === id ? 'none' : id })); }} className={cn('grid h-8 w-8 place-items-center rounded-full', look.glyph === id ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <input type="range" min={18} max={72} value={look.size} aria-label="Tamanho do texto" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, size: Number(event.target.value) }))} className="w-full accent-[#6B33F6]" />
                        <input type="range" min={-2} max={24} value={look.tracking} aria-label="Espaçamento entre letras" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, tracking: Number(event.target.value) }))} className="w-full accent-[#6B33F6]" />
                        <input type="range" min={15} max={100} value={Math.round(look.opacity * 100)} aria-label="Opacidade" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, opacity: Number(event.target.value) / 100 }))} className="w-full accent-[#6B33F6]" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative grid h-7 w-7 shrink-0 place-items-center" onPointerDownCapture={pushPast}>
                          <span className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#ff3b30, #ffcc00, #34c759, #32ade6, #5856d6, #ff2d55, #ff3b30)' }} />
                          <span className="pointer-events-none h-2.5 w-2.5 rounded-full border border-white" style={{ backgroundColor: look.color }} />
                          <input type="color" value={look.color} aria-label="Cor do texto" onChange={(event) => setLook((current) => ({ ...current, color: event.target.value }))} className="absolute inset-0 cursor-pointer opacity-0" />
                        </span>
                        {QUICK.map((color) => <Swatch key={color} color={color} pressed={look.color === color} label={`Cor do texto ${color}`} onPick={() => { pushPast(); setLook((current) => ({ ...current, color })); }} />)}
                        {swatches.map((color) => <Swatch key={`texto-${color}`} color={color} pressed={look.color === color} label={`Usar cor ${color}`} onPick={() => { pushPast(); setLook((current) => ({ ...current, color })); }} onRemove={() => forgetColor(color)} />)}
                        <button type="button" title="Conta-gotas" aria-label="Conta-gotas do texto" onClick={() => void grabColor((hex) => { pushPast(); setLook((current) => ({ ...current, color: hex })); })} className="grid h-7 w-7 place-items-center rounded-full text-gray-500 hover:bg-[#F4F1FB]">
                          <Pipette className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <button type="button" disabled={saving || !letter.trim()} onClick={() => void placeLetter()} className="h-11 w-full rounded-2xl bg-[#6B33F6] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                        {saving ? 'Salvando...' : editingText ? 'Atualizar texto' : 'Colocar no cartão'}
                      </button>
                    </div>
                  ) : null}
                  <div className="mt-4 flex justify-end">
                    <button type="button" title="Voltar" aria-label="Voltar" disabled={!canUndo} onClick={() => void undo()} className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-[#F4F1FB] hover:text-gray-700 disabled:opacity-30">
                      <Undo2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </aside>
            </div>
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
              width: lift.zoom && !lift.closing ? 'min(82vw, 380px)' : lift.from.width,
              height: lift.zoom && !lift.closing ? 'min(62vh, 230px)' : lift.from.height,
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
