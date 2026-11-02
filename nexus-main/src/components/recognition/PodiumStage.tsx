import { teamRoster } from '@/data/team';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Crown, Mail, MessageCircle, Phone, Trophy, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import type { GoalsPayload } from '@/components/recognition/GoalsCenter';

type Podium = NonNullable<GoalsPayload['podiums']>[number];
type Ranking = Podium['ranking'][number];
type Metric = NonNullable<Ranking['metrics']>[number];

const STEP = {
  1: { strong: '#7C3AED', wash: '#EDE9FE', line: '#C4B5FD', height: 'h-[108px]', avatar: 'h-[68px] w-[68px]' },
  2: { strong: '#DB2777', wash: '#FCE7F3', line: '#F9A8D4', height: 'h-[78px]', avatar: 'h-12 w-12' },
  3: { strong: '#818CF8', wash: '#EEF2FF', line: '#C7D2FE', height: 'h-[58px]', avatar: 'h-12 w-12' },
} as const;

const MODE_ORDER = ['overall', 'preset', 'custom'] as const;
const CATEGORIES: { id: 'Ligação' | 'Chat' | 'E-mail'; Icon: LucideIcon }[] = [
  { id: 'Ligação', Icon: Phone },
  { id: 'Chat', Icon: MessageCircle },
  { id: 'E-mail', Icon: Mail },
];

const TOOLTIP_LABEL: Record<string, string> = {
  resolvidosCount: 'Tickets resolvidos',
  resolvidos: 'Tickets resolvidos',
  transferidos: 'Tickets transferidos',
  primeira: 'Tempo de primeira resposta',
  resolucao: 'Tempo médio de resolução',
};

function face(name: string) {
  return teamRoster.find((person) => person.name === name)?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function monthTitle() {
  const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' ');
}

function percentText(value: number | null | undefined) {
  if (value == null) return '0%';
  return `${String(value).replace('.', ',')}%`;
}

function metricLabel(item: Metric) {
  return TOOLTIP_LABEL[item.id] || item.name;
}

function metricLine(item: Metric, mode: string) {
  const label = metricLabel(item);
  if (mode === 'overall') return `${label} - ${percentText(item.contribution)}`;
  return `${label} - ${item.shown || (item.value == null ? '—' : String(item.value))}`;
}

const PersonCard: FC<{ person: Ranking; mode: string }> = ({ person, mode }) => {
  const [open, setOpen] = useState(false);
  const place = (person.place === 2 || person.place === 3 ? person.place : 1) as 1 | 2 | 3;
  const tone = STEP[place];
  const role = teamRoster.find((item) => item.id === person.userId || item.name === person.name)?.role ?? '';
  const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
  const lines = person.detailsAvailable && person.metrics?.length ? person.metrics.map((item) => metricLine(item, mode)) : [];
  if (mode === 'overall' && person.score != null) lines.push(`Total: ${percentText(person.score)}`);
  return (
    <div className="relative z-10 flex min-w-0 flex-col items-center text-center">
      <div className="relative">
        {place === 1 ? <Crown className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 text-[#7C3AED]" /> : null}
        <img src={face(person.name)} alt="" className={cn('rounded-full bg-white object-cover', tone.avatar)} style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${tone.strong}` }} />
      </div>
      <p className="mt-2 max-w-full truncate text-[13px] font-semibold text-[#241B33]">{person.name}</p>
      <p className="max-w-full truncate text-[11px] text-[#8A7C98]">{role}</p>
      <div className={cn('relative mt-4 w-full max-w-[104px]', tone.height)}>
        <span className="absolute -top-3 left-1/2 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: tone.strong, boxShadow: `0 8px 16px ${tone.strong}55` }}>{place}</span>
        <div className="flex h-full flex-col overflow-visible rounded-[20px] border" style={{ borderColor: tone.line, boxShadow: `0 10px 22px ${tone.strong}22` }}>
          <div className="flex-1 rounded-t-[20px]" style={{ background: `linear-gradient(180deg, #ffffff 0%, ${tone.wash} 100%)` }} />
          <div className="relative">
            <button
              type="button"
              aria-label={`Detalhe da pontuação de ${person.name}`}
              className="flex h-9 w-full items-center justify-center rounded-b-[20px] px-1 text-[15px] font-semibold text-white"
              style={{ background: tone.strong }}
              onMouseEnter={() => { if (!touch) setOpen(true); }}
              onMouseLeave={() => { if (!touch) setOpen(false); }}
              onClick={() => { if (touch) setOpen((value) => !value); }}
            >
              {mode === 'preset' ? (person.displayScore || '—') : (person.displayScore || person.score || '—')}
            </button>
            {open ? (
              <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-50 w-[min(220px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[#EDE4F5] bg-white/95 px-3 py-2 text-left shadow-[0_12px_28px_rgba(80,40,120,0.14)] backdrop-blur-sm">
                {lines.length ? (
                  <ul className="grid gap-1 text-[11.5px] leading-4 text-[#4A1C73]">
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11.5px] leading-4 text-[#8A7C98]">Sem detalhe gravado.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PodiumStage: FC<{
  podiums: Podium[];
  periodKey: string;
  onPeriod: (key: string) => void;
}> = ({ podiums, periodKey, onPeriod }) => {
  const periods = useMemo(() => {
    const keys = [...new Set(podiums.map((item) => item.periodKey).filter(Boolean))];
    return keys.sort((left, right) => left.localeCompare(right)).map((key) => ({
      key,
      label: podiums.find((item) => item.periodKey === key)?.periodLabel || key,
    }));
  }, [podiums]);
  const periodIndex = periods.findIndex((item) => item.key === periodKey);
  const [channel, setChannel] = useState<(typeof CATEGORIES)[number]['id']>('Ligação');
  const forPeriod = podiums.filter((item) => item.periodKey === periodKey && item.channel === channel);
  const modes = MODE_ORDER.filter((mode) => forPeriod.some((item) => item.mode === mode));
  const [mode, setMode] = useState(modes[0] || 'preset');
  useEffect(() => {
    if (!modes.includes(mode as typeof MODE_ORDER[number])) setMode(modes[0] || 'preset');
  }, [periodKey, channel, modes.join('|')]);
  const active = forPeriod.find((item) => item.mode === mode) ?? forPeriod[0];
  const standing = active?.ranking ?? [];
  const subtitle = active
    ? (active.mode === 'custom' ? active.modeLabel : `${active.modeLabel} — ${active.periodLabel}`)
    : 'Ainda não há resultados confirmados no Banco de Dados';

  return (
    <section className="overflow-visible rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3E4FA] text-[#8E35B8]"><Trophy className="h-4 w-4" /></span>
          <div>
            <h2 className="text-[16px] font-semibold text-[#241B33]">Pódio do mês</h2>
            <p className="text-[12.5px] text-[#8A7C98]">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {periods.length > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-[#E7DFF0] bg-white px-1.5 py-1 text-[12.5px] font-medium text-[#5C5168]">
              <button type="button" aria-label="Período anterior" disabled={periodIndex <= 0} onClick={() => onPeriod(periods[periodIndex - 1].key)} className="grid h-6 w-6 place-items-center rounded-full disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="inline-flex items-center gap-1.5 px-1"><Calendar className="h-3.5 w-3.5 text-[#8E35B8]" /> {active?.periodLabel || monthTitle()}</span>
              <button type="button" aria-label="Período seguinte" disabled={periodIndex < 0 || periodIndex >= periods.length - 1} onClick={() => onPeriod(periods[periodIndex + 1].key)} className="grid h-6 w-6 place-items-center rounded-full disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFF0] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#5C5168]">
              <Calendar className="h-3.5 w-3.5 text-[#8E35B8]" /> {monthTitle()}
            </p>
          )}
          <div className="inline-flex items-center gap-1.5">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.id}
                aria-label={item.id}
                aria-pressed={channel === item.id}
                onClick={() => setChannel(item.id)}
                className={cn('grid h-9 w-9 place-items-center rounded-full transition', channel === item.id ? 'bg-[#8E35B8] text-white shadow-[0_8px_16px_rgba(142,53,184,0.28)]' : 'border border-[#E7DFF0] bg-white text-[#8E35B8] hover:bg-[#FBF8FC]')}
              >
                <item.Icon className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {modes.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {modes.map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={cn('rounded-full px-3 py-1 text-[12px] font-medium', mode === item ? 'bg-[#8E35B8] text-white' : 'border border-[#E7DFF0] text-[#6A228C]')}>
              {item === 'custom' ? 'Critério personalizado' : forPeriod.find((entry) => entry.mode === item)?.modeLabel ?? item}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mx-auto mt-5 max-w-xl overflow-visible">
        <div className="grid grid-cols-3 items-end gap-4 overflow-visible">
          {([standing.find((row) => row.place === 2), standing.find((row) => row.place === 1), standing.find((row) => row.place === 3)]).map((person, index) => (
            person ? <PersonCard key={`${person.place}-${person.userId}`} person={person} mode={active?.mode || 'preset'} /> : <div key={`vazio-${index}`} className="min-h-[120px]" />
          ))}
        </div>
        <div className="mx-6 mt-2 h-1.5 rounded-full bg-gradient-to-r from-[#F9A8D4] via-[#C4B5FD] to-[#A5B4FC]" />
      </div>
    </section>
  );
};
