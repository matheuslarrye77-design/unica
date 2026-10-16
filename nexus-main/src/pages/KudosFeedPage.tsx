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
import { createFeedPost } from '@/lib/feed';
import { Calendar, ChevronDown, Crown, Heart, Megaphone, Trophy } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { toast } from 'sonner';

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

const STEP = {
  1: { strong: '#7C3AED', wash: '#EDE9FE', line: '#C4B5FD', height: 'h-[108px]', avatar: 'h-[68px] w-[68px]' },
  2: { strong: '#DB2777', wash: '#FCE7F3', line: '#F9A8D4', height: 'h-[78px]', avatar: 'h-12 w-12' },
  3: { strong: '#818CF8', wash: '#EEF2FF', line: '#C7D2FE', height: 'h-[58px]', avatar: 'h-12 w-12' },
} as const;

export const KudosFeedPage: FC = () => {
  const { canRecognize } = useInstitution();
  const me = actor();
  const [composer, setComposer] = useState(false);
  const [filter, setFilter] = useState<'Todos' | Area>('Todos');
  const [extra, setExtra] = useState<Recognition[]>([]);
  const [menu, setMenu] = useState(false);
  const [posted, setPosted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('unica-recognition-mural') ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem('unica-recognition-mural', JSON.stringify(posted)); }, [posted]);
  const [sending, setSending] = useState<string | null>(null);
  const items = [...extra, ...RECENT].filter((item) => filter === 'Todos' || item.area === filter);

  async function postOnMural(item: Recognition) {
    setSending(item.id);
    try {
      await createFeedPost({ body: item.quote, kind: 'recognition', recognizedName: item.to, tag: item.area });
      setPosted((current) => ({ ...current, [item.id]: true }));
      toast.success('Reconhecimento publicado no mural.');
    } catch (error) {
      toast.error(error instanceof Error && error.message === '403' ? 'Você não tem permissão para publicar no mural.' : 'Não foi possível publicar no mural.');
    } finally {
      setSending(null);
    }
  }

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
              <div className="mx-auto mt-5 max-w-xl">
                <div className="grid grid-cols-3 items-end gap-4">
                  {PODIUM.map((person) => {
                    const tone = STEP[person.place];
                    return (
                      <div key={person.name} className="flex min-w-0 flex-col items-center text-center">
                        <div className="relative">
                          {person.place === 1 ? <Crown className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 text-[#7C3AED]" /> : null}
                          <img
                            src={face(person.name)}
                            alt=""
                            className={cn('rounded-full bg-white object-cover', tone.avatar)}
                            style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${tone.strong}` }}
                          />
                        </div>
                        <p className="mt-2 max-w-full truncate text-[13px] font-semibold text-[#241B33]">{person.name}</p>
                        <p className="max-w-full truncate text-[11px] text-[#8A7C98]">{person.role}</p>
                        <div className={cn('relative mt-4 w-full max-w-[104px]', tone.height)}>
                          <span
                            className="absolute -top-3 left-1/2 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-[13px] font-semibold text-white"
                            style={{ background: tone.strong, boxShadow: `0 8px 16px ${tone.strong}55` }}
                          >
                            {person.place}
                          </span>
                          <div className="flex h-full flex-col overflow-hidden rounded-[20px] border" style={{ borderColor: tone.line, boxShadow: `0 10px 22px ${tone.strong}22` }}>
                            <div className="flex-1" style={{ background: `linear-gradient(180deg, #ffffff 0%, ${tone.wash} 100%)` }} />
                            <div className="flex h-9 items-center justify-center text-[16px] font-semibold text-white" style={{ background: tone.strong }}>{person.count}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mx-6 mt-2 h-1.5 rounded-full bg-gradient-to-r from-[#F9A8D4] via-[#C4B5FD] to-[#A5B4FC]" />
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
              <ul className="mt-3 grid gap-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-[#E7DFF0] bg-gradient-to-r from-white to-[#FBF6FC] p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img src={face(item.to)} alt="" className="h-16 w-16 rounded-full bg-[#F3E4FA] ring-4 ring-[#F3E4FA]" />
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#8E35B8] px-2 py-0.5 text-[10px] font-semibold text-white">Reconhecido</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[16px] font-semibold text-[#241B33]">{item.to}</p>
                            <p className="mt-0.5 text-[12.5px] text-[#8A7C98]">
                              <span className="font-medium text-[#5C5168]">{item.from}</span> reconheceu · {item.when}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-[#8A7C98]"><Heart className="h-3.5 w-3.5 text-[#8E35B8]" /> {item.likes}</span>
                        </div>
                        <span className={cn('mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', item.area === 'Gestão' ? 'bg-[#F3E4FA] text-[#6A228C]' : 'bg-[#F8E8F0] text-[#8A4A66]')}>{item.area}</span>
                        <p className="mt-2 text-[14.5px] leading-6 text-[#3C3148]">“{item.quote}”</p>
                        <button
                          type="button"
                          disabled={posted[item.id] || sending === item.id}
                          onClick={() => void postOnMural(item)}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#8E35B8] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#7A2CA0] disabled:bg-[#C9A6DC]"
                        >
                          <Megaphone className="h-3.5 w-3.5" />
                          {posted[item.id] ? 'Publicado no mural' : 'Postar no mural'}
                        </button>
                      </div>
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
