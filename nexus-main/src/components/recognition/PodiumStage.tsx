import { teamRoster } from '@/data/team';
import { cn } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Crown, Trophy } from 'lucide-react';
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

function face(name: string) {
  return teamRoster.find((person) => person.name === name)?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function monthTitle() {
  const label = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' ');
}

function metricLine(item: Metric, mode: string) {
  const value = item.shown || (item.value == null ? 'sem resultado' : String(item.value));
  if (mode === 'overall' && item.weight != null) {
    const got = item.contribution == null ? '—' : String(item.contribution).replace('.', ',');
    const max = String(item.weight).replace('.', ',');
    const extra = item.eligible === false && item.reason ? ` · ${item.reason}` : '';
    return `${item.name}: ${value} | Pontuação: ${got}/${max}${extra}`;
  }
  if (mode === 'custom' || mode === 'preset') {
    const status = item.met === true ? 'Cumpriu' : item.met === false ? 'Não cumpriu' : '';
    const condition = item.condition ? ` · ${item.condition}` : '';
    return `${item.name}: ${value}${status ? ` · ${status}` : ''}${condition}`;
  }
  return `${item.name}: ${value}`;
}

const PersonCard: FC<{ person: Ranking; mode: string }> = ({ person, mode }) => {
  const [open, setOpen] = useState(false);
  const place = (person.place === 2 || person.place === 3 ? person.place : 1) as 1 | 2 | 3;
  const tone = STEP[place];
  const role = teamRoster.find((item) => item.id === person.userId || item.name === person.name)?.role ?? '';
  const touch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
  return (
    <div className="relative z-10 flex min-w-0 flex-col items-center text-center" onMouseEnter={() => { if (!touch) setOpen(true); }} onMouseLeave={() => { if (!touch) setOpen(false); }}>
      <button type="button" className="flex w-full min-w-0 flex-col items-center" onClick={() => { if (touch) setOpen((value) => !value); }}>
        <div className="relative">
          {place === 1 ? <Crown className="absolute -top-4 left-1/2 h-5 w-5 -translate-x-1/2 text-[#7C3AED]" /> : null}
          <img src={face(person.name)} alt="" className={cn('rounded-full bg-white object-cover', tone.avatar)} style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${tone.strong}` }} />
        </div>
        <p className="mt-2 max-w-full truncate text-[13px] font-semibold text-[#241B33]">{person.name}</p>
        <p className="max-w-full truncate text-[11px] text-[#8A7C98]">{role}</p>
        <div className={cn('relative mt-4 w-full max-w-[104px]', tone.height)}>
          <span className="absolute -top-3 left-1/2 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: tone.strong, boxShadow: `0 8px 16px ${tone.strong}55` }}>{place}</span>
          <div className="flex h-full flex-col overflow-hidden rounded-[20px] border" style={{ borderColor: tone.line, boxShadow: `0 10px 22px ${tone.strong}22` }}>
            <div className="flex-1" style={{ background: `linear-gradient(180deg, #ffffff 0%, ${tone.wash} 100%)` }} />
            <div className="flex h-9 items-center justify-center px-1 text-[15px] font-semibold text-white" style={{ background: tone.strong }}>{person.displayScore || person.score || '—'}</div>
          </div>
        </div>
      </button>
      {open ? (
        <div className="absolute left-1/2 top-full z-40 mt-2 w-[min(260px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#E7DFF0] bg-white p-3 text-left shadow-[0_18px_40px_rgba(80,40,120,0.16)]">
          <p className="text-[12px] font-semibold text-[#4A1C73]">{place}º {person.name}</p>
          {person.detailsAvailable && person.metrics?.length ? (
            <ul className="mt-2 grid gap-1.5 text-[11.5px] leading-4 text-[#5C5168]">
              {person.metrics.map((item) => (
                <li key={item.id}>{metricLine(item, mode)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11.5px] leading-4 text-[#8A7C98]">O detalhamento desta avaliação não está disponível.</p>
          )}
          {mode === 'overall' && person.score != null ? (
            <p className="mt-2 text-[12px] font-semibold text-[#6A228C]">Resultado final: {String(person.score).replace('.', ',')}%</p>
          ) : null}
        </div>
      ) : null}
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
  const forPeriod = podiums.filter((item) => item.periodKey === periodKey);
  const modes = MODE_ORDER.filter((mode) => forPeriod.some((item) => item.mode === mode));
  const [mode, setMode] = useState(modes[0] || 'preset');
  useEffect(() => {
    if (!modes.includes(mode as typeof MODE_ORDER[number])) setMode(modes[0] || 'preset');
  }, [periodKey, modes.join('|')]);
  const active = forPeriod.find((item) => item.mode === mode) ?? forPeriod[0];
  const standing = active?.ranking ?? [];

  return (
    <>
      <section className="overflow-visible rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F3E4FA] text-[#8E35B8]"><Trophy className="h-4 w-4" /></span>
            <div>
              <h2 className="text-[16px] font-semibold text-[#241B33]">Pódio do mês</h2>
              <p className="text-[12.5px] text-[#8A7C98]">{active ? `${active.modeLabel} — ${active.periodLabel}` : 'Ainda não há resultados confirmados no Banco de Dados'}</p>
            </div>
          </div>
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
        </div>
        {modes.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {modes.map((item) => (
              <button key={item} type="button" onClick={() => setMode(item)} className={cn('rounded-full px-3 py-1 text-[12px] font-medium', mode === item ? 'bg-[#8E35B8] text-white' : 'border border-[#E7DFF0] text-[#6A228C]')}>
                {forPeriod.find((entry) => entry.mode === item)?.modeLabel ?? item}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mx-auto mt-5 max-w-xl">
          <div className="grid grid-cols-3 items-end gap-4">
            {([standing.find((row) => row.place === 2), standing.find((row) => row.place === 1), standing.find((row) => row.place === 3)]).map((person, index) => (
              person ? <PersonCard key={`${person.place}-${person.userId}`} person={person} mode={active?.mode || 'preset'} /> : <div key={`vazio-${index}`} className="min-h-[120px]" />
            ))}
          </div>
          <div className="mx-6 mt-2 h-1.5 rounded-full bg-gradient-to-r from-[#F9A8D4] via-[#C4B5FD] to-[#A5B4FC]" />
        </div>
      </section>
      <section className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
        <h2 className="text-[16px] font-semibold text-[#241B33]">Base da avaliação</h2>
        {active?.basis ? (
          <div className="mt-2 grid gap-1.5 text-[13px] leading-5 text-[#5C5168]">
            <p>Período: {active.basis.periodLabel || active.periodLabel}</p>
            <p>Modalidade: {active.basis.modeLabel || active.modeLabel}</p>
            <p>Origem: {active.basis.origin || 'Resultados confirmados no Banco de Dados (Supabase)'}</p>
            <p>{active.basis.summary}</p>
            {active.basis.indicators?.length ? (
              <ul className="mt-1 grid gap-1 text-[12.5px]">
                {active.basis.indicators.map((item) => (
                  <li key={item.id}>
                    {item.name}{item.condition ? ` — ${item.condition}` : ''}{item.weight != null ? ` · peso ${String(item.weight).replace('.', ',')}%` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-[#8A7C98]">O detalhamento desta avaliação não está disponível.</p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-[#8A7C98]">Ainda não há resultados confirmados no Banco de Dados para montar a base desta avaliação.</p>
        )}
      </section>
    </>
  );
};
