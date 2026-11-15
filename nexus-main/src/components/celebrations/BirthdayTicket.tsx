import { BIRTHDAY_STICKERS, birthdayStickerArt } from '@/data/birthdayStickers';
import { calendarEvents } from '@/data/mockData';
import {
  deleteBirthdayMark,
  deleteBirthdaySticker,
  deleteBirthdayText,
  loadBirthdayCard,
  placeBirthdayMark,
  placeBirthdaySticker,
  placeBirthdayText,
  saveBirthdayColor,
  updateBirthdayMark,
  updateBirthdaySticker,
  updateBirthdayText,
  type BirthdayMark,
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
import { AlignCenter, AlignLeft, AlignRight, Cake, ChevronDown, Eraser, ImagePlus, Paintbrush, Pencil, Pipette, Scaling, Sticker, Trash2, Type, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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
const PRESETS = [
  '#e4f2fc', '#d7f4f8', '#d8f6ea', '#e8f7d6', '#fbf6d4', '#fde7cc', '#f8d6d2', '#f6d4e6',
  '#5aa6e8', '#3ec8de', '#3ecca0', '#86d15a', '#f0c447', '#f09238', '#e86660', '#e05696',
  '#2a5fbe', '#187ea6', '#1c7a60', '#3c8c30', '#c27812', '#c24e28', '#a83046', '#8c4632',
];
const COLOR_COLUMNS = 8;
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

function paperIsDark(hex: string) {
  const bits = Number.parseInt(hex.slice(1), 16);
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  const red = channel((bits >> 16) & 255);
  const green = channel((bits >> 8) & 255);
  const blue = channel(bits & 255);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 < 0.42;
}

function inkTones(card: string) {
  const base = hexToHsv(cardHex(card));
  const dark = paperIsDark(cardHex(card));
  return [-34, -16, 0, 18, 36].map((shift, index) => {
    const hue = (base.h + shift + 360) % 360;
    const saturation = Math.min(0.82, Math.max(0.38, base.s * 0.72 + 0.22));
    const value = dark ? 0.97 - index * 0.07 : 0.24 + index * 0.05;
    return hsvToHex(hue, saturation, value);
  });
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

function Doodle({ kind, className }: { kind: BirthdayMark['kind']; className?: string }) {
  const box = className ?? 'h-14 w-14';
  if (kind === 'heart') {
    return (
      <svg viewBox="0 0 325 340" className={box} aria-hidden>
        <path fill="currentColor" d="M277 9L257 8L243 12L226 22L204 45L185 78L175 106L168 141L166 175L145 140L125 115L99 92L74 78L58 74L43 74L32 77L26 80L17 88L12 96L9 105L8 127L11 141L19 160L31 178L55 203L67 213L147 267L160 280L169 292L177 309L180 329L185 332L190 329L191 316L186 297L176 277L156 255L99 213L75 193L58 176L45 159L33 136L29 119L30 102L34 94L40 88L50 84L60 84L74 88L99 103L121 124L134 140L147 160L161 188L170 217L172 219L177 219L180 215L180 169L184 138L197 92L210 64L231 36L240 28L252 21L262 18L270 18L276 20L285 28L291 39L296 60L295 99L286 138L268 187L241 243L217 283L197 312L199 315L203 314L224 291L242 268L273 220L288 192L300 165L313 123L317 94L317 71L312 46L300 24L287 13Z" />
      </svg>
    );
  }
  if (kind === 'star') {
    return (
      <svg viewBox="0 0 630 648" className={box} aria-hidden>
        <path fill="currentColor" d="M337 8L307 26L283 66L270 82L261 103L248 120L227 162L221 169L214 215L235 213L267 184L312 98L319 94L325 154L329 277L345 279L387 278L412 284L490 293L521 301L524 298L544 308L540 312L521 320L462 339L348 366L373 439L385 487L403 532L409 560L405 560L362 516L264 409L257 412L202 457L154 490L98 521L91 519L102 490L123 453L200 348L200 345L122 275L118 273L119 277L115 276L84 244L45 197L49 194L55 196L67 194L74 198L91 200L101 206L107 204L121 207L127 206L132 207L135 211L171 218L113 182L99 180L92 176L44 163L21 164L12 169L8 176L9 206L18 219L17 226L35 252L43 258L52 272L60 277L91 315L101 313L136 349L138 348L139 341L146 352L139 362L124 374L121 385L113 393L109 393L96 407L87 420L88 422L90 419L90 423L68 457L68 451L61 456L61 460L37 513L33 530L33 551L45 571L60 580L91 580L131 568L136 562L146 559L165 543L191 527L200 516L209 515L217 511L243 488L248 486L255 487L256 481L260 476L265 480L274 496L299 521L307 535L340 565L341 569L346 570L357 587L360 586L375 602L375 609L383 613L387 620L408 633L411 638L420 640L422 633L445 636L455 632L463 621L462 612L466 599L465 594L468 592L463 571L462 552L454 522L455 517L443 484L444 475L426 433L422 419L422 408L428 403L492 382L506 381L528 374L581 352L590 344L605 336L614 327L622 310L622 298L612 278L604 273L599 273L581 263L580 259L550 250L540 251L492 244L448 235L405 233L393 227L383 231L378 229L378 158L370 66L361 33L353 17L347 10Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 799 449" className={box} aria-hidden>
      <path fill="currentColor" d="M703 127L699 125L690 125L686 127L679 135L475 415L471 422L471 431L476 438L484 441L493 439L789 232L791 227L791 219L789 215Z" />
      <path fill="currentColor" d="M96 127L10 215L8 227L11 233L304 438L312 441L323 438L328 431L328 422L155 183L113 127L109 125L100 125Z" />
      <path fill="currentColor" d="M339 8L335 9L328 15L326 26L384 383L388 392L394 396L402 397L411 391L414 384L473 20L471 15L466 10L461 8Z" />
    </svg>
  );
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
    <span className="group relative block min-w-0 flex-1">
      <button type="button" aria-label={label} aria-pressed={pressed} onClick={onPick} className={cn('block aspect-square w-full rounded-full border border-black/10', pressed && 'ring-2 ring-[#6B33F6] ring-offset-1')} style={{ backgroundColor: color }} />
      {onRemove ? <button type="button" aria-label={`Remover cor ${color}`} onClick={onRemove} className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] leading-none text-gray-500 shadow">×</button> : null}
    </span>
  );
}

function spreadRows(nodes: ReactNode[], columns = COLOR_COLUMNS) {
  const rows: ReactNode[][] = [];
  for (let index = 0; index < nodes.length; index += columns) rows.push(nodes.slice(index, index + columns));
  return (
    <div className="w-full space-y-1.5">
      {rows.map((row, index) => (
        <div key={index} className="flex w-full items-center gap-1.5">{row}</div>
      ))}
    </div>
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
  const [marks, setMarks] = useState<BirthdayMark[]>([]);
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
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
  const [colorsOpen, setColorsOpen] = useState(false);
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
    setSelectedMark(null);
    setLetter('');
    setSavedFlash(false);
    void loadBirthdayCard(person.id).then((payload) => {
      if (!alive) return;
      setStickers(payload.stickers);
      setTexts(payload.texts ?? []);
      setMarks(payload.marks ?? []);
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
    const picker = (window as Window & { showOpenFilePicker?: (options: { multiple?: boolean; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ getFile: () => Promise<File> }[]> }).showOpenFilePicker;
    if (picker) {
      void picker({ multiple: false, types: [{ description: 'Imagem', accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] } }] })
        .then(async (handles) => uploadFigurine(await handles[0]?.getFile(), cut))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          (cut ? cutRef : photoRef).current?.click();
        });
      return;
    }
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
        const result = await updateBirthdayText(editingText, { body, ...look, glyph: 'none' });
        setTexts((current) => current.map((item) => item.id === result.text.id ? result.text : item));
        toast.success('Texto atualizado.');
      } else {
        const result = await placeBirthdayText({ personId: person.id, body, x: letterPos.x, y: letterPos.y, ...look, glyph: 'none' });
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

  async function dropMark(kind: BirthdayMark['kind']) {
    if (!person || saving) return;
    const tones = inkTones(cardColor);
    const color = tones[Math.min(2, tones.length - 1)] ?? '#ffffff';
    const same = marks.filter((item) => item.kind === kind).length;
    const x = kind === 'star' ? 84 - same * 4 : 16 + same * 4;
    const y = kind === 'spark' ? 76 - same * 3 : 24 + same * 3;
    try {
      const result = await placeBirthdayMark({ personId: person.id, kind, color, x, y, size: 56 });
      setMarks((current) => [...current, result.mark]);
      setSelectedMark(result.mark.id);
    } catch {
      toast.error('Não foi possível colocar o desenho.');
    }
  }

  function paintInk(hex: string) {
    if (selectedMark) {
      const previous = marks.find((item) => item.id === selectedMark)?.color;
      setMarks((current) => current.map((item) => item.id === selectedMark ? { ...item, color: hex } : item));
      void updateBirthdayMark(selectedMark, { color: hex }).catch(() => {
        if (previous) setMarks((current) => current.map((item) => item.id === selectedMark ? { ...item, color: previous } : item));
        toast.error('Não foi possível colorir o desenho.');
      });
      return;
    }
    setLook((current) => ({ ...current, color: hex }));
  }

  async function removeMark(item: BirthdayMark) {
    if (item.authorId !== viewerId) return;
    try {
      await deleteBirthdayMark(item.id);
      setMarks((current) => current.filter((entry) => entry.id !== item.id));
      if (selectedMark === item.id) setSelectedMark(null);
    } catch {
      toast.error('Não foi possível excluir o desenho.');
    }
  }

  function beginMarkDrag(event: ReactPointerEvent<HTMLDivElement>, item: BirthdayMark) {
    if (!composing || asGuest || item.authorId !== viewerId) return;
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = { x: item.x, y: item.y };
    let next = origin;
    let moved = false;
    const move = (pointer: PointerEvent) => {
      if (Math.hypot(pointer.clientX - event.clientX, pointer.clientY - event.clientY) > 4) moved = true;
      next = {
        x: Math.min(92, Math.max(8, ((pointer.clientX - board.left) / board.width) * 100)),
        y: Math.min(88, Math.max(12, ((pointer.clientY - board.top) / board.height) * 100)),
      };
      setMarks((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...next } : entry));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setSelectedMark(item.id);
      if (!moved) return;
      void updateBirthdayMark(item.id, next).catch(() => {
        setMarks((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...origin } : entry));
        toast.error('Não foi possível mover o desenho.');
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
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
                  <p style={letterStyle(live)}>{live.body}</p>
                </div>
              );
            })}
            {composing && !asGuest && !editingText && letter.trim() ? (
              <div className="absolute z-20 w-[46%] cursor-grab" style={{ left: `${letterPos.x}%`, top: `${letterPos.y}%`, transform: 'translate(-50%, -50%)' }} onPointerDown={beginLetterDrag}>
                <p style={letterStyle(look)}>{letter}</p>
              </div>
            ) : null}
            {marks.map((mark) => {
              const own = mark.authorId === viewerId;
              return (
                <div key={mark.id} className="group absolute z-20" style={{ left: `${mark.x}%`, top: `${mark.y}%`, transform: 'translate(-50%, -50%)', color: mark.color }} onPointerDown={(event) => beginMarkDrag(event, mark)}>
                  {composing && !asGuest && own ? (
                    <span className="absolute -top-7 right-0 opacity-0 transition-opacity group-hover:opacity-100" onPointerDown={(event) => event.stopPropagation()}>
                      <button type="button" aria-label="Excluir desenho" onClick={() => void removeMark(mark)} className="grid h-7 w-7 place-items-center rounded-full border border-gray-100 bg-white text-[#9D174D] shadow-[0_8px_24px_rgba(15,23,42,0.06)]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  ) : null}
                  <span className={cn('block cursor-grab', selectedMark === mark.id && 'rounded-full ring-2 ring-[#6B33F6] ring-offset-2')}>
                    <Doodle kind={mark.kind} className="h-16 w-16" />
                  </span>
                </div>
              );
            })}
          </div>
          {composing && !asGuest ? (
            <div className="w-full shrink-0 lg:w-[340px]">
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,.heic,.heif" tabIndex={-1} className="pointer-events-none fixed left-0 top-0 h-8 w-8 opacity-[0.02]" onChange={(event) => { void uploadFigurine(event.target.files?.[0], false); event.target.value = ''; }} />
              <input ref={cutRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,.heic,.heif" tabIndex={-1} className="pointer-events-none fixed left-0 top-0 h-8 w-8 opacity-[0.02]" onChange={(event) => { void uploadFigurine(event.target.files?.[0], true); event.target.value = ''; }} />
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
                    {(() => {
                      const palette = [...swatches, ...PRESETS.filter((color) => !swatches.includes(color))];
                      const room = COLOR_COLUMNS * 3;
                      const overflow = palette.length > room;
                      const shown = colorsOpen || !overflow ? palette : palette.slice(0, room - 1);
                      const nodes = shown.map((color) => <Swatch key={color} color={color} pressed={cardColor === color} label={`Cor ${color}`} onPick={() => void paintCard(color)} onRemove={swatches.includes(color) ? () => forgetColor(color) : undefined} />);
                      if (overflow) nodes.push(<button key="mais" type="button" aria-label={colorsOpen ? 'Recolher cores' : 'Ver mais cores'} aria-expanded={colorsOpen} onClick={() => setColorsOpen((open) => !open)} className="grid aspect-square w-full min-w-0 flex-1 place-items-center rounded-full border border-gray-200 bg-white text-sm leading-none text-gray-500">…</button>);
                      return spreadRows(nodes);
                    })()}
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
                      <textarea value={letter} maxLength={80} onFocus={() => setSelectedMark(null)} onChange={(event) => { pushPast(); setLetter(event.target.value); }} className="min-h-16 w-full rounded-2xl bg-[#F6F4FB] px-3 py-2 text-sm text-gray-800 outline-none" placeholder="Um texto solto no cartão." />
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
                        ] as const).map(([key, title, mark]) => (
                          <button key={key} type="button" title={title} aria-label={title} aria-pressed={look[key]} onClick={() => { pushPast(); setLook((current) => ({ ...current, [key]: !current[key], effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look[key] ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>{mark}</button>
                        ))}
                        <button type="button" title="Maiúsculas" aria-label="Maiúsculas" aria-pressed={look.upper} onClick={() => { pushPast(); setLook((current) => ({ ...current, upper: !current.upper })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold', look.upper ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')}>AA</button>
                        <button type="button" title="Sombra no texto" aria-label="Sombra no texto" aria-pressed={look.shadow} onClick={() => { pushPast(); setLook((current) => ({ ...current, shadow: !current.shadow, effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look.shadow ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')} style={{ textShadow: '1px 1px 0 currentColor' }}>A</button>
                        <button type="button" title="Contorno do texto" aria-label="Contorno do texto" aria-pressed={look.outline} onClick={() => { pushPast(); setLook((current) => ({ ...current, outline: !current.outline, effect: 'plain' })); }} className={cn('grid h-8 w-8 place-items-center rounded-full text-[13px]', look.outline ? 'bg-[#6B33F6] text-white' : 'text-gray-500 hover:bg-[#F4F1FB]')} style={{ WebkitTextStroke: '1px currentColor', color: 'transparent', WebkitTextFillColor: look.outline ? '#fff' : '#6b7280' }}>A</button>
                      </div>
                      <div className="flex w-full items-center justify-between">
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
                        </div>
                        <div className="flex items-center gap-1">
                          {([
                            ['heart', 'Coração'],
                            ['star', 'Estrela'],
                            ['spark', 'Raios'],
                          ] as const).map(([id, title]) => (
                            <button key={id} type="button" title={title} aria-label={title} aria-pressed={marks.some((item) => item.id === selectedMark && item.kind === id)} disabled={saving} onClick={() => void dropMark(id)} className={cn('grid h-9 w-9 place-items-center rounded-full text-gray-900', marks.some((item) => item.id === selectedMark && item.kind === id) ? 'bg-[#6B33F6] text-white' : 'hover:bg-[#F4F1FB]')}>
                              <Doodle kind={id} className="h-7 w-7" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-gray-500">
                          Tamanho
                          <input type="range" min={18} max={72} value={look.size} aria-label="Tamanho do texto" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, size: Number(event.target.value) }))} className="mt-1 w-full accent-[#6B33F6]" />
                        </label>
                        <label className="block text-[11px] font-medium text-gray-500">
                          Espaçamento entre letras
                          <input type="range" min={-2} max={24} value={look.tracking} aria-label="Espaçamento entre letras" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, tracking: Number(event.target.value) }))} className="mt-1 w-full accent-[#6B33F6]" />
                        </label>
                        <label className="block text-[11px] font-medium text-gray-500">
                          Opacidade
                          <input type="range" min={15} max={100} value={Math.round(look.opacity * 100)} aria-label="Opacidade" onPointerDown={pushPast} onChange={(event) => setLook((current) => ({ ...current, opacity: Number(event.target.value) / 100 }))} className="mt-1 w-full accent-[#6B33F6]" />
                        </label>
                      </div>
                      {(() => {
                        const ink = marks.find((item) => item.id === selectedMark)?.color ?? look.color;
                        return (
                          <div className="flex w-full items-center gap-1.5">
                            <span className="relative block min-w-0 flex-1" onPointerDownCapture={pushPast}>
                              <span className="pointer-events-none block aspect-square w-full rounded-full" style={{ background: 'conic-gradient(#ff3b30, #ffcc00, #34c759, #32ade6, #5856d6, #ff2d55, #ff3b30)' }} />
                              <span className="pointer-events-none absolute top-1/2 left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" style={{ backgroundColor: ink }} />
                              <input type="color" value={ink} aria-label={selectedMark ? 'Cor do desenho' : 'Cor do texto'} onChange={(event) => paintInk(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                            </span>
                            {inkTones(cardColor).map((color) => <Swatch key={color} color={color} pressed={ink === color} label={selectedMark ? `Cor do desenho ${color}` : `Cor do texto ${color}`} onPick={() => { pushPast(); paintInk(color); }} />)}
                          </div>
                        );
                      })()}
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
