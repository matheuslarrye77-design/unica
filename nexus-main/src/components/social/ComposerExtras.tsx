import { ImagePlay, Smile, Sticker } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { listStickers, saveSticker, type SavedSticker } from '@/lib/stickers';
import { GifPicker } from './GifPicker';
import { EMOJI_GROUPS, STICKERS } from './mediaCatalog';

type Panel = 'emoji' | 'sticker' | 'gif' | null;

export const ComposerExtras: FC<{
  onEmoji: (emoji: string) => void;
  onSticker?: (url: string) => void;
  onGif?: (url: string) => void;
}> = ({ onEmoji, onSticker, onGif }) => {
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const [stickerCategory, setStickerCategory] = useState('Todas');
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const categories = useMemo(() => ['Minhas', 'Todas', ...new Set(STICKERS.map((item) => item.category))], []);
  const stickers = STICKERS.filter((item) => (stickerCategory === 'Todas' || item.category === stickerCategory) && (!term || `${item.title} ${item.tags}`.toLowerCase().includes(term)));
  const mine = savedStickers.filter(() => stickerCategory === 'Minhas' || stickerCategory === 'Todas');

  useEffect(() => {
    if (panel !== 'sticker') return;
    let current = true;
    listStickers().then((items) => { if (current) setSavedStickers(items); }).catch(() => { if (current) setUploadError('Não foi possível carregar suas figurinhas.'); });
    return () => { current = false; };
  }, [panel]);

  async function uploadSticker(file: File | undefined) {
    if (!file || uploading) return;
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setUploadError('Escolha uma imagem JPG, PNG, WEBP ou GIF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('A imagem precisa ter até 2 MB.');
      return;
    }
    setUploading(true);
    try {
      const sticker = await saveSticker(file);
      setSavedStickers((current) => [sticker, ...current.filter((item) => item.id !== sticker.id)]);
      onSticker?.(sticker.url);
      setPanel(null);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setUploadError(code === 'limit' ? 'Você chegou ao limite de 40 figurinhas salvas.' : code === 'file' ? 'Essa imagem não pode virar figurinha.' : 'Não foi possível salvar a figurinha.');
    } finally {
      setUploading(false);
    }
  }

  function toggle(next: Panel) {
    setPanel((current) => (current === next ? null : next));
    setQuery('');
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Emojis" aria-expanded={panel === 'emoji'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('emoji')}><Smile className="h-4 w-4" /></button>
        {onSticker ? <button type="button" aria-label="Figurinhas" aria-expanded={panel === 'sticker'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('sticker')}><Sticker className="h-4 w-4" /></button> : null}
        {onGif ? <button type="button" aria-label="GIFs" aria-expanded={panel === 'gif'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('gif')}><ImagePlay className="h-4 w-4" /></button> : null}
      </div>
      {panel ? (
        <div className="mt-2 w-full max-w-sm rounded-2xl border border-[#EFE6F4] bg-white p-2 shadow-lg">
          {panel === 'emoji' ? (
            <>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {EMOJI_GROUPS.map((item) => (
                  <button key={item.id} type="button" className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${group === item.id ? 'bg-[#8E35B8] text-white' : 'bg-[#F8EAFB] text-[#6A228C]'}`} onClick={() => setGroup(item.id)}>{item.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_GROUPS.find((item) => item.id === group)?.items.map((emoji) => (
                  <button key={emoji} type="button" className="grid h-10 place-items-center rounded-lg text-xl hover:bg-[#F8EAFB]" onClick={() => onEmoji(emoji)}>{emoji}</button>
                ))}
              </div>
            </>
          ) : null}
          {panel === 'sticker' ? (
            <>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { void uploadSticker(event.target.files?.[0]); event.target.value = ''; }} />
              <button type="button" disabled={uploading} className="mb-2 h-9 w-full rounded-lg bg-[#F8EAFB] text-[13px] font-medium text-[#6A228C] disabled:opacity-50" onClick={() => fileRef.current?.click()}>{uploading ? 'Salvando figurinha...' : 'Enviar imagem'}</button>
              {uploadError ? <p className="mb-2 px-1 text-center text-[12px] text-[#9D174D]">{uploadError}</p> : null}
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar figurinha" aria-label="Buscar figurinha" className="mb-2 h-9 w-full rounded-lg border border-[#EFE6F4] px-2 text-[13px]" />
              <div className="mb-2 flex gap-1 overflow-x-auto">
                {categories.map((item) => (
                  <button key={item} type="button" className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${stickerCategory === item ? 'bg-[#8E35B8] text-white' : 'bg-[#F8EAFB] text-[#6A228C]'}`} onClick={() => setStickerCategory(item)}>{item}</button>
                ))}
              </div>
              {mine.length === 0 && stickers.length === 0 ? <p className="px-1 py-3 text-center text-[12px] text-[#8A7C98]">{stickerCategory === 'Minhas' ? 'Você ainda não enviou uma figurinha.' : 'Nenhuma figurinha encontrada.'}</p> : null}
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                {mine.map((item) => (
                  <button key={item.id} type="button" className="rounded-xl bg-[#FBF7FD] p-1" onClick={() => { onSticker?.(item.url); setPanel(null); }} aria-label="Minha figurinha">
                    <img src={item.url} alt="" className="aspect-square w-full rounded-lg object-contain" />
                  </button>
                ))}
                {stickerCategory === 'Minhas' ? null : stickers.map((item) => (
                  <button key={item.id} type="button" className="rounded-xl bg-[#FBF7FD] p-1" onClick={() => { onSticker?.(item.url); setPanel(null); }} aria-label={item.title}>
                    <img src={item.url} alt={item.title} className="aspect-square w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {panel === 'gif' ? <GifPicker onPick={(url) => { onGif?.(url); setPanel(null); }} /> : null}
        </div>
      ) : null}
    </div>
  );
};
