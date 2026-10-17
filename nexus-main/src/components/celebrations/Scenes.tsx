import type { FC, ReactNode } from 'react';

const frame = 'relative mx-auto aspect-[4/5] w-full max-w-[440px] overflow-hidden rounded-[32px] shadow-[0_18px_50px_rgba(80,40,120,0.12)]';

export const CelebrationScene: FC<{ theme: string; children: ReactNode }> = ({ theme, children }) => {
  if (theme === 'natal') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#1E1B4B] to-[#312E81]`}>
        <div className="absolute bottom-0 left-1/2 h-[78%] w-[70%] -translate-x-1/2 bg-[#166534]" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />
        <div className="absolute bottom-0 left-1/2 h-10 w-8 -translate-x-1/2 bg-[#7C4A2D]" />
        {children}
      </div>
    );
  }
  if (theme === 'anonovo') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#1E1B4B] via-[#4C1D95] to-[#F8EAFB]`}>
        <div className="absolute bottom-0 h-24 w-full bg-[#241B33]" />
        {children}
      </div>
    );
  }
  if (theme === 'carnaval') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#FDE68A] via-[#F9A8D4] to-[#67E8F9]`}>
        <div className="absolute bottom-0 h-20 w-full bg-[#F59E0B]/40" />
        {children}
      </div>
    );
  }
  if (theme === 'halloween') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#1F2937] to-[#7C2D12]`}>
        <div className="absolute bottom-0 h-16 w-full bg-[#3F3F46]" />
        {children}
      </div>
    );
  }
  if (theme === 'pascoa') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#FEF3C7] to-[#D9F99D]`}>
        <div className="absolute bottom-0 h-24 w-full rounded-t-[50%] bg-[#84CC16]/50" />
        {children}
      </div>
    );
  }
  if (theme === 'namorados' || theme === 'maes' || theme === 'pais') {
    return (
      <div className={`${frame} bg-gradient-to-b from-[#FCE7F3] to-[#F8EAFB]`}>
        <div className="absolute bottom-8 left-1/2 h-40 w-56 -translate-x-1/2 rounded-2xl border border-[#F9A8D4] bg-white/80" />
        {children}
      </div>
    );
  }
  return (
    <div className={`${frame} bg-gradient-to-b from-[#F8EAFB] via-[#F3E4FA] to-[#E9D5FF]`}>
      <div className="absolute bottom-[18%] left-1/2 h-[18%] w-[46%] -translate-x-1/2 rounded-[40%] bg-[#FDE68A] shadow-[inset_0_-12px_0_#F9A8D4,inset_0_10px_0_#FFF7ED]" />
      <div className="absolute bottom-[34%] left-1/2 h-[16%] w-[38%] -translate-x-1/2 rounded-[40%] bg-[#FBCFE8] shadow-[inset_0_-10px_0_#F9A8D4,inset_0_8px_0_#FFF1F2]" />
      <div className="absolute bottom-[48%] left-1/2 h-[14%] w-[30%] -translate-x-1/2 rounded-[40%] bg-[#E9D5FF] shadow-[inset_0_-8px_0_#C4B5FD,inset_0_8px_0_#FAF5FF]" />
      <div className="absolute bottom-[16%] left-1/2 h-3 w-[50%] -translate-x-1/2 rounded-full bg-[#E7C2A0]" />
      {children}
    </div>
  );
};
