import { ImagePlay, Smile, Sticker } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
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
  const term = query.trim().toLowerCase();
  const categories = useMemo(() => ['Todas', ...new Set(STICKERS.map((item) => item.category))], []);
  const stickers = STICKERS.filter((item) => (stickerCategory === 'Todas' || item.category === stickerCategory) && (!term || `${item.title} ${item.tags}`.toLowerCase().includes(term)));

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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar figurinha" aria-label="Buscar figurinha" className="mb-2 h-9 w-full rounded-lg border border-[#EFE6F4] px-2 text-[13px]" />
              <div className="mb-2 flex gap-1 overflow-x-auto">
                {categories.map((item) => (
                  <button key={item} type="button" className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${stickerCategory === item ? 'bg-[#8E35B8] text-white' : 'bg-[#F8EAFB] text-[#6A228C]'}`} onClick={() => setStickerCategory(item)}>{item}</button>
                ))}
              </div>
              {stickers.length === 0 ? <p className="px-1 py-3 text-center text-[12px] text-[#8A7C98]">Nenhuma figurinha encontrada.</p> : null}
              <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
                {stickers.map((item) => (
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
