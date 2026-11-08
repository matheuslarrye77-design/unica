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
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-[20px] bg-[#6D28D9]">
      <img src="/reconhecimento/card-banner.jpg?v=2" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-y-0 right-0 flex w-[40%] items-center gap-3 pr-4 sm:gap-3.5 sm:pr-5">
        <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full bg-white object-cover ring-[3px] ring-white/90 shadow-[0_8px_20px_rgba(40,10,80,0.28)] sm:h-16 sm:w-16" />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold leading-5 text-white sm:text-[20px] sm:leading-6">{name}</p>
          <p className="mt-0.5 text-[12px] leading-4 text-white/95 sm:text-[13.5px] sm:leading-5">Reconhecimento pelo seu desempenho e dedicação!</p>
        </div>
      </div>
    </div>
  );
};
