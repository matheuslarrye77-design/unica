import { ImagePlus, Loader2, X } from 'lucide-react';
import { type ChangeEvent, type FC, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadMedia } from '@/lib/feed';

export const AttachPhotos: FC<{ urls: string[]; onChange: (urls: string[]) => void; max?: number }> = ({ urls, onChange, max = 8 }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].filter((file) => file.type.startsWith('image/'));
    event.target.value = '';
    if (!files.length) return;
    if (urls.length + files.length > max) {
      toast.error(`É possível enviar até ${max} fotos.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const result = await uploadMedia(file);
        uploaded.push(result.url);
      }
      onChange([...urls, ...uploaded]);
    } catch {
      toast.error('Não foi possível enviar a foto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(event) => void add(event)} />
      {urls.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url) => (
            <li key={url} className="relative overflow-hidden rounded-xl bg-[#F8EAFB]">
              <img src={url} alt="" className="h-24 w-full object-cover" />
              <button type="button" aria-label="Remover foto" onClick={() => onChange(urls.filter((item) => item !== url))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#6A228C]">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" disabled={busy || urls.length >= max} onClick={() => input.current?.click()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E4C8EE] bg-[#FBF8FC] text-[13px] font-medium text-[#6A228C] hover:bg-[#F3E4FA] disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? 'Enviando...' : 'Adicionar fotos'}
      </button>
    </div>
  );
};
