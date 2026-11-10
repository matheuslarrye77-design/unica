import { MuralPublishDialog } from '@/components/social/MuralPublishDialog';
import { recognitionHeadline } from '@/lib/recognitionText';
import { HomeRail } from '@/components/shell/HomeRail';
import { PageFrame } from '@/components/shell/PageFrame';
import { teamRoster } from '@/data/team';
import { authHeaders, getDemoId } from '@/lib/session';
import { usePageSearch } from '@/lib/pageSearch';
import { cn } from '@/lib/utils';
import { GoalsAssistant, GoalsCenter, GoalsProvider, type GoalsPayload } from '@/components/recognition/GoalsCenter';
import { PodiumStage } from '@/components/recognition/PodiumStage';
import { useInstitution } from '@/lib/institution';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { PageHero } from '@/components/social/LilacWash';
import { ChevronDown, Heart, Megaphone, Star, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const { isLeader: gestao } = useInstitution();
  const { query } = usePageSearch();
  const [params, setParams] = useSearchParams();
  const [composer, setComposer] = useState(false);
  const [muralTarget, setMuralTarget] = useState<Recognition | null>(null);
  const [filter, setFilter] = useState<'Todos' | Area>('Todos');
  const [extra, setExtra] = useState<Recognition[]>(readExtra);
  useEffect(() => { localStorage.setItem(EXTRA_KEY, JSON.stringify(extra)); }, [extra]);
  const [menu, setMenu] = useState(false);
  const [posted, setPosted] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(sessionStorage.getItem('unica-recognition-mural') ?? '{}') as Record<string, boolean>; } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem('unica-recognition-mural', JSON.stringify(posted)); }, [posted]);
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

  const page = (
    <PageFrame fitViewport fillRail={tab === 'metas'} rail={tab === 'metas' && goals ? <GoalsAssistant /> : <HomeRail />}>
      <div className="grid gap-6 pb-16">
            {tab === 'metas' ? (
              <PageHero
                icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
                title="Central Inteligente de Metas"
                subtitle="Interprete metas e resultados nos dois modos."
              />
            ) : (
              <PageHero
                icon={<img src="/reconhecimento/trofeu.png" alt="" className="h-7 w-7 object-contain" />}
                title="Reconhecimento"
                subtitle="Valorize quem faz a diferença!"
                aside={gestao ? (
                  <button type="button" onClick={() => setComposer(true)} className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-[#7065C5] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#5D54B5]">
                    <Star className="h-4 w-4 fill-current" />
                    Postar reconhecimento
                  </button>
                ) : null}
              />
            )}

            {canManageGoals ? (
              <div className="flex gap-6 border-b border-[var(--ds-divider)]">
                <button type="button" onClick={() => showTab('mural')} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-medium', tab === 'mural' ? 'border-[var(--ds-purple)] text-[var(--ds-purple)]' : 'border-transparent text-[var(--ds-muted)]')}>
                  <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} /> Mural de reconhecimento
                </button>
                <button type="button" onClick={() => showTab('metas')} className={cn('inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-medium', tab === 'metas' ? 'border-[var(--ds-purple)] text-[var(--ds-purple)]' : 'border-transparent text-[var(--ds-muted)]')}>
                  <Target className="h-3.5 w-3.5" /> Central de Metas
                </button>
              </div>
            ) : null}

            {tab === 'metas' && goals ? <GoalsCenter /> : null}

            {tab === 'mural' ? (
            <>
            <PodiumStage podiums={goals?.podiums ?? []} periodKey={podiumKey} onPeriod={setPodiumMonth} />

            <section className="rounded-[var(--ds-radius-lg)] border border-[var(--ds-divider)] bg-white px-6 py-6 shadow-[var(--ds-shadow)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-[16px] font-semibold text-[#343440]">
                  <span className="text-[#7065C5]">★</span> Últimos reconhecimentos
                </h2>
                <div className="relative">
                  <button type="button" onClick={() => setMenu((value) => !value)} className="inline-flex items-center gap-1 rounded-[10px] border border-[#E9E9EF] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#858593]">
                    {filter} <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {menu ? (
                    <div className="absolute right-0 z-10 mt-1 w-32 rounded-[12px] border border-[#E9E9EF] bg-white p-1 shadow-[0_8px_24px_rgba(52,52,64,0.08)]">
                      {(['Todos', 'Gestão', 'Suporte'] as const).map((option) => (
                        <button key={option} type="button" onClick={() => { setFilter(option); setMenu(false); }} className={cn('block w-full rounded-[8px] px-3 py-1.5 text-left text-[13px]', filter === option ? 'bg-[#EFEDFC] text-[#7065C5]' : 'text-[#858593] hover:bg-[#F4F4F7]')}>
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 grid gap-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-[#DDD4F5] bg-gradient-to-r from-white to-[#FBF6FC] p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img src={face(item.to)} alt="" className="h-16 w-16 rounded-full bg-[#EDE7FE] ring-4 ring-[#EDE7FE]" />
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#7065C5] px-2 py-0.5 text-[10px] font-medium text-white">Reconhecido</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold leading-5 text-[#241B33]">{recognitionHeadline(item.from, item.to, Boolean(item.received))}</p>
                            <p className="mt-0.5 text-[12.5px] text-[#8A7C98]">
                              {item.received ? `${item.to} recebeu de ${item.from}` : `${item.from} reconheceu ${item.to}`} · {item.when}
                            </p>
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-[12.5px] text-[#8A7C98]"><Heart className="h-3.5 w-3.5 text-[#4600F3]" /> {item.likes}</span>
                            <button
                              type="button"
                              aria-label={posted[item.id] ? 'Publicado no mural' : 'Postar no mural'}
                              title={posted[item.id] ? 'Publicado no mural' : 'Postar no mural'}
                              disabled={posted[item.id]}
                              onClick={() => setMuralTarget(item)}
                              className="grid h-8 w-8 place-items-center rounded-full text-[#4600F3] hover:bg-[#EDE7FE] disabled:text-[#B09AF5]"
                            >
                              <Megaphone className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <span className={cn('mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', item.area === 'Gestão' ? 'bg-[#EDE7FE] text-[#3600C2]' : 'bg-[#EDE7FE] text-[#8A4A66]')}>{item.area}</span>
                        <p className="mt-2 text-[14.5px] leading-6 text-[#3C3148]">“{item.quote}”</p>
                        {item.caption ? <p className="mt-2 text-[13.5px] text-[#5C5168]">{item.caption}</p> : null}
                        {item.comment ? <p className="mt-1 text-[13px] text-[#8A7C98]">{item.comment}</p> : null}
                        {item.photos?.length ? (
                          <div className={`mt-3 grid gap-2 ${item.photos.length > 1 ? 'grid-cols-2' : ''}`}>
                            {item.photos.map((url) => <img key={url} src={url} alt="" className="max-h-48 w-full rounded-xl object-cover" />)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            </>
            ) : null}
      </div>
      <MuralPublishDialog
        open={composer}
        onOpenChange={setComposer}
        source="recognition-new"
        onCreated={(created, published) => {
          const id = `novo-${Date.now()}`;
          setExtra((current) => [{
            id,
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
          if (published) setPosted((current) => ({ ...current, [id]: true }));
          setComposer(false);
        }}
      />
      {muralTarget ? (
        <MuralPublishDialog
          open
          onOpenChange={(next) => { if (!next) setMuralTarget(null); }}
          source="recognition-existing"
          item={{
            id: muralTarget.id,
            from: muralTarget.from,
            to: muralTarget.to,
            quote: muralTarget.quote,
            received: muralTarget.received,
            tag: muralTarget.area,
            caption: muralTarget.caption,
            comment: muralTarget.comment,
            photos: muralTarget.photos,
          }}
          onPublished={() => {
            setPosted((current) => ({ ...current, [muralTarget.id]: true }));
            setMuralTarget(null);
          }}
        />
      ) : null}
    </PageFrame>
  );

  if (!goals) return page;
  return (
    <GoalsProvider goals={goals} week={activeKey} onWeek={setWeek} onChange={setGoals}>
      {page}
    </GoalsProvider>
  );
};
