import { useEffect, useState, type FC } from 'react';

export const ZoomImage: FC<{ src: string; alt?: string; className?: string }> = ({ src, alt = '', className }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button type="button" className="block max-w-full text-left" aria-label={`Ampliar ${alt || 'imagem'}`} onClick={() => setOpen(true)}>
        <img src={src} alt={alt} className={className} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-6" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[92vw] object-contain" />
        </div>
      ) : null}
    </>
  );
};

export const PhotoGallery: FC<{ images: string[] }> = ({ images }) => {
  const [open, setOpen] = useState<number | null>(null);
  if (images.length === 0) return null;
  const grid = images.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-[12px] ${grid}`}>
        {images.map((src, index) => (
          <button key={`${src}-${index}`} type="button" className="relative min-h-28 bg-[#F6F4FC]" onClick={() => setOpen(index)}>
            <img src={src} alt="" className={`w-full object-contain ${images.length === 1 ? 'max-h-80' : 'h-40'}`} />
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
