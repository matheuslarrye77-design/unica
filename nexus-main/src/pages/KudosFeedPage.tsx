import { GlobalSearch } from '@/components/GlobalSearch';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Profile } from '@/components/Profile';
import { RecognitionComposer } from '@/components/social/RecognitionComposer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { teamRoster } from '@/data/team';
import { useInstitution } from '@/lib/institution';
import { actor } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown, Crown, Heart, Trophy } from 'lucide-react';
import { useState, type FC } from 'react';

type Area = 'Gestão' | 'Suporte';

type Recognition = {
  id: string;
  from: string;
  to: string;
  area: Area;
  quote: string;
  when: string;
  likes: number;
};

const PODIUM = [
  { place: 2 as const, name: 'Felipe Costa', role: 'Analista Financeiro', count: 35 },
  { place: 1 as const, name: 'Camila Souza', role: 'Analista de Atendimento', count: 42 },
  { place: 3 as const, name: 'Gabriela Lima', role: 'Analista de RH', count: 28 },
];

const RECENT: Recognition[] = [
  { id: 'r1', from: 'João Pereira', to: 'Camila Souza', area: 'Gestão', quote: 'Excelente organização e dedicação no projeto. Você fez toda a diferença!', when: '15 de out, 14:12', likes: 12 },
  { id: 'r2', from: 'Larissa Rocha', to: 'Lucas Pereira', area: 'Suporte', quote: 'Sempre disposto a ajudar e com uma ótima postura no dia a dia. Parabéns!', when: '14 de out, 10:21', likes: 7 },
  { id: 'r3', from: 'Thiago Martins', to: 'Mariana Alves', area: 'Gestão', quote: 'Muito comprometida e entrega resultados incríveis!', when: '13 de out, 16:45', likes: 9 },
  { id: 'r4', from: 'Juliana Fernandes', to: 'Rafael Oliveira', area: 'Suporte', quote: 'Sua iniciativa e proatividade fazem toda a diferença no time!', when: '12 de out, 09:18', likes: 6 },
];

function face(name: string) {
  return teamRoster.find((person) => person.name === name)?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function monthLabel() {
  const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' ');
}

export const KudosFeedPage: FC = () => {
  const { canRecognize } = useInstitution();
  const me = actor();
  const [composer, setComposer] = useState(false);
  const [filter, setFilter] = useState<'Todos' | Area>('Todos');
  const [extra, setExtra] = useState<Recognition[]>([]);
  const [menu, setMenu] = useState(false);
  const items = [...extra, ...RECENT].filter((item) => filter === 'Todos' || item.area === filter);

  return (
    <PageFrame fitViewport rail={<HomeRail />}>
      <div className="flex flex-col gap-2 xl:min-h-0 xl:flex-1">
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <NotificationDropdown />
          <ThemeToggle />
          <Profile />
        </div>
        <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <div className="grid gap-4 pb-4">
            <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#F8EAFB] via-[#F3DDF8] to-[#E7C4F2] px-5 py-4">
              <div className="pointer-events-none absolute -top-8 right-24 h-24 w-24 rounded-full bg-[#D9A6EE]/70" />
              <div className="pointer-events-none absolute right-6 -bottom-10 h-28 w-28 rounded-full bg-[#C084E0]/45" />
              <div className="relative flex flex-wrap items-center gap-4">
                <img src="/reconhecimento/trofeu.png" alt="" className="h-[92px] w-[92px] shrink-0 object-contain" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#241B33]">Reconhecimento</h1>
                  <p className="mt-0.5 text-[15px] font-semibold text-[#6A228C]">Valorize quem faz a diferença!</p>
                  <p className="mt-1 max-w-xl text-[13px] leading-snug text-[#8A5AA0]">Aqui você pode reconhecer seus colegas e acompanhar os maiores destaques do mês.</p>
                </div>
                {canRecognize ? (
                  <button type="button" onClick={() => setComposer(true)} className="shrink-0 rounded-full bg-[#8E35B8] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#7A2CA0]">
                    Postar reconhecimento
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3E4FA] text-[#8E35B8]"><Trophy className="h-4 w-4" /></span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#241B33]">Pódio do mês</h2>
                    <p className="text-[12.5px] text-[#8A7C98]">Os 3 colaboradores com mais reconhecimentos</p>
                  </div>
                </div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFF0] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5C5168]">
                  <Calendar className="h-3.5 w-3.5 text-[#8E35B8]" /> {monthLabel()}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 items-end gap-3">
                {PODIUM.map((person) => (
                  <div key={person.name} className="flex min-w-0 flex-col items-center text-center">
                    <div className="relative">
                      <img src={face(person.name)} alt="" className={cn('rounded-full bg-[#F3E4FA]', person.place === 1 ? 'h-[72px] w-[72px] ring-4 ring-[#F3DDF8]' : 'h-14 w-14')} />
                      {person.place === 1 ? <Crown className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-[#E2B100]" /> : null}
                    </div>
                    <p className="mt-2 truncate text-[14px] font-semibold text-[#241B33]">{person.name}</p>
                    <p className="truncate text-[12px] text-[#8A7C98]">{person.role}</p>
                    <div className={cn('mt-3 flex w-full flex-col items-center justify-start rounded-t-2xl px-2 pt-3', person.place === 1 ? 'h-28 bg-gradient-to-b from-[#E7C4F2] to-[#C9A0E4]' : person.place === 2 ? 'h-[72px] bg-[#F6F0FA]' : 'h-16 bg-[#F8F4FB]')}>
                      <span className={cn('grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold', person.place === 1 ? 'bg-white text-[#6A228C]' : 'bg-white text-[#8E35B8]')}>{person.place}</span>
                      <p className={cn('mt-1.5 text-[12px] font-medium', person.place === 1 ? 'text-[#5A2078]' : 'text-[#6A228C]')}>{person.count} reconhecimentos</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#241B33]">
                  <span className="text-[#8E35B8]">★</span> Últimos reconhecimentos
                </h2>
                <div className="relative">
                  <button type="button" onClick={() => setMenu((value) => !value)} className="inline-flex items-center gap-1 rounded-full border border-[#E7DFF0] px-3 py-1.5 text-[12.5px] font-medium text-[#5C5168]">
                    {filter} <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {menu ? (
                    <div className="absolute right-0 z-10 mt-1 w-32 rounded-xl border border-[#E7DFF0] bg-white p-1 shadow-lg">
                      {(['Todos', 'Gestão', 'Suporte'] as const).map((option) => (
                        <button key={option} type="button" onClick={() => { setFilter(option); setMenu(false); }} className={cn('block w-full rounded-lg px-3 py-1.5 text-left text-[13px]', filter === option ? 'bg-[#F3E4FA] text-[#6A228C]' : 'text-[#5C5168] hover:bg-[#FBF8FC]')}>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 divide-y divide-[#F3EAF6]">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    <img src={face(item.from)} alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#F3E4FA]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] text-[#2C2433]">
                          <span className="font-semibold">{item.from}</span> reconheceu o trabalho de <span className="font-semibold">{item.to}</span>
                        </p>
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', item.area === 'Gestão' ? 'bg-[#F3E4FA] text-[#6A228C]' : 'bg-[#F8E8F0] text-[#8A4A66]')}>{item.area}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-[#6A5C78]">“{item.quote}”</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11.5px] text-[#8A7C98]">{item.when}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#8A7C98]"><Heart className="h-3.5 w-3.5" /> {item.likes}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Dialog open={composer} onOpenChange={setComposer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postar reconhecimento</DialogTitle>
          </DialogHeader>
          <RecognitionComposer
            onCreated={(created) => {
              if (created) {
                setExtra((current) => [{
                  id: `novo-${Date.now()}`,
                  from: me.name,
                  to: created.name,
                  area: 'Gestão',
                  quote: created.message,
                  when: 'agora',
                  likes: 0,
                }, ...current]);
              }
              setComposer(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
};
