import { RecognitionComposer } from '@/components/social/RecognitionComposer';
import { recognitionHeadline } from '@/lib/recognitionText';
import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { teamRoster } from '@/data/team';
import { authHeaders, getDemoId } from '@/lib/session';
import { usePageSearch } from '@/lib/pageSearch';
import { cn } from '@/lib/utils';
import { createFeedPost } from '@/lib/feed';
import { GoalsAssistant, GoalsCenter, GoalsProvider, type GoalsPayload } from '@/components/recognition/GoalsCenter';
import { PodiumStage } from '@/components/recognition/PodiumStage';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { ChevronDown, Heart, Megaphone, Star, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  received?: boolean;
  caption?: string;
  comment?: string;
  photos?: string[];
};


const EXTRA_KEY = 'unica-recognition-list';

function areaFromTag(tag: string): Area {
  return tag === 'Atendimento' ? 'Suporte' : 'Gestão';
}

function readExtra(): Recognition[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXTRA_KEY) ?? '[]') as Recognition[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.quote === 'string') as Recognition[];
  } catch {
    return [];
  }
}

const RECENT: Recognition[] = [
  { id: 'r1', from: 'João Pereira', to: 'Camila Souza', area: 'Gestão', quote: 'Excelente organização e dedicação no projeto. Você fez toda a diferença!', when: '15 de out, 14:12', likes: 12 },
  { id: 'r2', from: 'Larissa Rocha', to: 'Lucas Pereira', area: 'Suporte', quote: 'Sempre disposto a ajudar e com uma ótima postura no dia a dia. Parabéns!', when: '14 de out, 10:21', likes: 7 },
  { id: 'r3', from: 'Thiago Martins', to: 'Mariana Alves', area: 'Gestão', quote: 'Muito comprometida e entrega resultados incríveis!', when: '13 de out, 16:45', likes: 9 },
  { id: 'r4', from: 'Juliana Fernandes', to: 'Rafael Oliveira', area: 'Suporte', quote: 'Sua iniciativa e proatividade fazem toda a diferença no time!', when: '12 de out, 09:18', likes: 6 },
];

function face(name: string) {
  return teamRoster.find((person) => person.name === name)?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function goalsHeaders() {
  return { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) };
}

export const KudosFeedPage: FC = () => {
  const { query } = usePageSearch();
  const [params, setParams] = useSearchParams();
  const [composer, setComposer] = useState(false);
  const [filter, setFilter] = useState<'Todos' | Area>('Todos');
  const [extra, setExtra] = useState<Recognition[]>(readExtra);
  useEffect(() => { localStorage.setItem(EXTRA_KEY, JSON.stringify(extra)); }, [extra]);
  const [menu, setMenu] = useState(false);
  const [posted, setPosted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('unica-recognition-mural') ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem('unica-recognition-mural', JSON.stringify(posted)); }, [posted]);
  const [sending, setSending] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalsPayload | null>(null);
  const [week, setWeek] = useState('');
  const [podiumMonth, setPodiumMonth] = useState('');
  const stamp = useRef('');
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    async function pull() {
      try {
        const response = await fetch('/api/goals', { credentials: 'include', headers: goalsHeaders() });
        const data = await response.json().catch(() => null) as GoalsPayload | null;
        if (cancelled || !data || typeof data.canManage !== 'boolean') return;
        const version = String(data.updatedAt ?? '');
        if (version && version === stamp.current) return;
        stamp.current = version;
        setGoals(data);
      } catch {
        /* reconecta no próximo ciclo */
      }
    }
    void pull();
    const loop = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') void pull();
        loop();
      }, 2500);
    };
    loop();
    const refresh = () => { stamp.current = ''; void pull(); };
    window.addEventListener('unica-goals-saved', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('unica-goals-saved', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const activeKey = week || goals?.currentKey || '';
  const months = [...new Set((goals?.podiums ?? []).map((item) => item.periodKey))].sort((left, right) => left.localeCompare(right));
  const podiumKey = podiumMonth || goals?.currentPodiumKey || months[months.length - 1] || '';
  const needle = query.trim().toLowerCase();
  const items = [...extra, ...RECENT].filter((item) => {
    if (filter !== 'Todos' && item.area !== filter) return false;
    if (!needle) return true;
    return `${item.to} ${item.from} ${item.quote} ${item.area} ${item.caption ?? ''} ${item.comment ?? ''}`.toLowerCase().includes(needle);
  });
  const canManageGoals = Boolean(goals?.canManage);
  const tab = canManageGoals && params.get('painel') === 'metas' ? 'metas' : 'mural';

  function showTab(next: 'mural' | 'metas') {
    if (next === 'metas') setParams({ painel: 'metas' }, { replace: true });
    else setParams({}, { replace: true });
  }

  async function postOnMural(item: Recognition) {
    setSending(item.id);
    try {
      await createFeedPost({
        body: item.quote,
        kind: 'recognition',
        recognizedName: item.to,
        recognizedBy: item.from,
        receivedRecognition: Boolean(item.received),
        tag: item.area,
        caption: item.caption,
        comment: item.comment,
        images: item.photos,
        bannerTitle: recognitionHeadline(item.from, item.to, Boolean(item.received)),
        nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      setPosted((current) => ({ ...current, [item.id]: true }));
      toast.success('Reconhecimento publicado no mural.');
    } catch (error) {
      toast.error(error instanceof Error && (error.message === '403' || /permissão/i.test(error.message)) ? 'Você não tem permissão para publicar no mural.' : 'Não foi possível publicar no mural.');
    } finally {
      setSending(null);
    }
  }

  const page = (
    <PageFrame fitViewport fillRail={tab === 'metas'} rail={tab === 'metas' && goals ? <GoalsAssistant /> : <HomeRail />}>
      <div className="grid gap-4 pb-16">
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
              </div>
            </section>

            {canManageGoals ? (
              <div className="flex gap-5 border-b border-[#EDE6F3]">
                <button type="button" onClick={() => showTab('mural')} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-medium', tab === 'mural' ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}>
                  <Trophy className="h-3.5 w-3.5" /> Mural de reconhecimento
                </button>
                <button type="button" onClick={() => showTab('metas')} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-medium', tab === 'metas' ? 'border-[#8E35B8] text-[#6A228C]' : 'border-transparent text-[#8A7C98]')}>
                  <Target className="h-3.5 w-3.5" /> Central de Metas
                </button>
              </div>
            ) : null}

            {tab === 'metas' && goals ? <GoalsCenter /> : null}

            {tab === 'mural' ? (
            <>
            <PodiumStage podiums={goals?.podiums ?? []} periodKey={podiumKey} onPeriod={setPodiumMonth} />

            <div className="flex justify-center">
              <button type="button" onClick={() => setComposer(true)} className="inline-flex items-center gap-2 rounded-full bg-[#8E35B8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#7A2CA0]">
                <Star className="h-4 w-4 fill-current" />
                Postar reconhecimento
              </button>
            </div>

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
                            <p className="text-[15px] font-semibold leading-5 text-[#241B33]">{recognitionHeadline(item.from, item.to, Boolean(item.received))}</p>
                            <p className="mt-0.5 text-[12.5px] text-[#8A7C98]">
                              {item.received ? `${item.to} recebeu de ${item.from}` : `${item.from} reconheceu ${item.to}`} · {item.when}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-[#8A7C98]"><Heart className="h-3.5 w-3.5 text-[#8E35B8]" /> {item.likes}</span>
                        </div>
                        <span className={cn('mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', item.area === 'Gestão' ? 'bg-[#F3E4FA] text-[#6A228C]' : 'bg-[#F8E8F0] text-[#8A4A66]')}>{item.area}</span>
                        <p className="mt-2 text-[14.5px] leading-6 text-[#3C3148]">“{item.quote}”</p>
                        {item.caption ? <p className="mt-2 text-[13.5px] text-[#5C5168]">{item.caption}</p> : null}
                        {item.comment ? <p className="mt-1 text-[13px] text-[#8A7C98]">{item.comment}</p> : null}
                        {item.photos?.length ? (
                          <div className={`mt-3 grid gap-2 ${item.photos.length > 1 ? 'grid-cols-2' : ''}`}>
                            {item.photos.map((url) => <img key={url} src={url} alt="" className="max-h-48 w-full rounded-xl object-cover" />)}
                          </div>
                        ) : null}
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
            </>
            ) : null}
      </div>
      <Dialog open={composer} onOpenChange={setComposer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postar reconhecimento</DialogTitle>
          </DialogHeader>
          <RecognitionComposer
            publishToFeed={false}
            onCancel={() => setComposer(false)}
            onCreated={(created) => {
              if (created) {
                setExtra((current) => [{
                  id: `novo-${Date.now()}`,
                  from: created.fromName,
                  to: created.name,
                  area: areaFromTag(created.tag),
                  quote: created.message,
                  when: 'agora',
                  likes: 0,
                  received: created.received,
                  caption: created.caption || undefined,
                  comment: created.comment || undefined,
                  photos: created.photos,
                }, ...current]);
              }
              setComposer(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageFrame>
  );

  if (!goals) return page;
  return (
    <GoalsProvider goals={goals} week={activeKey} onWeek={setWeek} onChange={setGoals}>
      {page}
    </GoalsProvider>
  );
};
