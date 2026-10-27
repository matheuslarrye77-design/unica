import { ArrowUp, ImagePlay, Plus, Smile, Sticker, X } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { forgetSticker, listStickers, prioritizeSticker, saveSticker, subscribeStickerLibrary, useSticker, type SavedSticker } from '@/lib/stickers';
import { GifPicker } from './GifPicker';
import { EMOJI_GROUPS } from './mediaCatalog';

type Panel = 'emoji' | 'sticker' | 'gif' | null;

export const ComposerExtras: FC<{
  onEmoji: (emoji: string) => void;
  onSticker?: (url: string) => void;
  onGif?: (url: string) => void;
  embedded?: 'emoji' | 'sticker' | 'gif';
  onPicked?: () => void;
}> = ({ onEmoji, onSticker, onGif, embedded, onPicked }) => {
  const [panel, setPanel] = useState<Panel>(embedded ?? null);
  const emojis = [...new Set(EMOJI_GROUPS.flatMap((item) => item.items))];
  const [savedStickers, setSavedStickers] = useState<SavedSticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeStickerLibrary(setSavedStickers), []);

  const active = embedded ?? panel;

  useEffect(() => {
    if (active !== 'sticker') return;
    let current = true;
    listStickers().then((items) => { if (current) setSavedStickers(items); }).catch(() => { if (current) setUploadError('Não foi possível carregar suas figurinhas.'); });
    return () => { current = false; };
  }, [active]);

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
      onPicked?.();
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

  const body = (
    <>
      {active === 'emoji' ? (
        <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto">
          {emojis.map((emoji) => (
            <button key={emoji} type="button" className="grid h-8 place-items-center rounded-lg text-lg hover:bg-[#F8EAFB]" onClick={() => onEmoji(emoji)}>{emoji}</button>
          ))}
        </div>
      ) : null}
      {active === 'sticker' ? (
        <>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => { void uploadSticker(event.target.files?.[0]); event.target.value = ''; }} />
          {uploadError ? <p className="mb-2 px-1 text-center text-[12px] text-[#9D174D]">{uploadError}</p> : null}
          <div className="mb-2 flex justify-end px-1">
            <button type="button" className="text-[12px] font-semibold text-[#8E35B8]" aria-pressed={editing} onClick={() => setEditing((current) => !current)}>{editing ? 'Concluir' : 'Editar'}</button>
          </div>
          <div className="grid max-h-48 grid-cols-5 gap-1.5 overflow-y-auto">
            <button type="button" disabled={uploading} aria-label="Enviar figurinha" className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-[#D7B6E8] bg-[#FBF7FD] text-[#8E35B8] disabled:opacity-50" onClick={() => fileRef.current?.click()}>
              <Plus className="h-4 w-4" />
            </button>
            {savedStickers.map((item) => (
              <div key={item.id} className="relative h-14 w-14 rounded-xl bg-[#FBF7FD] p-1">
                <img src={item.url} alt="" className="h-full w-full rounded-lg object-contain" />
                {editing ? (
                  <>
                    <button type="button" aria-label="Colocar figurinha em primeiro" className="absolute left-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-white text-[#8E35B8] shadow" onClick={() => { void prioritizeSticker(item.url).catch(() => setUploadError('Não foi possível priorizar a figurinha.')); }}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Remover figurinha" className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-white text-[#9D174D] shadow" onClick={() => { void forgetSticker(item.url).catch(() => setUploadError('Não foi possível remover a figurinha.')); }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button type="button" className="absolute inset-0 z-10" aria-label="Minha figurinha" onClick={() => { void useSticker(item.url).catch(() => undefined); onSticker?.(item.url); setPanel(null); onPicked?.(); }} />
                )}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {active === 'gif' ? <GifPicker onPick={(url) => { onGif?.(url); setPanel(null); onPicked?.(); }} /> : null}
    </>
  );

  if (embedded) return <div className="min-w-0">{body}</div>;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Emojis" aria-expanded={panel === 'emoji'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('emoji')}><Smile className="h-4 w-4" /></button>
        {onSticker ? <button type="button" aria-label="Figurinhas" aria-expanded={panel === 'sticker'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('sticker')}><Sticker className="h-4 w-4" /></button> : null}
        {onGif ? <button type="button" aria-label="GIFs" aria-expanded={panel === 'gif'} className="grid h-9 w-9 place-items-center rounded-full text-[#6A228C] hover:bg-[#F8EAFB]" onClick={() => toggle('gif')}><ImagePlay className="h-4 w-4" /></button> : null}
      </div>
      {panel ? (
        <div className="mt-2 w-full max-w-sm rounded-2xl border border-[#EFE6F4] bg-white p-2 shadow-lg">
          {body}
        </div>
      ) : null}
    </div>
  );
};
