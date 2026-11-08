import { teamRoster } from '@/data/team';
import { type FC } from 'react';

export function personAvatar(name: string) {
  const person = teamRoster.find((item) => item.name === name);
  return person?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

export const RecognitionArtCard: FC<{ name: string; avatar?: string }> = ({ name, avatar }) => {
  const photo = avatar || personAvatar(name);
  if (!name) return null;
  return (
    <div
      className="relative h-[158px] overflow-hidden rounded-[20px] sm:h-[176px]"
      style={{ backgroundColor: '#6D28D9', backgroundImage: 'url(/reconhecimento/card-banner.jpg)', backgroundPosition: '12% center', backgroundSize: 'cover' }}
    >
      <div className="relative z-10 flex h-full items-center justify-end gap-3 px-4 sm:gap-4 sm:px-6">
        <span className="hidden h-14 w-px shrink-0 bg-white/50 sm:block" />
        <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full bg-white object-cover ring-[3px] ring-white/90 shadow-[0_8px_20px_rgba(40,10,80,0.28)] sm:h-[72px] sm:w-[72px]" />
        <div className="min-w-0 max-w-[58%]">
          <p className="truncate text-[18px] font-bold leading-6 text-white sm:text-[22px]">{name}</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-white/95 sm:text-[13.5px]">Reconhecimento pelo seu desempenho e dedicação!</p>
        </div>
      </div>
    </div>
  );
};
