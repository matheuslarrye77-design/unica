import { useEffect, useRef, useState, type FC } from 'react';
import { searchGifs, type GifHit } from '@/lib/gifs';
import { listLibrary, saveGif, type SavedGif } from '@/lib/stickers';

function messageFor(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'config') return 'A galeria de GIFs não está disponível.';
  if (code === 'rate') return 'Muitas buscas agora. Tente de novo em instantes.';
  if (code === 'query') return 'Use apenas letras e números na busca.';
  return 'Não foi possível buscar GIFs.';
}

export const GiphyMark: FC = () => (
  <a href="https://giphy.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#8A7C98] hover:text-[#6A228C]">
    <img src="https://giphy.com/static/img/poweredby_giphy.png" alt="" className="h-4 w-auto" />
    Powered by GIPHY
  </a>
);

export const GifPicker: FC<{ onPick: (url: string) => void }> = ({ onPick }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifHit[]>([]);
  const [saved, setSaved] = useState<SavedGif[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const requestId = useRef(0);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let current = true;
    listLibrary().then((library) => { if (current) setSaved(library.gifs); }).catch(() => undefined);
    return () => { current = false; };
  }, []);

  useEffect(() => {
    const ticket = ++requestId.current;
    const handle = window.setTimeout(() => {
      setStatus('loading');
      void searchGifs(query).then((items) => {
        if (ticket !== requestId.current) return;
        setGifs(items);
        setStatus(items.length ? 'ready' : 'empty');
      }).catch((error: unknown) => {
        if (ticket !== requestId.current) return;
        setGifs([]);
        setStatus('error');
        setMessage(messageFor(error));
      });
    }, query.trim() ? 350 : 0);
    return () => window.clearTimeout(handle);
  }, [query]);

  function choose(item: { url: string; title?: string }) {
    if (picking) return;
    setPicking(true);
    void saveGif(item.url, item.title || 'GIF').then((gif) => {
      setSaved((current) => [gif, ...current.filter((entry) => entry.url !== gif.url)]);
    }).catch(() => undefined);
    onPick(item.url);
  }

  return (
    <>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar GIF: risada, meme, comemoração" aria-label="Buscar GIF" className="mb-2 h-9 w-full rounded-lg border border-[#EFE6F4] px-2 text-[13px]" />
      {saved.length > 0 ? (
        <div className="mb-2">
          <p className="mb-1 px-1 text-[12px] font-medium text-[#6A228C]">Salvos</p>
          <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {saved.map((item) => (
              <button key={item.id} type="button" className="overflow-hidden rounded-xl bg-[#FBF7FD] disabled:opacity-60" disabled={picking} onClick={() => choose(item)} aria-label={item.title}>
                <img src={item.url} alt={item.title} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {status === 'loading' ? <p className="px-1 py-3 text-center text-[12px] text-[#8A7C98]">Buscando GIFs...</p> : null}
      {status === 'empty' ? <p className="px-1 py-3 text-center text-[12px] text-[#8A7C98]">Nenhum GIF encontrado.</p> : null}
      {status === 'error' ? <p className="px-1 py-3 text-center text-[12px] text-[#8A7C98]">{message}</p> : null}
      {status === 'ready' ? (
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {gifs.map((item) => (
            <button key={item.id} type="button" className="overflow-hidden rounded-xl bg-[#FBF7FD] disabled:opacity-60" disabled={picking} onClick={() => choose(item)} aria-label={item.title}>
              <img src={item.preview} alt={item.title} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-2 px-1"><GiphyMark /></div>
    </>
  );
};
