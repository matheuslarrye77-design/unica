import type { FC, ReactNode } from 'react';

const frame = 'relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-[32px] bg-[#F8EAFB] shadow-[0_18px_50px_rgba(80,40,120,0.12)]';

const SCENES: Record<string, { src: string; label: string }> = {
  bolo: { src: '/celebracoes/bolo.png', label: 'Bolo de aniversário' },
  natal: { src: '/celebracoes/natal.jpg', label: 'Árvore de Natal' },
  anonovo: { src: '/celebracoes/anonovo.jpg', label: 'Ano Novo' },
  carnaval: { src: '/celebracoes/carnaval.jpg', label: 'Carnaval' },
  halloween: { src: '/celebracoes/halloween.jpg', label: 'Halloween' },
  namorados: { src: '/celebracoes/namorados.jpg', label: 'Dia dos Namorados' },
  pascoa: { src: '/celebracoes/pascoa.jpg', label: 'Páscoa' },
  maes: { src: '/celebracoes/maes.jpg', label: 'Dia das Mães' },
  pais: { src: '/celebracoes/pais.jpg', label: 'Dia dos Pais' },
  trabalhador: { src: '/celebracoes/trabalhador.jpg', label: 'Dia do Trabalhador' },
  extra: { src: '/celebracoes/bolo.png', label: 'Celebração' },
};

export const CelebrationScene: FC<{ theme: string; children: ReactNode }> = ({ theme, children }) => {
  const scene = SCENES[theme] ?? SCENES.bolo;
  return (
    <div className={frame}>
      <img src={scene.src} alt={scene.label} className="absolute inset-0 h-full w-full object-cover" />
      {children}
    </div>
  );
};
