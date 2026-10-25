import { ImagePlay, Plus, Smile, Sticker } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { listStickers, saveSticker, type SavedSticker } from '@/lib/stickers';
import { GifPicker } from './GifPicker';
import { EMOJI_GROUPS } from './mediaCatalog';

type Panel = 'emoji' | 'sticker' | 'gif' | null;

export const ComposerExtras: FC<{
  onEmoji: (emoji: string) => void;
  onSticker?: (url: string) => void;
  onGif?: (url: string) => void;
}> = ({ onEmoji, onSticker, onGif }) => {
  const [panel, setPanel] = useState<Panel>(null);
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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
              {uploadError ? <p className="mb-2 px-1 text-center text-[12px] text-[#9D174D]">{uploadError}</p> : null}
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                <button type="button" disabled={uploading} aria-label="Enviar figurinha" className="grid aspect-square place-items-center rounded-xl border border-dashed border-[#D7B6E8] bg-[#FBF7FD] text-[#8E35B8] disabled:opacity-50" onClick={() => fileRef.current?.click()}>
                  <Plus className="h-6 w-6" />
                </button>
                {savedStickers.map((item) => (
                  <button key={item.id} type="button" className="rounded-xl bg-[#FBF7FD] p-1" onClick={() => { onSticker?.(item.url); setPanel(null); }} aria-label="Minha figurinha">
                    <img src={item.url} alt="" className="aspect-square w-full rounded-lg object-contain" />
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
