import { useState, type FC } from 'react';

export const PhotoGallery: FC<{ images: string[] }> = ({ images }) => {
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  if (images.length === 0) return null;
  const shown = images.length > 1 && !expanded ? images.slice(0, 1) : images.slice(0, 4);
  const extra = images.length - shown.length;
  const grid = shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-[12px] ${grid}`}>
        {shown.map((src, index) => (
          <button key={src} type="button" className="relative min-h-28 bg-[#F8F7FC]" onClick={() => setOpen(index)}>
            <img src={src} alt="" className={`w-full object-contain ${shown.length === 1 ? 'max-h-80' : 'h-40'}`} />
            {expanded && extra > 0 && index === shown.length - 1 ? <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white">+{extra}</span> : null}
          </button>
        ))}
      </div>
      {images.length > 1 ? (
        <button type="button" className="mt-1 text-[13px] font-semibold text-[#8E35B8] hover:underline" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ler menos' : 'Ler mais'}
        </button>
      ) : null}
      {open !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <img src={images[open]} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
        </div>
      ) : null}
    </>
  );
};
