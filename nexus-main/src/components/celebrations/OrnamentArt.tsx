import type { FC } from 'react';

export const ORNAMENTS: { id: string; label: string; themes: string[] }[] = [
  { id: 'bombom', label: 'Bombom', themes: ['bolo'] },
  { id: 'vela', label: 'Vela', themes: ['bolo'] },
  { id: 'flor', label: 'Flor', themes: ['bolo', 'namorados', 'pascoa', 'maes', 'pais', 'extra'] },
  { id: 'coracao', label: 'Coração', themes: ['bolo', 'namorados', 'maes', 'pais', 'extra'] },
  { id: 'estrela', label: 'Estrela', themes: ['bolo', 'natal', 'anonovo', 'halloween', 'trabalhador', 'extra'] },
  { id: 'bolinha', label: 'Bola', themes: ['bolo', 'natal', 'extra'] },
  { id: 'presente', label: 'Presente', themes: ['bolo', 'natal', 'maes', 'pais', 'trabalhador', 'extra'] },
  { id: 'bandeira', label: 'Bandeirinha', themes: ['bolo', 'carnaval', 'extra'] },
  { id: 'plaquinha', label: 'Plaquinha', themes: ['bolo', 'namorados', 'trabalhador', 'extra'] },
  { id: 'bexiga', label: 'Balão', themes: ['bolo', 'natal', 'carnaval', 'extra'] },
  { id: 'mascara', label: 'Máscara', themes: ['carnaval', 'extra'] },
  { id: 'abobora', label: 'Abóbora', themes: ['halloween', 'extra'] },
  { id: 'ovo', label: 'Ovo', themes: ['pascoa', 'extra'] },
  { id: 'fogos', label: 'Fogos', themes: ['anonovo', 'extra'] },
];

export const OrnamentArt: FC<{ kind: string }> = ({ kind }) => {
  if (kind === 'bombom') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M8 32c8-10 12-10 16 0 4 10 8 10 16 0" fill="none" stroke="#7C3A1D" strokeWidth="3" />
        <ellipse cx="32" cy="34" rx="14" ry="10" fill="#6B3416" />
        <ellipse cx="32" cy="32" rx="12" ry="8" fill="#A15C38" />
        <path d="M24 30c4 2 12 2 16 0" fill="none" stroke="#F3D2B5" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'vela') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M32 10c4 6 4 10 0 14-4-4-4-8 0-14z" fill="#F59E0B" />
        <rect x="27" y="24" width="10" height="28" rx="3" fill="#F8EAFB" stroke="#8E35B8" />
        <rect x="24" y="50" width="16" height="4" rx="2" fill="#6A228C" />
      </svg>
    );
  }
  if (kind === 'flor') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse key={angle} cx="32" cy="18" rx="7" ry="12" fill="#F9A8D4" transform={`rotate(${angle} 32 32)`} />
        ))}
        <circle cx="32" cy="32" r="6" fill="#F59E0B" />
      </svg>
    );
  }
  if (kind === 'coracao') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M32 52C18 42 10 34 10 24a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 10-8 18-14 28z" fill="#E11D48" />
      </svg>
    );
  }
  if (kind === 'bolinha') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M32 8v8" stroke="#B45309" strokeWidth="2" />
        <circle cx="32" cy="36" r="16" fill="#8E35B8" />
        <path d="M22 30c6 4 14 4 20-2" fill="none" stroke="#F8EAFB" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'presente') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect x="12" y="26" width="40" height="26" rx="4" fill="#7C3AED" />
        <rect x="28" y="26" width="8" height="26" fill="#F9A8D4" />
        <path d="M32 26c-8-12-18-4-10 2h10c8-6-2-14-10-2" fill="#F9A8D4" />
      </svg>
    );
  }
  if (kind === 'bandeira') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M8 40h48" stroke="#6A228C" strokeWidth="2" />
        <path d="M14 40l8-16 8 16 8-16 8 16" fill="#F59E0B" stroke="#8E35B8" />
      </svg>
    );
  }
  if (kind === 'plaquinha') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <rect x="10" y="18" width="44" height="28" rx="6" fill="#F8EAFB" stroke="#8E35B8" />
        <path d="M18 30h28M18 38h18" stroke="#6A228C" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === 'mascara') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M8 32c8-14 40-14 48 0-8 10-40 10-48 0z" fill="#F59E0B" />
        <circle cx="22" cy="32" r="6" fill="#241B33" />
        <circle cx="42" cy="32" r="6" fill="#241B33" />
      </svg>
    );
  }
  if (kind === 'abobora') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M32 14c2 4 2 6 0 8" stroke="#166534" strokeWidth="3" />
        <ellipse cx="32" cy="38" rx="16" ry="14" fill="#F97316" />
        <path d="M26 36h4M36 36h4M28 44c4 3 8 3 10 0" stroke="#7C2D12" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (kind === 'ovo') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <ellipse cx="32" cy="34" rx="14" ry="18" fill="#FDE68A" stroke="#8E35B8" />
        <path d="M22 34h20" stroke="#E11D48" strokeWidth="3" />
      </svg>
    );
  }
  if (kind === 'fogos') {
    return (
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <circle cx="32" cy="32" r="4" fill="#F59E0B" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line key={angle} x1="32" y1="32" x2="32" y2="12" stroke="#8E35B8" strokeWidth="2" transform={`rotate(${angle} 32 32)`} />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full">
      <ellipse cx="32" cy="40" rx="12" ry="14" fill="#E11D48" />
      <path d="M32 18c6 8 6 12 0 16" stroke="#F8EAFB" strokeWidth="2" fill="none" />
    </svg>
  );
};
