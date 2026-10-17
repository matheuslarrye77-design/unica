import { useState, type FC } from 'react';

export const PhotoGallery: FC<{ images: string[] }> = ({ images }) => {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  const grid = shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-[12px] ${grid}`}>
        {shown.map((src, index) => (
          <button key={src} type="button" className="relative min-h-28" onClick={() => setOpen(index)}>
            <img src={src} alt="" className={`w-full object-cover ${shown.length === 1 ? 'max-h-80' : 'h-40'}`} />
            {extra > 0 && index === shown.length - 1 ? <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white">+{extra}</span> : null}
          </button>
        ))}
      </div>
      {open !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <img src={images[open]} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
        </div>
      ) : null}
    </>
  );
};
