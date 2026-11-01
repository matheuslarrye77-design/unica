import { ImageCrop } from '@/components/journal/ImageCrop';
import { AudioTrim } from '@/components/social/AudioTrim';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { JournalCover, JournalRichText, categoryTone } from '@/components/journal/JournalVisual';
import { useJournalCovers } from '@/components/journal/useJournal';
import {
  CONTENT_LIMIT,
  JOURNAL_CATEGORIES,
  TITLE_LIMIT,
  categoryLabel,
  categoryLocksDate,
  deleteJournalCover,
  isUserCover,
  journalPlainText,
  parseJournalPieces,
  readingMinutes,
  resolveJournalAsset,
  saveJournalArticle,
  saveJournalCover,
  saveJournalInline,
  serializeJournalPieces,
  type JournalArticle,
  type JournalCategory,
  type JournalMedia,
  type JournalPiece,
  type JournalStatus,
} from '@/data/journal';
import { uploadMedia } from '@/lib/feed';
import { cn, generateId } from '@/lib/utils';
import { Calendar, ChevronDown, Eye, FileText, Image as ImageIcon, ImagePlus, Info, Maximize2, Megaphone, Minimize2, Paperclip, Send, Trash2, Type, X } from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent, type DragEvent, type FC, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  article?: JournalArticle | null;
  author: string;
  onOpenChange: (open: boolean) => void;
};

const COVER_MAX = 5 * 1024 * 1024;
const AUDIO_MAX = 80 * 1024 * 1024;
const VIDEO_MAX = 200 * 1024 * 1024;
const DOC_MAX = 40 * 1024 * 1024;

const dot: Record<JournalCategory, string> = {
  social: 'bg-[#8E35B8]',
  processos: 'bg-[#3A6AAD]',
  urgente: 'bg-[#E11D48]',
  treinamentos: 'bg-[#15803D]',
};

function todayInput() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toInputDate(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('canvas'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    image.src = url;
  });
}

function imageFile(file: File) {
  return file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || /\.(jpe?g|png|webp)$/i.test(file.name);
}

type DescriptionHandle = { insertImage: (ref: string) => void };

function pieceSignature(pieces: JournalPiece[]) {
  return pieces.map((piece) => (piece.kind === 'text' ? piece.text : `{{img:${piece.ref}}}`)).join('\u0000');
}

function limitPieces(pieces: JournalPiece[]) {
  let used = 0;
  return pieces.map((piece) => {
    if (piece.kind !== 'text') return piece;
    const text = piece.text.slice(0, Math.max(0, CONTENT_LIMIT - used));
    used += text.length;
    return { ...piece, text };
  });
}

function ensureTextGaps(root: HTMLElement) {
  const images = [...root.querySelectorAll<HTMLElement>('[data-journal-image]')];
  const hold = (node: Node | null, where: 'before' | 'after', span: HTMLElement) => {
    if (!node || (node instanceof HTMLElement && node.dataset.journalImage)) {
      const gap = document.createTextNode('\u200B');
      if (where === 'before') span.before(gap);
      else span.after(gap);
      return;
    }
    if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').includes('\u200B') && !(node.textContent ?? '').replace(/\u200B/g, '').length) {
      node.textContent = '\u200B';
    }
  };
  if (!root.firstChild || (root.firstChild instanceof HTMLElement && root.firstChild.dataset.journalImage)) {
    root.prepend(document.createTextNode('\u200B'));
  }
  images.forEach((span) => {
    hold(span.previousSibling, 'before', span);
    hold(span.nextSibling, 'after', span);
  });
}

function readEditor(root: HTMLElement): JournalPiece[] {
  const pieces: JournalPiece[] = [];
  const addText = (value: string) => {
    const text = value.replace(/\u200B/g, '');
    const last = pieces[pieces.length - 1];
    if (last?.kind === 'text') last.text += text;
    else pieces.push({ id: generateId(), kind: 'text', text });
  };
  const walk = (node: Node) => {
    node.childNodes.forEach((child, index) => {
      if (child.nodeType === Node.TEXT_NODE) {
        addText(child.textContent ?? '');
        return;
      }
      if (child instanceof HTMLBRElement) {
        addText('\n');
        return;
      }
      if (child instanceof HTMLElement && child.dataset.journalImage) {
        const previous = pieces[pieces.length - 1];
        if (!previous || previous.kind === 'image') pieces.push({ id: generateId(), kind: 'text', text: '' });
        pieces.push({ id: child.dataset.pieceId || generateId(), kind: 'image', ref: child.dataset.journalImage });
        return;
      }
      if (child instanceof HTMLElement) {
        const block = child.tagName === 'DIV' || child.tagName === 'P';
        if (block && index > 0) addText('\n');
        walk(child);
      }
    });
  };
  walk(root);
  if (!pieces.length || pieces[0]?.kind !== 'text') pieces.unshift({ id: generateId(), kind: 'text', text: '' });
  if (pieces[pieces.length - 1]?.kind !== 'text') pieces.push({ id: generateId(), kind: 'text', text: '' });
  return limitPieces(pieces);
}

function caretPoint(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.isCollapsed || !selection.anchorNode || !root.contains(selection.anchorNode)) return null;
  return { node: selection.anchorNode, offset: selection.anchorOffset };
}

function imageBeside(root: HTMLElement, direction: 'before' | 'after') {
  const caret = caretPoint(root);
  if (!caret) return null;
  const { node, offset } = caret;
  if (node === root) {
    const sibling = direction === 'before' ? root.childNodes[offset - 1] : root.childNodes[offset];
    return sibling instanceof HTMLElement && sibling.dataset.journalImage ? sibling : null;
  }
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  const before = text.slice(0, offset).replace(/\u200B/g, '');
  const after = text.slice(offset).replace(/\u200B/g, '');
  if (direction === 'before' && before.length > 0) return null;
  if (direction === 'after' && after.length > 0) return null;
  let sibling: Node | null = direction === 'before' ? node.previousSibling : node.nextSibling;
  while (sibling && sibling.nodeType === Node.TEXT_NODE && !(sibling.textContent ?? '').replace(/\u200B/g, '').length) {
    sibling = direction === 'before' ? sibling.previousSibling : sibling.nextSibling;
  }
  return sibling instanceof HTMLElement && sibling.dataset.journalImage ? sibling : null;
}

function placeCaret(node: Node, offset: number) {
  const range = document.createRange();
  const max = node.nodeType === Node.TEXT_NODE ? (node.textContent ?? '').length : node.childNodes.length;
  range.setStart(node, Math.min(offset, max));
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function placeCaretAtEnd(root: HTMLElement) {
  const last = root.lastChild;
  if (!last) return;
  if (last.nodeType === Node.TEXT_NODE) placeCaret(last, (last.textContent ?? '').length);
  else placeCaret(root, root.childNodes.length);
}

const AttachedMedia: FC<{ items: JournalMedia[]; onRemove?: (id: string) => void }> = ({ items, onRemove }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item.id} className="flex items-center gap-2 rounded-xl bg-[#FBF9FD] px-3 py-2" onPointerDown={(event) => event.stopPropagation()}>
        <span className="min-w-0 flex-1">
          {item.kind === 'audio' ? <ClipAudio url={resolveJournalAsset(item.url)} start={item.start} duration={item.duration} /> : null}
          {item.kind === 'video' ? <video controls src={resolveJournalAsset(item.url)} className="max-h-36 w-full rounded-lg" /> : null}
          {item.kind === 'image' ? <img src={resolveJournalAsset(item.url)} alt="" className="max-h-28 rounded-lg object-contain" /> : null}
          {item.kind === 'document' ? <a href={resolveJournalAsset(item.url)} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-[#6A228C] underline">{item.name}</a> : null}
        </span>
        {onRemove ? <button type="button" className="shrink-0 text-[12px] font-semibold text-[#9D174D]" onClick={() => onRemove(item.id)}>Remover</button> : null}
      </li>
    ))}
  </ul>
);

const ClipAudio: FC<{ url: string; start?: number; duration?: number }> = ({ url, start = 0, duration }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const place = () => {
      if (audio.currentTime < start || (duration && audio.currentTime >= start + duration)) audio.currentTime = start;
    };
    const tick = () => {
      if (duration && audio.currentTime >= start + duration) {
        audio.pause();
        audio.currentTime = start;
      }
    };
    audio.addEventListener('play', place);
    audio.addEventListener('timeupdate', tick);
    return () => {
      audio.removeEventListener('play', place);
      audio.removeEventListener('timeupdate', tick);
    };
  }, [start, duration, url]);
  return <audio ref={ref} controls src={url} preload="metadata" className="h-8 w-full" />;
};

const DescriptionBalloon = forwardRef<DescriptionHandle, {
  pieces: JournalPiece[];
  expanded?: boolean;
  plainLength: number;
  onPieces: (pieces: JournalPiece[]) => void;
  onImageFile: (file: File) => void;
}>(function DescriptionBalloon({ pieces, expanded, plainLength, onPieces, onImageFile }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const localSerial = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const syncRef = useRef<() => void>(() => {});
  const empty = !pieces.some((piece) => piece.kind === 'image' || piece.text.length > 0);

  function rememberCaret() {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (!root || !selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreCaret() {
    const root = editorRef.current;
    const range = savedRange.current;
    if (!root || !range || !root.contains(range.startContainer)) {
      if (root) placeCaretAtEnd(root);
      return;
    }
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function syncFromDom() {
    const root = editorRef.current;
    if (!root) return;
    ensureTextGaps(root);
    const next = readEditor(root);
    const signature = pieceSignature(next);
    if (signature === localSerial.current) return;
    localSerial.current = signature;
    rememberCaret();
    onPieces(next);
  }

  syncRef.current = syncFromDom;

  useEffect(() => {
    const onSelection = () => {
      const root = editorRef.current;
      const selection = window.getSelection();
      if (!root || !selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) return;
      savedRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  function insertText(value: string) {
    const root = editorRef.current;
    if (!root || !value) return;
    root.focus();
    restoreCaret();
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(value);
    range.insertNode(node);
    placeCaret(node, value.length);
    rememberCaret();
    syncFromDom();
  }

  useImperativeHandle(ref, () => ({
    insertImage(imageRef: string) {
      const root = editorRef.current;
      if (!root) return;
      root.focus();
      restoreCaret();
      const selection = window.getSelection();
      if (!selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) placeCaretAtEnd(root);
      const range = window.getSelection()?.getRangeAt(0);
      if (!range) return;
      range.deleteContents();
      const span = document.createElement('span');
      span.dataset.journalImage = imageRef;
      span.dataset.pieceId = generateId();
      span.contentEditable = 'false';
      span.className = 'group relative my-2 block';
      span.draggable = false;
      const image = document.createElement('img');
      image.src = resolveJournalAsset(imageRef);
      image.alt = '';
      image.draggable = false;
      image.className = 'max-h-72 w-full rounded-xl bg-[#F8F4FB] object-contain';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.tabIndex = -1;
      remove.setAttribute('aria-label', 'Remover imagem da descrição');
      remove.className = 'absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-white text-[14px] leading-none text-[#9D174D] opacity-0 shadow transition-opacity group-hover:opacity-100';
      remove.textContent = '×';
      remove.addEventListener('mousedown', (event) => event.preventDefault());
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        span.remove();
        ensureTextGaps(root);
        syncRef.current();
      });
      span.addEventListener('mousedown', (event) => {
        if (event.target === remove) return;
        event.preventDefault();
        const next = document.createRange();
        next.selectNode(span);
        const current = window.getSelection();
        current?.removeAllRanges();
        current?.addRange(next);
        savedRange.current = next.cloneRange();
      });
      span.append(image, remove);
      range.insertNode(span);
      const after = span.nextSibling && span.nextSibling.nodeType === Node.TEXT_NODE ? span.nextSibling : document.createTextNode('\u200B');
      if (after.parentNode !== root) span.after(after);
      ensureTextGaps(root);
      const gap = span.nextSibling;
      if (gap?.nodeType === Node.TEXT_NODE) placeCaret(gap, Math.min(1, (gap.textContent ?? '').length));
      else placeCaretAtEnd(root);
      rememberCaret();
      syncFromDom();
    },
  }));

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    const signature = pieceSignature(pieces);
    if (localSerial.current === signature && root.childNodes.length > 0) return;
    root.replaceChildren();
    if (!pieces.length) root.append(document.createTextNode('\u200B'));
    pieces.forEach((piece) => {
      if (piece.kind === 'text') {
        root.append(document.createTextNode(piece.text.length ? piece.text : '\u200B'));
        return;
      }
      const span = document.createElement('span');
      span.dataset.journalImage = piece.ref;
      span.dataset.pieceId = piece.id;
      span.contentEditable = 'false';
      span.className = 'group relative my-2 block';
      span.draggable = false;
      const image = document.createElement('img');
      image.src = resolveJournalAsset(piece.ref);
      image.alt = '';
      image.draggable = false;
      image.className = 'max-h-72 w-full rounded-xl bg-[#F8F4FB] object-contain';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.tabIndex = -1;
      remove.setAttribute('aria-label', 'Remover imagem da descrição');
      remove.className = 'absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full bg-white text-[14px] leading-none text-[#9D174D] opacity-0 shadow transition-opacity group-hover:opacity-100';
      remove.textContent = '×';
      remove.addEventListener('mousedown', (event) => event.preventDefault());
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        span.remove();
        ensureTextGaps(root);
        syncRef.current();
      });
      span.addEventListener('mousedown', (event) => {
        if (event.target === remove) return;
        event.preventDefault();
        const next = document.createRange();
        next.selectNode(span);
        const current = window.getSelection();
        current?.removeAllRanges();
        current?.addRange(next);
      });
      span.append(image, remove);
      root.append(span);
    });
    ensureTextGaps(root);
    localSerial.current = signature;
    if (document.activeElement === root) restoreCaret();
  }, [pieces, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    placeCaretAtEnd(root);
  }, [expanded]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const root = editorRef.current;
    if (!root) return;
    const emptyGap = () => {
      const caret = caretPoint(root);
      return Boolean(caret && caret.node.nodeType === Node.TEXT_NODE && !(caret.node.textContent ?? '').replace(/\u200B/g, '').length);
    };
    if (event.key === 'Enter' || (event.key === ' ' && emptyGap())) {
      event.preventDefault();
      insertText('\n');
      return;
    }
    if (event.key !== 'Backspace' && event.key !== 'Delete') return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selected = [...root.querySelectorAll<HTMLElement>('[data-journal-image]')].filter((node) => selection.containsNode(node, true));
      if (!selected.length) return;
      event.preventDefault();
      const range = selection.getRangeAt(0);
      selected.forEach((node) => node.remove());
      range.deleteContents();
      ensureTextGaps(root);
      placeCaretAtEnd(root);
      syncFromDom();
      return;
    }
    const target = event.key === 'Backspace' ? imageBeside(root, 'before') : imageBeside(root, 'after');
    if (!target) return;
    event.preventDefault();
    const next = event.key === 'Backspace' ? target.nextSibling : target.previousSibling;
    target.remove();
    ensureTextGaps(root);
    if (next?.nodeType === Node.TEXT_NODE && root.contains(next)) {
      placeCaret(next, event.key === 'Backspace' ? 0 : (next.textContent ?? '').length);
    }
    syncFromDom();
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const file = [...event.clipboardData.files].find((item) => imageFile(item));
    event.preventDefault();
    rememberCaret();
    if (file) {
      onImageFile(file);
      return;
    }
    const room = CONTENT_LIMIT - plainLength;
    const text = event.clipboardData.getData('text/plain').slice(0, Math.max(0, room));
    insertText(text);
  }

  return (
    <div className={cn('rounded-2xl border border-[#E6DEEF] bg-[#FBF9FD] px-3 py-2 focus-within:border-[#E4C8EE] focus-within:ring-2 focus-within:ring-[#F3E4FA]', expanded && 'min-h-[52vh]')}>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Escreva uma descrição sobre a publicação..."
        data-placeholder="Escreva uma descrição sobre a publicação..."
        data-empty={empty ? 'true' : 'false'}
        suppressContentEditableWarning
        className={cn('relative whitespace-pre-wrap break-words text-[13.5px] leading-5 text-[#241B33] outline-none data-[empty=true]:before:pointer-events-none data-[empty=true]:before:float-left data-[empty=true]:before:h-0 data-[empty=true]:before:text-[#B0A8BA] data-[empty=true]:before:content-[attr(data-placeholder)]', expanded ? 'min-h-[52vh]' : 'min-h-10')}
        onKeyDown={onKeyDown}
        onKeyUp={rememberCaret}
        onMouseUp={rememberCaret}
        onBlur={rememberCaret}
        onInput={syncFromDom}
        onPaste={onPaste}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = [...event.dataTransfer.files].find((item) => imageFile(item));
          if (!file) return;
          const point = document.caretRangeFromPoint(event.clientX, event.clientY);
          if (point && editorRef.current?.contains(point.startContainer)) savedRange.current = point;
          else rememberCaret();
          onImageFile(file);
        }}
      />
      <p className="pt-1 text-right text-[12px] leading-4 text-[#B0A8BA]">{plainLength}/{CONTENT_LIMIT}</p>
    </div>
  );
});

export const JournalEditor: FC<Props> = ({ open, article, author, onOpenChange }) => {
  const covers = useJournalCovers();
  const coverInput = useRef<HTMLInputElement>(null);
  const inlineInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const fieldEditor = useRef<DescriptionHandle>(null);
  const modalEditor = useRef<DescriptionHandle>(null);
  const savedOnClose = useRef(false);
  const [title, setTitle] = useState('');
  const [pieces, setPieces] = useState<JournalPiece[]>([{ id: 'texto', kind: 'text', text: '' }]);
  const [category, setCategory] = useState<JournalCategory>('social');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [cover, setCover] = useState('');
  const [library, setLibrary] = useState(false);
  const [date, setDate] = useState(todayInput);
  const [authorName, setAuthorName] = useState(author);
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [pinned, setPinned] = useState(false);
  const [pinHint, setPinHint] = useState(false);
  const [writing, setWriting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [inlineFile, setInlineFile] = useState<File | null>(null);
  const [sending, setSending] = useState('');
  const dateLocked = categoryLocksDate(category);
  const coverUrl = resolveJournalAsset(cover);
  const content = serializeJournalPieces(pieces);
  const plainLength = pieces.reduce((sum, piece) => sum + (piece.kind === 'text' ? piece.text.length : 0), 0);
  const canAutosave = !article || article.status === 'draft';
  const dirty = Boolean(title.trim() || journalPlainText(content) || cover || media.length);

  useEffect(() => {
    if (!open) return;
    savedOnClose.current = false;
    setTitle(article?.title ?? '');
    setPieces(parseJournalPieces(article?.content ?? ''));
    setCategory(article?.category ?? 'social');
    setCover(article && (article.cover.startsWith('lib:') || isUserCover(article.cover)) ? article.cover : '');
    const loadedDate = article && !categoryLocksDate(article.category) ? toInputDate(article.date) : todayInput();
    setDate(loadedDate < todayInput() ? todayInput() : loadedDate);
    setAuthorName(article?.author ?? author);
    setMedia(article?.media ?? []);
    setPinned(article?.pinned ?? false);
    setPinHint(false);
    setWriting(false);
    setPreview(false);
    setLibrary(false);
    setAudioFile(null);
    setCoverFile(null);
    setInlineFile(null);
    setCategoryOpen(false);
  }, [open, article, author]);

  useEffect(() => {
    if (dateLocked) setDate(todayInput());
  }, [dateLocked]);

  async function storedImage(file: File, save: (url: string) => { id: string }) {
    if (!imageFile(file)) {
      toast.error('Use uma imagem JPG, PNG ou WEBP.');
      return '';
    }
    if (file.size > COVER_MAX) {
      toast.error('A imagem passa de 5 MB.');
      return '';
    }
    try {
      const asset = save(await compressImage(file));
      return `lib:${asset.id}`;
    } catch {
      toast.error('Não foi possível guardar a imagem.');
      return '';
    }
  }

  function queueInline(file?: File) {
    if (!file) return;
    if (!imageFile(file)) {
      toast.error('Use uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > COVER_MAX) {
      toast.error('A imagem passa de 5 MB.');
      return;
    }
    setInlineFile(file);
  }

  function onCoverFile(file?: File) {
    if (!file) return;
    if (!imageFile(file)) {
      toast.error('Use uma imagem JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > COVER_MAX) {
      toast.error('A imagem passa de 5 MB.');
      return;
    }
    setCoverFile(file);
  }

  async function confirmCover(file: File) {
    setCoverFile(null);
    const stored = await storedImage(file, saveJournalCover);
    if (stored) {
      setCover(stored);
      setLibrary(false);
    }
  }

  async function confirmInline(file: File) {
    setInlineFile(null);
    const stored = await storedImage(file, saveJournalInline);
    if (!stored) return;
    (writing ? modalEditor : fieldEditor).current?.insertImage(stored);
  }

  async function addUpload(file: File, kind: JournalMedia['kind']) {
    const limit = kind === 'video' ? VIDEO_MAX : kind === 'audio' ? AUDIO_MAX : DOC_MAX;
    if (file.size > limit) {
      toast.error(kind === 'video' ? 'O vídeo passa de 200 MB.' : kind === 'audio' ? 'O áudio passa de 80 MB.' : 'O documento passa de 40 MB.');
      return;
    }
    setSending(kind);
    try {
      const uploaded = await uploadMedia(file);
      const item: JournalMedia = { id: generateId(), name: uploaded.name || file.name, kind, url: uploaded.url };
      setMedia((current) => [...current, item].slice(0, 8));
    } catch {
      toast.error('Não foi possível enviar o arquivo. Tente novamente.');
    } finally {
      setSending('');
    }
  }

  async function addImageAttachment(file?: File) {
    if (!file) return;
    const stored = await storedImage(file, saveJournalInline);
    if (!stored) return;
    const item: JournalMedia = { id: generateId(), name: file.name, kind: 'image', url: stored };
    setMedia((current) => [...current, item].slice(0, 8));
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) onCoverFile(file);
  }

  function chooseCategory(next: JournalCategory) {
    setCategory(next);
    setCategoryOpen(false);
    if (categoryLocksDate(next)) setDate(todayInput());
  }

  function draftPayload(status: JournalStatus) {
    return {
      title: title.trim() || (status === 'draft' ? 'Sem título' : title),
      content,
      category,
      cover,
      date,
      author: authorName,
      status,
      pinned,
      media,
    };
  }

  function saveQuietDraft() {
    if (savedOnClose.current || !canAutosave || !dirty) return;
    savedOnClose.current = true;
    try {
      saveJournalArticle(draftPayload('draft'), article?.id);
      toast.success('Rascunho salvo.');
    } catch {
      savedOnClose.current = false;
      toast.error('Não foi possível guardar o rascunho.');
    }
  }

  function publish(status: JournalStatus) {
    if (!title.trim() || !journalPlainText(content).trim() || !authorName.trim() || !date) {
      toast.error('Preencha título, descrição e categoria.');
      return;
    }
    savedOnClose.current = true;
    try {
      const result = saveJournalArticle(draftPayload(status), article?.id);
      if (result.replacedId) toast.success('Publicação salva. A mais antiga saiu do destaque.');
      else toast.success(status === 'draft' ? 'Rascunho salvo.' : 'Publicação salva.');
      onOpenChange(false);
    } catch {
      savedOnClose.current = false;
      toast.error('Não foi possível salvar. A imagem pode ter ficado grande demais.');
    }
  }

  const previewArticle = {
    title: title || 'Título da publicação',
    content,
    category,
    cover,
    media,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-1rem)] w-[min(840px,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-[28px] border-[#E7E0F0] bg-white p-4 shadow-[0_24px_80px_rgba(70,30,110,0.16)] sm:max-w-[840px]"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement | null;
          if (pinHint && !target?.closest('[data-pin-hint]')) setPinHint(false);
        }}
        onEscapeKeyDown={(event) => {
          if (writing) {
            event.preventDefault();
            setWriting(false);
            return;
          }
          if (coverFile || inlineFile || audioFile) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-journal-overlay]')) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-journal-overlay]')) {
            event.preventDefault();
            return;
          }
          saveQuietDraft();
        }}
      >
        <div className="mb-3 flex shrink-0 items-start gap-3 pr-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <DialogTitle className="text-[18px] font-semibold tracking-tight text-[#241B33]">{article ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[12.5px] text-[#8A7C98]">Título, conteúdo, categoria e materiais da notícia. A imagem de capa é opcional.</DialogDescription>
          </div>
        </div>

        {preview ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="rounded-[22px] border border-[#EFE8F4] bg-white p-3.5 shadow-[0_10px_28px_rgba(80,40,120,0.06)]">
              <JournalCover article={previewArticle} />
              <h3 className="mt-3.5 text-[17px] font-semibold leading-snug text-[#1A1428]">{previewArticle.title}</h3>
              <JournalRichText content={content} className="mt-2 space-y-2 text-[13px] leading-5 text-[#625C70]" />
              <p className="mt-3 text-[12.5px] text-[#948D9E]">{new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })} · {readingMinutes(content || 'texto')} min</p>
              <p className="mt-3 text-[13.5px] font-semibold text-[#6A228C]">{authorName}</p>
            </div>
            {media.length > 0 ? <div className="mt-3 space-y-2"><AttachedMedia items={media} /></div> : null}
            <button type="button" onClick={() => setPreview(false)} className="mt-4 h-10 rounded-full px-4 text-sm font-semibold text-[#6A228C] hover:bg-[#F3E4FA]">Voltar à edição</button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pr-1">
            <label className="grid gap-1">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#241B33]"><Type className="h-3.5 w-3.5 text-[#8E35B8]" /> Título</span>
              <span className="relative">
                <input value={title} maxLength={TITLE_LIMIT} onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))} placeholder="Digite o título da publicação..." className="h-10 w-full rounded-2xl border border-[#E6DEEF] bg-[#FBF9FD] px-4 pr-16 text-[14px] outline-none placeholder:text-[#B0A8BA] focus:border-[#C9A4DE]" />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[12px] text-[#B0A8BA]">{title.length}/{TITLE_LIMIT}</span>
              </span>
            </label>
            <div className="grid gap-1">
              <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#241B33]">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-[#8E35B8]" /> Descrição</span>
                <span className="flex items-center gap-0.5">
                  <button type="button" aria-label="Inserir imagem na descrição" onClick={() => inlineInput.current?.click()} className="grid h-7 w-7 place-items-center rounded-full text-[#8E35B8] hover:bg-[#F3E4FA]"><ImagePlus className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-pressed={writing} aria-label="Ampliar descrição" onClick={() => setWriting(true)} className="grid h-7 w-7 place-items-center rounded-full text-[#B0A8BA] hover:bg-[#F3E4FA] hover:text-[#6A228C]">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </span>
              <DescriptionBalloon ref={fieldEditor} pieces={pieces} plainLength={plainLength} onPieces={setPieces} onImageFile={queueInline} />
              <input ref={inlineInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) setInlineFile(file); }} />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
              <div className="relative">
                <button type="button" aria-expanded={categoryOpen} onClick={() => setCategoryOpen((current) => !current)} className="flex h-10 w-full items-center gap-2 rounded-2xl border border-[#E6DEEF] bg-white px-3 text-left text-[14px] font-medium">
                  <span className={cn('h-2.5 w-2.5 rounded-full', dot[category])} />
                  <span className="min-w-0 flex-1 truncate">{categoryLabel(category)}</span>
                  <ChevronDown className="h-4 w-4 text-[#8A7C98]" />
                </button>
                {categoryOpen ? (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[#E6DEEF] bg-white p-1 shadow-[0_12px_32px_rgba(70,30,110,0.12)]">
                    {JOURNAL_CATEGORIES.map((item) => (
                      <button key={item.id} type="button" onClick={() => chooseCategory(item.id)} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[14px]', category === item.id && categoryTone[item.id].badge)}>
                        <span className={cn('h-2.5 w-2.5 rounded-full', dot[item.id])} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <label className={cn('relative flex h-10 items-center rounded-2xl border border-[#E6DEEF] bg-white px-3', dateLocked && 'bg-[#F7F4FA] text-[#8A7C98]')}>
                <Calendar className="pointer-events-none absolute right-3 h-4 w-4 text-[#8A7C98]" />
                <input type="date" value={date} min={todayInput()} disabled={dateLocked} onChange={(event) => { const next = event.target.value; if (next && next < todayInput()) { setDate(todayInput()); return; } setDate(next); }} aria-label="Data" title={dateLocked ? 'Nesta categoria a data fica no dia de hoje.' : 'A data não pode ser anterior a hoje.'} className="h-full w-full bg-transparent pr-7 text-[14px] outline-none disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0" />
              </label>
            </div>
            <div className="grid gap-1.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#241B33]"><ImageIcon className="h-3.5 w-3.5 text-[#8E35B8]" /> Imagem de capa</span>
              <button type="button" onClick={() => setLibrary((current) => !current)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="overflow-hidden rounded-2xl border border-dashed border-[#D9C6E8] bg-[#FBF9FD] text-left">
                {coverUrl ? (
                  <span className="relative block">
                    <img src={coverUrl} alt="Pré-visualização da capa" className="aspect-[1400/320] w-full object-cover" />
                    <span className="absolute right-3 bottom-2 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-[#6A228C]">Trocar imagem</span>
                  </span>
                ) : (
                  <span className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-center">
                    <span className="mb-1 grid h-9 w-9 place-items-center rounded-xl bg-[#F3E4FA] text-[#8E35B8]"><ImageIcon className="h-5 w-5" /></span>
                    <span className="text-[13px] font-medium text-[#5C5470]">Arraste uma imagem aqui ou clique para selecionar</span>
                    <span className="text-[12px] text-[#8A7C98]">Formatos: JPG, PNG, WEBP • Tamanho máximo: 5MB</span>
                  </span>
                )}
              </button>
              {library ? (
                <div className="rounded-2xl border border-[#E6DEEF] bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold">Biblioteca de imagens</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => coverInput.current?.click()} className="rounded-full bg-[#F3E4FA] px-3 py-1.5 text-[12px] font-semibold text-[#6A228C]">Enviar nova imagem</button>
                      <button type="button" aria-label="Fechar biblioteca" onClick={() => setLibrary(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#8A7C98]"><X className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {covers.length === 0 ? <p className="py-3 text-center text-sm text-[#8A7C98]">Nenhuma imagem salva ainda. Envie uma para reutilizar nas próximas publicações.</p> : (
                    <div className="grid max-h-28 grid-cols-4 gap-2 overflow-y-auto">
                      {covers.map((item) => (
                        <div key={item.id} className="relative">
                          <button type="button" onClick={() => { setCover(`lib:${item.id}`); setLibrary(false); }} className={cn('block w-full overflow-hidden rounded-xl border', cover === `lib:${item.id}` ? 'border-[#8E35B8]' : 'border-transparent')}>
                            <img src={item.url} alt="" className="aspect-[4/3] w-full object-cover" />
                          </button>
                          <button type="button" aria-label="Excluir imagem da biblioteca" className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#9D174D] shadow" onClick={() => { if (!window.confirm('Tem certeza que deseja excluir esta imagem da biblioteca?')) return; deleteJournalCover(item.id); if (cover === `lib:${item.id}`) setCover(''); }}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void onCoverFile(file); }} />
            </div>
            {media.length > 0 ? <AttachedMedia items={media} onRemove={(id) => setMedia((current) => current.filter((file) => file.id !== id))} /> : null}
            {sending ? <p className="text-[12px] text-[#8A7C98]">Enviando {sending === 'audio' ? 'áudio' : sending === 'video' ? 'vídeo' : 'arquivo'}...</p> : null}
            <div className="relative flex items-center gap-2 pb-1 text-[14px] text-[#241B33]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} className="h-4 w-4 accent-[#7A2498]" />
                Fixar como destaque
              </label>
              <span className="relative" data-pin-hint onMouseEnter={() => setPinHint(true)} onMouseLeave={() => setPinHint(false)}>
                <button type="button" data-pin-hint aria-expanded={pinHint} aria-label="Como funciona o destaque" onClick={() => setPinHint((current) => !current)} className="grid h-4 w-4 place-items-center rounded-full text-[#8A7C98]">
                  <Info className="h-3.5 w-3.5" />
                </button>
                {pinHint ? (
                  <p data-pin-hint className="absolute bottom-7 left-0 z-30 w-[min(360px,80vw)] rounded-2xl border border-[#E6DEEF] bg-white p-3 text-[12.5px] leading-5 text-[#3C3952] shadow-[0_12px_32px_rgba(70,30,110,0.14)]">
                    É possível manter até três publicações fixadas. Ao atingir esse limite, a publicação fixada há mais tempo será desafixada automaticamente. Para escolher qual será removida, desafixe-a manualmente antes de fixar uma nova.
                  </p>
                ) : null}
              </span>
            </div>
          </div>
        )}
        {preview ? null : (
          <>
            <div className="mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-[#F0E8F4] pt-3">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E6DEEF] bg-white px-3 text-[13px] font-semibold text-[#5C5470]">
                    <Paperclip className="h-4 w-4" /> Arquivos <ChevronDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-2xl">
                    <DropdownMenuItem onSelect={() => audioInput.current?.click()}>Enviar áudio</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => videoInput.current?.click()}>Enviar vídeo</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => imageInput.current?.click()}>Enviar imagem</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => documentInput.current?.click()}>Enviar documentos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button type="button" onClick={() => publish('draft')} className="h-10 rounded-full px-3 text-[13px] font-semibold text-[#6A228C] hover:bg-[#F3E4FA]">Rascunho</button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Pré-visualizar" onClick={() => setPreview(true)} className="grid h-11 w-11 place-items-center rounded-full border border-[#E6DEEF] bg-white text-[#6A228C] hover:bg-[#F3E4FA]">
                  <Eye className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => publish('published')} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#7A2498] px-5 text-[14px] font-semibold text-white hover:bg-[#6A228C]">
                  <Send className="h-4 w-4" /> Publicar
                </button>
              </div>
            </div>
            <input ref={audioInput} type="file" accept="audio/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (file.size > AUDIO_MAX) { toast.error('O áudio passa de 80 MB.'); return; } setAudioFile(file); }} />
            <input ref={videoInput} type="file" accept="video/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void addUpload(file, 'video'); }} />
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void addImageAttachment(file); }} />
            <input ref={documentInput} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void addUpload(file, 'document'); }} />
          </>
        )}
        {audioFile ? createPortal(
          <AudioTrim
            file={audioFile}
            onCancel={() => setAudioFile(null)}
            onConfirm={(file, clip) => {
              setAudioFile(null);
              setSending('audio');
              void uploadMedia(file).then((uploaded) => {
                const item: JournalMedia = { id: generateId(), name: file.name || 'audio', kind: 'audio', url: uploaded.url, start: clip.start, duration: clip.duration };
                setMedia((current) => [...current, item].slice(0, 8));
              }).catch(() => {
                toast.error('Não foi possível enviar o áudio. Tente novamente.');
              }).finally(() => setSending(''));
            }}
          />,
          document.body,
        ) : null}
        {coverFile ? createPortal(
          <ImageCrop file={coverFile} banner darken onCancel={() => setCoverFile(null)} onConfirm={(file) => void confirmCover(file)} />,
          document.body,
        ) : null}
        {inlineFile ? createPortal(
          <ImageCrop file={inlineFile} onCancel={() => setInlineFile(null)} onConfirm={(file) => void confirmInline(file)} />,
          document.body,
        ) : null}
        {writing ? createPortal(
          <div data-journal-overlay className="pointer-events-auto fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4" style={{ pointerEvents: 'auto' }}>
            <div className="pointer-events-auto flex max-h-[min(860px,calc(100dvh-2rem))] w-[min(840px,calc(100%-2rem))] flex-col rounded-[28px] bg-white p-4 shadow-[0_24px_80px_rgba(70,30,110,0.2)]" style={{ pointerEvents: 'auto' }} role="dialog" aria-label="Descrição ampliada">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[#241B33]">Descrição</p>
                <span className="flex items-center gap-0.5">
                  <button type="button" aria-label="Inserir imagem na descrição" onClick={() => inlineInput.current?.click()} className="grid h-8 w-8 place-items-center rounded-full text-[#8E35B8] hover:bg-[#F3E4FA]"><ImagePlus className="h-4 w-4" /></button>
                  <button type="button" aria-label="Reduzir descrição" onClick={() => setWriting(false)} className="grid h-8 w-8 place-items-center rounded-full text-[#6A228C] hover:bg-[#F3E4FA]"><Minimize2 className="h-4 w-4" /></button>
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DescriptionBalloon ref={modalEditor} expanded pieces={pieces} plainLength={plainLength} onPieces={setPieces} onImageFile={queueInline} />
              </div>
            </div>
          </div>,
          document.body,
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
