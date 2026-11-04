import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';
import { cn } from '@/lib/utils';
import { BarChart3, Bot, Check, ChevronDown, FileText, Info, Maximize2, Minimize2, Paperclip, Pencil, Send, Settings2, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FC, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

type Rule = { indicator: string; op: string; value: number; valueTo?: number | null; period?: string };
type PendingRules = {
  period: string;
  periodKey?: string;
  periodLabel?: string;
  rules: Rule[];
  name: string;
  explanation: string;
  combine: 'all' | 'any';
  subsetor: string;
  weights: { resolvidos: number; primeira: number; resolucao: number } | null;
  rows?: Row[];
  sourceText?: string;
  comparisons?: { userId: string; name: string; sourceName: string; values: Values; indicators: { indicator: string; value: number | null; target: number; op: string; met: boolean | null }[] }[];
};
type Values = { resolvidos: number | null; resolvidosCount: number | null; transferidos: number | null; primeira: number | null; resolucao: number | null; satisfacao?: number | null };
type Row = {
  sourceName: string;
  userId: string;
  name: string;
  subsetor: string;
  ambiguous: { id: string; name: string; subsetor: string }[];
  values: Values;
  goal: { resolvidos?: { target: number | null; direction?: string }; primeira?: { target: number | null; direction?: string }; resolucao?: { target: number | null; direction?: string }; transferidos?: { target: number | null }; transferidosMode?: string };
  states?: Record<string, string>;
  overall?: number | null;
};
export type GoalImport = {
  id: string;
  periodKey: string;
  label: string;
  rows: Row[];
  ranking: { userId: string; name: string; place: number; overall?: number | null; values: Values; subsetor: string }[];
  display?: { mode: string; indicator?: string; templateId?: string };
  goals: { subsetor: string; goal: Row['goal'] }[];
  approvedBy: string;
  approvedAt: string;
};
type LedgerValues = { resolvidos: number | null; resolvidosCount: number | null; transferidos: number | null; primeira: number | null; resolucao: number | null; satisfacao?: number | null };
type LedgerRecord = {
  id: string;
  userId: string;
  sourceName: string;
  name: string;
  periodKey: string;
  periodLabel: string;
  values: LedgerValues;
  changes: Record<string, string>;
  updatedAt: string;
  pending: boolean;
  note: string;
  candidates: { id: string; name: string }[];
  history: { at: string; values: LedgerValues }[];
};
type Person = { id: string; name: string; funcao: string; role: string; aliases: string[] };
type Template = { id: string; name: string; description: string; period: string; periodKey?: string; periodLabel?: string; rules: Rule[] };
type BankIndicator = { field: string; name: string; value: number; met: boolean | null; target?: number | null; op?: string };
type BankPeriod = {
  key: string;
  label: string;
  goals: { indicator: string; name: string; value: number; op: string; periodLabel: string }[];
  people: { userId: string; name: string; periodKey: string; periodLabel: string; pending: boolean; history: { at: string; values: LedgerValues }[]; indicators: BankIndicator[] }[];
  pending: { id: string; sourceName: string; periodLabel: string; pending: boolean; indicators: BankIndicator[] }[];
  overall?: { selected?: string[]; weights?: Record<string, number>; scores?: { userId: string; name: string; score: number; place: number }[] } | null;
};
type ConferenceResult = { indicator: string; name: string; value: number; unit: string; target: number | null; op: string; met: boolean | null; status: string };
type ConferencePerson = { userId: string; name: string; sourceName: string; subsetor: string; identified: boolean; values?: Values; results: ConferenceResult[] };
type ConferenceGoal = { indicator: string; name: string; op: string; value: number; valueTo?: number | null; unit: string; period?: string };
type GoalsConference = {
  id: string;
  sourceText: string;
  mode?: string;
  period: { kind: string; key: string; label: string };
  goals: ConferenceGoal[];
  people: ConferencePerson[];
  overall?: {
    weights?: { resolvidos?: number; transferidos?: number; satisfacao?: number; primeira?: number; resolucao?: number; floor: number };
    selected?: string[];
    excluded?: string[];
    excludes?: string[];
    scores?: { userId: string; name: string; score: number; place: number; parts?: Record<string, { contribution: number; weight: number; name: string; value?: number | null; best?: number | null; eligible?: boolean; reason?: string; score?: number }> }[];
  } | null;
  fingerprint?: string;
};
type Criterion = { mode: 'preset' | 'custom' | 'overall'; indicator?: string; templateId?: string };
export type GoalsPayload = {
  canManage: boolean;
  currentKey: string;
  criterion?: Criterion;
  weights: { resolvidos: number; primeira: number; resolucao: number; floor: number; satisfacao?: number };
  tieBreak: string[];
  people: Person[];
  templates: Template[];
  imports: GoalImport[];
  ledger?: {
    records: LedgerRecord[];
    ranking: { place: number; userId: string; name: string; values: LedgerValues; count?: number | string }[];
    applied?: { place: number; userId: string; name: string; values: LedgerValues; count?: number | string }[];
  };
  bank?: { periods: BankPeriod[] };
  podiums?: {
    periodKey: string;
    periodLabel: string;
    mode?: 'preset' | 'overall' | 'custom';
    modeLabel?: string;
    channel?: 'Ligação' | 'Chat' | 'E-mail' | '';
    selected?: string[];
    weights?: Record<string, number>;
    detailsAvailable?: boolean;
    ranking: {
      place: number;
      userId: string;
      name: string;
      score: number | null;
      displayScore?: string;
      detailsAvailable?: boolean;
      metrics?: {
        id: string;
        name: string;
        value: number | null;
        unit?: string;
        shown?: string;
        weight?: number;
        contribution?: number;
        eligible?: boolean;
        met?: boolean | null;
        reason?: string;
        condition?: string;
        target?: number | null;
      }[];
    }[];
    basis?: {
      origin?: string;
      periodLabel?: string;
      modeLabel?: string;
      summary?: string;
      indicators?: { id: string; name: string; condition?: string; weight?: number | null }[];
    };
    computedAt?: string;
  }[];
  currentPodiumKey?: string;
  updatedAt?: string;
};

const LEDGER_FIELDS = [
  ['resolvidosCount', 'Tickets resolvidos'],
  ['resolvidos', 'Tickets resolvidos (%)'],
  ['transferidos', 'Tickets transferidos'],
  ['primeira', 'Primeira resposta'],
  ['resolucao', 'Tempo médio de resolução'],
  ['satisfacao', 'Satisfação'],
] as const;

function ledgerText(field: string, value: number | null) {
  if (value === null || value === undefined) return '';
  if (field === 'resolvidos' || field === 'satisfacao') return `${value}%`;
  if (field === 'primeira' || field === 'resolucao') return `${value} min`;
  return String(value);
}

function clock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const METRICS = [
  ['resolvidos', 'Tickets resolvidos'],
  ['transferidos', 'Tickets transferidos'],
  ['primeira', 'Tempo de primeira resposta'],
  ['resolucao', 'Tempo médio de resolução'],
] as const;

const OVERALL_OPTIONS = [
  { id: 'resolvidosCount', weightKey: 'resolvidos', label: 'Tickets resolvidos' },
  { id: 'transferidos', weightKey: 'transferidos', label: 'Tickets transferidos' },
  { id: 'primeira', weightKey: 'primeira', label: 'Tempo de primeira resposta' },
  { id: 'resolucao', weightKey: 'resolucao', label: 'Tempo médio de resolução' },
] as const;

const RULE_NAMES: Record<string, string> = {
  resolvidos: 'Tickets resolvidos (%)',
  resolvidosCount: 'Tickets resolvidos',
  primeira: 'Tempo de primeira resposta',
  resolucao: 'Tempo médio de resolução',
  transferidos: 'Tickets transferidos',
  satisfacao: 'Satisfação',
};
const RULE_OPS: Record<string, string> = { gt: '>', gte: '>=', lt: '<', lte: '<=', eq: '=', between: 'entre' };
const RULE_UNITS: Record<string, string> = { resolvidos: '%', satisfacao: '%', primeira: ' min', resolucao: ' min' };

function ruleConference(rule: Rule & { name?: string }, periodLabel?: string) {
  const name = rule.name || RULE_NAMES[rule.indicator] || rule.indicator.replace(/^c:/, '').replace(/-/g, ' ');
  const unit = RULE_UNITS[rule.indicator] ?? '';
  const value = rule.op === 'between' ? `${rule.value} a ${rule.valueTo ?? ''}${unit}` : `${rule.value}${unit}`;
  const sign = RULE_OPS[rule.op] ?? rule.op;
  const when = periodLabel || (rule.period === 'month' ? 'mês' : rule.period === 'week' ? 'semana' : '');
  return `${name} | ${value} | ${sign} | ${when}`;
}

type ChatMessage = { id: string; from: 'bot' | 'user'; text: string };
type Phase = 'idle' | 'custom' | 'overall';

function headers() {
  return { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) };
}

function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={text} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-4 w-4 place-items-center rounded-full border border-white/50 bg-white/40 text-[10px] font-semibold text-[#8A7C98]">
        <Info className="h-2.5 w-2.5" />
      </button>
      {open ? <span role="tooltip" className="absolute top-5 left-0 z-20 w-64 rounded-xl border border-[#E7DFF0] bg-white p-2 text-left text-[12px] leading-5 font-normal text-[#5C5168] shadow-md">{text}</span> : null}
    </span>
  );
}

function tone(state?: string) {
  if (state === 'met') return 'text-[#157A3A]';
  if (state === 'miss') return 'text-[#B42318]';
  if (state === 'pending') return 'text-[#A16207]';
  return 'text-[#5C5168]';
}

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, credentials: 'include', headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || data.message || 'erro'), { status: response.status, data });
  return data;
}

function sameCriterion(left?: Criterion, right?: Criterion) {
  return left?.mode === right?.mode && (left?.indicator ?? '') === (right?.indicator ?? '') && (left?.templateId ?? '') === (right?.templateId ?? '');
}

type Board = {
  goals: GoalsPayload;
  selected: Criterion;
  phase: Phase;
  preview: { periodKey: string; warnings: string[]; rows: Row[] } | null;
  periodKey: string;
  replace: boolean;
  setPeriodKey: (value: string) => void;
  setReplace: (value: boolean) => void;
  pendingRules: PendingRules | null;
  setPendingRules: (value: PendingRules | null) => void;
  conference: GoalsConference | null;
  pendingPodium: Criterion | null;
  confirmPodium: (next?: Criterion) => Promise<void>;
  cancelProposal: () => void;
  messages: ChatMessage[];
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  choose: (next: Criterion, silent?: boolean) => Promise<void>;
  startCustom: () => void;
  startOverall: () => void;
  talk: (text: string) => Promise<void>;
  approveWith: (reportText: string) => Promise<void>;
  patchRow: (index: number, patch: Partial<Row>) => void;
  saveTemplate: () => Promise<void>;
  onFile: (file: File) => void;
  lastReport: string;
};

const BoardContext = createContext<Board | null>(null);

function useBoard() {
  const board = useContext(BoardContext);
  if (!board) throw new Error('goals');
  return board;
}

export const GoalsProvider: FC<{
  goals: GoalsPayload;
  week: string;
  onWeek: (key: string) => void;
  onChange: (goals: GoalsPayload) => void;
  children: ReactNode;
}> = ({ goals, week, onWeek, onChange, children }) => {
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<{ periodKey: string; warnings: string[]; rows: Row[] } | null>(null);
  const [periodKey, setPeriodKey] = useState(week || goals.currentKey);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingRules, setPendingRules] = useState<PendingRules | null>(null);
  const [conference, setConference] = useState<GoalsConference | null>(null);
  const [pendingPodium, setPendingPodium] = useState<Criterion | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'hello',
    from: 'bot',
    text: 'Olá! Posso interpretar metas gerais da gestão, receber resultados individuais, comparar com as metas, mostrar uma conferência e consultar o histórico. Só registro no Banco dos relatórios depois da sua confirmação. O pódio é independente: só muda se você pedir isso explicitamente e confirmar.',
  }]);
  const lastReport = useRef('');
  const saving = useRef(false);
  const selected = goals.criterion?.mode === 'custom'
    ? goals.criterion
    : { ...(goals.criterion ?? { indicator: 'resolvidos', templateId: '' }), mode: 'overall' as const };

  function say(from: ChatMessage['from'], text: string) {
    setMessages((current) => [...current, { id: `${Date.now()}-${from}-${current.length}`, from, text }]);
  }

  async function choose(next: Criterion) {
    if (!goals.canManage) return;
    if (sameCriterion(selected, next)) {
      setPhase('idle');
      return;
    }
    try {
      const data = await send('/api/goals/criterion', 'POST', { ...next, periodKey: week || goals.currentKey });
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      setPhase('idle');
      toast.success('Critério salvo para esta configuração.');
    } catch {
      toast.error('Não foi possível salvar o critério.');
    }
  }

  function startCustom() {
    setPhase('custom');
    setPendingPodium(null);
    say('bot', 'Critérios personalizados: descreva no chat um indicador inédito, com meta, condição e período. Se o texto falar só de tickets resolvidos, transferidos, primeira resposta ou TMA, eu uso o desempenho geral.');
  }

  function startOverall() {
    setPhase('overall');
    setPendingPodium(null);
    say('bot', 'Desempenho geral: descreva no chat as metas e os resultados. Eu identifico pelo texto quais indicadores entram (tickets resolvidos, transferidos, primeira resposta e TMA), distribuo os pesos igualmente e comparo com o melhor da categoria. Quem não cumpre a condição zera só aquela parcela. O pódio não muda até você pedir e confirmar.');
  }

  function cancelProposal() {
    setPendingRules(null);
    setConference(null);
    setPendingPodium(null);
    say('bot', 'Cancelei esta conferência. O pódio não foi alterado.');
  }

  async function confirmPodium(next?: Criterion) {
    const criterion = next ?? pendingPodium;
    if (!criterion) return;
    await choose({ ...criterion, mode: criterion.mode === 'custom' ? 'custom' : 'overall' });
    const label = criterion.mode === 'custom' ? (METRICS.find((item) => item[0] === criterion.indicator)?.[1] ?? criterion.indicator) : 'desempenho geral';
    setPendingPodium(null);
    say('bot', `Pódio atualizado para ${label}. As metas e o Banco dos relatórios não foram alterados.`);
  }

  async function talk(text: string) {
    const source = text.trim();
    if (!source || busy) return;
    const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if ((conference || pendingRules) && /^(confirmar|aprovar|aprovar regra|aprovar criterio|confirmar metas)$/.test(normalized)) {
      say('user', source);
      setDraft('');
      await saveTemplate();
      return;
    }
    if (pendingPodium && /^(confirmar|confirmar podio|aprovar)$/.test(normalized)) {
      say('user', source);
      setDraft('');
      await confirmPodium();
      return;
    }
    if ((conference || pendingRules) && /^(cancelar|descartar)$/.test(normalized)) {
      say('user', source);
      setDraft('');
      cancelProposal();
      return;
    }
    say('user', source);
    setBusy(true);
    try {
      const history = messages.slice(-6).map((message) => ({ text: message.text }));
      const data = await send('/api/goals/center', 'POST', {
        text: source,
        history,
        mode: phase === 'idle' ? (selected.mode === 'custom' ? 'custom' : 'overall') : phase,
      });
      if (data.kind === 'unavailable' || data.kind === 'quota' || data.kind === 'auth' || data.kind === 'permission' || data.kind === 'model' || data.kind === 'invalid' || data.kind === 'clarify' || data.kind === 'storage') setDraft(source);
      else setDraft('');
      if (data.kind === 'conference' && data.conference) {
        setConference(data.conference);
        setPendingRules(null);
        setPendingPodium(null);
      } else if (data.kind === 'podium') {
        onChange({ ...data, canManage: goals.canManage, people: data.people ?? goals.people });
        window.dispatchEvent(new Event('unica-goals-saved'));
        setPendingPodium(null);
        setConference(null);
        setPendingRules(null);
        setPhase('idle');
        say('bot', String(data.reply ?? 'Pódio atualizado. As metas não foram alteradas.'));
      } else {
        say('bot', String(data.reply ?? ''));
        if (data.kind === 'clarify') {
          setConference(null);
          setPendingRules(null);
        }
      }
    } catch (error) {
      setDraft(source);
      const data = error && typeof error === 'object' && 'data' in error ? (error as { data?: { kind?: string; reply?: string } }).data : undefined;
      say('bot', data?.reply || 'Não consegui falar com a IA agora. Nada foi alterado e o seu texto continua no campo.');
    } finally {
      setBusy(false);
    }
  }

  async function approveWith(reportText: string) {
    if (!preview) return;
    const key = periodKey || preview.periodKey;
    if (!key) {
      toast.error('Escolha a semana desses resultados.');
      return;
    }
    try {
      const data = await send('/api/goals/approve', 'POST', {
        text: lastReport.current || reportText,
        periodKey: key,
        replace,
        display: selected,
        rows: preview.rows.map((row) => ({ sourceName: row.sourceName, userId: row.userId, values: row.values })),
      });
      setPreview(null);
      setReplace(false);
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      onWeek(key);
      toast.success('Importação aprovada. O pódio desta semana foi atualizado.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'duplicate') {
        say('bot', 'Esse relatório já foi importado.');
        toast.error('Esse relatório já foi importado.');
      } else if (code === 'period') {
        say('bot', 'Esta semana já tem um pódio aprovado. Marque substituir só esta semana se for isso mesmo.');
      } else {
        say('bot', 'Ainda há nomes ou valores para conferir.');
        toast.error('Ainda há nomes ou valores para conferir.');
      }
    }
  }

  function patchRow(index: number, patch: Partial<Row>) {
    setPreview((currentPreview) => currentPreview ? { ...currentPreview, rows: currentPreview.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) } : currentPreview);
  }

  async function saveTemplate() {
    if (saving.current || busy) return;
    if (conference) {
      saving.current = true;
      setBusy(true);
      try {
        const data = await send('/api/goals/center', 'POST', { action: 'confirm', text: 'confirmar', conference });
        onChange({ ...data, canManage: goals.canManage, people: data.people ?? goals.people });
        window.dispatchEvent(new Event('unica-goals-saved'));
        setConference(null);
        setPendingRules(null);
        setPhase('idle');
        say('bot', String(data.reply ?? 'Gravei as metas e os resultados no Banco dos relatórios. O pódio não foi alterado.'));
      } catch {
        say('bot', 'Não consegui salvar. O pódio continua como estava.');
      } finally {
        saving.current = false;
        setBusy(false);
      }
      return;
    }
    if (!pendingRules) return;
    saving.current = true;
    const name = pendingRules.name.trim() || 'Metas da gestão';
    setBusy(true);
    try {
      const data = await send('/api/goals/templates', 'POST', {
        confirm: true,
        name,
        description: pendingRules.explanation,
        rules: pendingRules.rules,
        period: pendingRules.period,
        periodKey: pendingRules.periodKey,
        periodLabel: pendingRules.periodLabel,
        combine: pendingRules.combine,
        subsetor: pendingRules.subsetor,
        weights: pendingRules.weights,
      });
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      setPendingRules(null);
      setPhase('idle');
      say('bot', 'Metas da gestão gravadas. O pódio não foi alterado.');
    } catch {
      say('bot', 'Não consegui salvar. O pódio continua como estava.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function onFile(file: File) {
    if (!file.type.startsWith('text/') && !/\.(txt|csv|md)$/i.test(file.name)) {
      toast.error('Anexe um arquivo de texto com o relatório.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => void talk(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  const value = useMemo<Board>(() => ({
    goals,
    selected,
    phase,
    preview,
    periodKey,
    replace,
    setPeriodKey,
    setReplace,
    pendingRules,
    setPendingRules,
    conference,
    pendingPodium,
    confirmPodium,
    messages,
    draft,
    setDraft,
    busy,
    choose,
    startCustom,
    startOverall,
    talk,
    approveWith,
    patchRow,
    saveTemplate,
    cancelProposal,
    onFile,
    lastReport: lastReport.current,
  }), [goals, selected, phase, preview, periodKey, replace, pendingRules, conference, pendingPodium, messages, draft, busy]);

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};

export const GoalsCenter: FC = () => {
  const board = useBoard();
  const { goals, selected, phase, preview, periodKey, replace, setPeriodKey, setReplace, busy, startCustom, startOverall, patchRow, approveWith } = board;

  const cards = [
    {
      id: 'overall' as const,
      title: 'Desempenho Geral',
      text: 'Avalia a equipe com os indicadores padrão da operação: tickets resolvidos, tickets transferidos, tempo de primeira resposta e TMA. Você descreve no chat quais entram, as metas e os resultados; a IA identifica pelo texto, reparte os pesos igualmente e calcula o percentual de desempenho.',
      icon: Star,
      points: [
        'Escreva no chat o recorte: um, dois, três ou os quatro indicadores',
        'A IA reconhece o pedido pelo texto; não é preciso marcar caixas',
        'A pontuação é proporcional ao melhor resultado da mesma categoria',
        'Quem não cumpre a condição zera só aquela parcela, não a avaliação inteira',
        'O pódio mostra o percentual total; o detalhe de cada indicador fica no tooltip',
      ],
    },
    {
      id: 'custom' as const,
      title: 'Critérios Personalizados',
      text: 'Cria uma avaliação com indicador, meta e regra que ainda não existem na plataforma. Use quando precisar medir algo próprio, sem misturar com tickets, primeira resposta ou TMA.',
      icon: Settings2,
      points: [
        'Descreva no chat o indicador inédito, a meta, a condição e o período',
        'Dá para combinar várias condições na mesma avaliação',
        'A Central compara cada colaborador com as regras que você definiu',
        'O critério fica salvo para reutilizar e gera um pódio próprio',
      ],
    },
  ];

  function onSelect(id: 'custom' | 'overall') {
    if (id === 'custom') {
      startCustom();
      return;
    }
    startOverall();
  }

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#F4E4FB] via-[#EED4F8] to-[#E3C2F4] px-5 py-4">
        <div className="relative flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/70 text-[#8E35B8]"><Target className="h-6 w-6" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-[20px] font-semibold text-[#4A1C73]">Central Inteligente de Metas <Hint text="Dois modos: desempenho geral e critérios personalizados. Metas e pódio são fluxos separados." /></h2>
            <p className="mt-0.5 text-[13px] text-[#8A5AA0]">Interprete metas e resultados nos dois modos. O pódio só muda com pedido explícito e confirmação.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#241B33]">
          <Trophy className="h-4 w-4 text-[#8E35B8]" /> Escolha o modo da Central
        </h3>
        <p className="mt-0.5 text-[12.5px] text-[#8A7C98]">O modo orienta a interpretação. Você pode mudar de assunto no chat a qualquer momento.</p>
        <div className="mt-3 grid items-stretch gap-3 sm:grid-cols-2">
          {cards.map((card) => {
            const committed = phase === 'idle' && selected.mode === card.id;
            const pending = (card.id === 'custom' && phase === 'custom') || (card.id === 'overall' && phase === 'overall');
            const Icon = card.icon;
            return (
              <article key={card.id} className={cn('relative flex h-full flex-col rounded-[22px] border bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.05)]', committed || pending ? 'border-[#8E35B8] ring-1 ring-[#8E35B8]/20' : 'border-[#EDE4F5]')}>
                {committed ? <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#8E35B8] text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><Icon className="h-5 w-5" /></span>
                <h4 className="mt-3 text-[15px] font-semibold text-[#241B33]">{card.title}</h4>
                <p className="mt-1 text-[12.5px] leading-5 text-[#8A7C98]">{card.text}</p>
                <ul className="mt-3 grid flex-1 gap-1.5 text-[12.5px] text-[#5C5168]">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8E35B8]" />
                      {point}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!goals.canManage}
                  onClick={() => onSelect(card.id)}
                  className={cn('mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold', committed ? 'bg-[#8E35B8] text-white' : pending ? 'bg-[#F3E4FA] text-[#6A228C]' : 'border border-[#E7DFF0] text-[#6A228C]')}
                >
                  {committed ? <Check className="h-3.5 w-3.5" /> : card.id === 'custom' ? <Pencil className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                  {committed ? 'Selecionado' : pending ? 'Definindo no chat' : 'Selecionar'}
                </button>
              </article>
            );
          })}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F7F0FB] px-3 py-2 text-[12.5px] text-[#6A228C]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> Depois do critério, envie os relatórios no assistente à direita.
        </p>
      </section>

      {preview ? (
        <section className="rounded-[22px] border border-[#EDE4F5] bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[13px] text-[#5C5168]">Semana
              <input type="week" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} className="h-10 rounded-xl border border-[#E7DFF0] px-3" />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[#5C5168]">
              <input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} />
              Substituir apenas o pódio já aprovado desta semana
            </label>
          </div>
          {preview.warnings.map((warning) => <p key={warning} className="mt-2 text-[13px] text-[#A16207]">{warning}</p>)}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="text-[#8A7C98]">
                <tr>
                  <th className="py-2 pr-3 font-medium">Colaborador</th>
                  <th className="py-2 pr-3 font-medium">Subsetor</th>
                  {METRICS.map(([id, label]) => <th key={id} className="py-2 pr-3 font-medium">{label}</th>)}
                  <th className="py-2 font-medium">Geral</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${row.sourceName}-${index}`} className="border-t border-[#F3E4FA]">
                    <td className="py-2 pr-3">
                      {row.userId ? row.name : (
                        <div className="grid gap-1">
                          <span className="text-[11px] text-[#A16207]">{row.sourceName}</span>
                          <select className="h-9 rounded-lg border border-[#E7DFF0] px-2" value={row.userId} onChange={(event) => {
                            const person = goals.people.find((item) => item.id === event.target.value);
                            const subsetor = person && ['Chat', 'E-mail', 'Ligação', 'Atendimento'].includes(person.funcao) ? person.funcao : (['Chat', 'E-mail', 'Ligação', 'Atendimento'].includes(person?.role ?? '') ? person?.role ?? '' : '');
                            patchRow(index, { userId: event.target.value, name: person?.name ?? '', subsetor });
                          }}>
                            <option value="">Escolher colaborador</option>
                            {(row.ambiguous.length > 0 ? row.ambiguous : goals.people).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">{row.subsetor || '—'}</td>
                    {METRICS.map(([id]) => (
                      <td key={id} className={cn('py-2 pr-3', tone(row.states?.[id]))}>
                        <input
                          aria-label={id}
                          inputMode="decimal"
                          value={row.values[id] ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value.replace(',', '.');
                            patchRow(index, { values: { ...row.values, [id]: raw === '' ? null : Number(raw) } });
                          }}
                          className="h-8 w-20 rounded-lg border border-[#E7DFF0] bg-transparent px-2"
                        />
                        {id !== 'transferidos' && row.goal[id]?.target != null ? <span className="block text-[11px] text-[#8A7C98]">meta {row.goal[id]?.target}</span> : null}
                      </td>
                    ))}
                    <td className="py-2">{row.overall ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" disabled={busy} onClick={() => void approveWith(board.lastReport)} className="mt-3 w-fit rounded-full bg-[#8E35B8] px-4 py-2 text-[13px] font-semibold text-white">Aprovar importação</button>
        </section>
      ) : null}
    </div>
  );
};

const MONTH_NAMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function isoWeekDate(year: number, week: number) {
  const january = new Date(Date.UTC(year, 0, 1));
  const day = january.getUTCDay() || 7;
  const monday = new Date(january);
  monday.setUTCDate(january.getUTCDate() + (day <= 4 ? 1 - day : 8 - day) + (week - 1) * 7);
  return monday;
}

function monthBucket(periodKey: string) {
  const month = /^month:(\d{4})-(\d{2})$/.exec(periodKey);
  if (month) return `${month[1]}-${month[2]}`;
  const week = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (week) {
    const date = isoWeekDate(Number(week[1]), Number(week[2]));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return '';
}

function monthTitle(bucket: string) {
  const [year, month] = bucket.split('-');
  const name = MONTH_NAMES[Number(month) - 1];
  if (!name || !year) return 'Período a confirmar';
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${year}`;
}

function ruleDirection(op: string) {
  if (op === 'lt' || op === 'lte') return 'Menor é melhor';
  if (op === 'between') return 'Faixa';
  if (op === 'eq') return 'Igual';
  return 'Maior é melhor';
}

function ruleTarget(rule: Rule) {
  if (rule.op === 'between') return `${rule.value} a ${rule.valueTo ?? ''}`;
  return String(rule.value);
}

function goalMet(value: number | null | undefined, rule?: Rule, importGoal?: { target?: number | null; direction?: string }) {
  if (value === null || value === undefined) return null;
  if (rule) {
    if (rule.op === 'gt') return value > rule.value;
    if (rule.op === 'gte') return value >= rule.value;
    if (rule.op === 'lt') return value < rule.value;
    if (rule.op === 'lte') return value <= rule.value;
    if (rule.op === 'eq') return value === rule.value;
    if (rule.op === 'between') return value >= rule.value && value <= (rule.valueTo ?? rule.value);
  }
  if (importGoal?.target == null) return null;
  return importGoal.direction === 'lower' ? value <= importGoal.target : value >= importGoal.target;
}

function StatusText({ met }: { met: boolean | null }) {
  if (met === true) return <span className="text-[12px] font-medium text-[#157A3A]">Atingiu a meta</span>;
  if (met === false) return <span className="text-[12px] font-medium text-[#B42318]">Não atingiu a meta</span>;
  return <span className="text-[12px] text-[#8A7C98]">Sem meta cadastrada</span>;
}

function ReportBank({ goals, onClose, wide, onWide }: { goals: GoalsPayload; onClose: () => void; wide: boolean; onWide: () => void }) {
  const records = goals.ledger?.records ?? [];
  const bankPeriods = goals.bank?.periods ?? [];
  const buckets = [...new Set([
    ...bankPeriods.map((item) => item.key),
    ...records.map((record) => monthBucket(record.periodKey)),
    ...goals.templates.map((template) => monthBucket(template.periodKey || '')),
  ].filter(Boolean))].sort().reverse();
  const openKeys = records.some((record) => !record.periodKey) ? [...buckets, ''] : buckets;
  const [selected, setSelected] = useState(openKeys[0] ?? '');
  const [openId, setOpenId] = useState('');
  const bankPeriod = bankPeriods.find((item) => item.key === selected);

  const periodRecords = records.filter((record) => monthBucket(record.periodKey) === selected);
  const shownTemplates = goals.templates.filter((template) => {
    const key = monthBucket(template.periodKey || '');
    if (selected) return key === selected || (!key && template.period !== 'week');
    return true;
  });
  const importGoals = goals.imports.filter((item) => monthBucket(item.periodKey) === selected);

  const identified = periodRecords.filter((record) => record.userId && !record.pending);
  const pending = bankPeriod?.pending.length
    ? periodRecords.filter((record) => bankPeriod.pending.some((item) => item.id === record.id || item.sourceName === record.sourceName))
    : periodRecords.filter((record) => !record.userId || record.pending);
  const peopleCards = (bankPeriod?.people.length
    ? bankPeriod.people.map((row) => ({
      person: goals.people.find((item) => item.id === row.userId) ?? { id: row.userId, name: row.name, funcao: '', role: '', aliases: [] as string[] },
      record: identified.find((record) => record.userId === row.userId),
      indicators: row.indicators,
      periodLabel: row.periodLabel,
      history: row.history,
    }))
    : [
      ...goals.people.map((person) => ({ person, record: identified.find((record) => record.userId === person.id), indicators: null as BankIndicator[] | null, periodLabel: '', history: [] as { at: string; values: LedgerValues }[] })).filter((item) => item.record),
      ...identified.filter((record) => !goals.people.some((person) => person.id === record.userId)).map((record) => ({
        person: { id: record.userId, name: record.name || record.sourceName, funcao: '', role: '', aliases: [] as string[] },
        record,
        indicators: null as BankIndicator[] | null,
        periodLabel: record.periodLabel,
        history: record.history,
      })),
    ]
  ).sort((left, right) => left.person.name.localeCompare(right.person.name, 'pt'));

  function metaFor(field: string) {
    const fromTemplate = shownTemplates.flatMap((template) => template.rules).find((rule) => rule.indicator === field);
    const fromImport = importGoals.flatMap((item) => item.goals).map((item) => item.goal)[0];
    const importRule = field === 'resolvidos' || field === 'primeira' || field === 'resolucao' || field === 'transferidos'
      ? fromImport?.[field as 'resolvidos' | 'primeira' | 'resolucao' | 'transferidos']
      : undefined;
    return { rule: fromTemplate, importGoal: importRule };
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#FBF8FC]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F3EAF8] bg-white px-3 py-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#241B33]">Banco dos relatórios</h3>
          <p className="text-[11.5px] text-[#8A7C98]">Metas da gestão e resultados por colaborador, separados por mês.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label={wide ? 'Reduzir painel' : 'Ampliar chat e banco de dados'} title={wide ? 'Reduzir' : 'Ampliar'} onClick={onWide} className="grid h-8 w-8 place-items-center rounded-full border border-[#E7DFF0] text-[#6A228C] hover:bg-[#F3E4FA]">
            {wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-[#E7DFF0] px-3 py-1 text-[12px] font-semibold text-[#6A228C]">Fechar</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {openKeys.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {openKeys.map((bucket) => (
              <button
                key={bucket || 'aberto'}
                type="button"
                onClick={() => setSelected(bucket)}
                className={cn('rounded-full px-3 py-1.5 text-[12px] font-semibold', selected === bucket ? 'bg-[#8E35B8] text-white' : 'bg-white text-[#6A228C] border border-[#E7DFF0]')}
              >
                {bucket ? (bankPeriods.find((item) => item.key === bucket)?.label || monthTitle(bucket)) : 'Período a confirmar'}
              </button>
            ))}
          </div>
        ) : null}

        <section className="rounded-2xl border border-[#EDE4F5] bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A5AA0]">Legenda</p>
          <ul className="mt-2 grid gap-1 text-[12px] text-[#5C5168]">
            <li><span className="font-medium text-[#157A3A]">Atingiu a meta</span> — o resultado ficou dentro da regra cadastrada.</li>
            <li><span className="font-medium text-[#B42318]">Não atingiu a meta</span> — o resultado ficou fora da regra cadastrada.</li>
            <li><span className="font-medium text-[#8A7C98]">Sem meta cadastrada</span> — há resultado, mas a gestão não definiu meta para este indicador.</li>
            <li><span className="font-medium text-[#A16207]">Aguardando identificação</span> — o nome do relatório ainda não foi vinculado a um cadastro da Equipe.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#EDE4F5] bg-white p-3">
          <h4 className="text-[13px] font-semibold text-[#4A1C73]">Metas definidas pela gestão</h4>
          <p className="mt-0.5 text-[12px] text-[#8A7C98]">{bankPeriod?.label || (selected ? monthTitle(selected) : 'Período a confirmar')}</p>
          {(bankPeriod?.goals.length ? bankPeriod.goals : shownTemplates.flatMap((template) => template.rules)).length === 0 && importGoals.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[#8A7C98]">Nenhuma meta cadastrada para este período.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {(bankPeriod?.goals.length
                ? bankPeriod.goals.map((goal, index) => ({
                  key: `${goal.indicator}-${index}`,
                  name: goal.name,
                  value: goal.indicator === 'primeira' || goal.indicator === 'resolucao' ? `${goal.value} min` : goal.indicator === 'resolvidos' || goal.indicator === 'satisfacao' ? `${goal.value}%` : String(goal.value),
                  direction: ruleDirection(goal.op),
                  period: goal.periodLabel || bankPeriod.label,
                }))
                : shownTemplates.flatMap((template) => template.rules.map((rule, index) => ({
                  key: `${template.id}-${rule.indicator}-${index}`,
                  name: RULE_NAMES[rule.indicator] ?? rule.indicator,
                  value: rule.indicator === 'primeira' || rule.indicator === 'resolucao' ? `${ruleTarget(rule)} min` : rule.indicator === 'resolvidos' || rule.indicator === 'satisfacao' ? `${ruleTarget(rule)}%` : String(ruleTarget(rule)),
                  direction: ruleDirection(rule.op),
                  period: template.periodLabel || bankPeriod?.label || (selected ? monthTitle(selected) : 'Período a confirmar'),
                })))).map((goal) => (
                <li key={goal.key} className="rounded-xl bg-[#F7F0FB] px-3 py-2">
                  <p className="text-[12.5px] font-semibold text-[#241B33]">{goal.name}</p>
                  <p className="text-[12px] text-[#5C5168]">Valor da meta: {goal.value}</p>
                  <p className="text-[12px] text-[#5C5168]">Regra: {goal.direction}</p>
                  <p className="text-[12px] text-[#5C5168]">Período de validade: {goal.period}</p>
                </li>
              ))}
              {importGoals.flatMap((item) => item.goals.flatMap((entry) => LEDGER_FIELDS.map(([field, label]) => {
                const goal = (entry.goal as Record<string, { target?: number | null; direction?: string } | undefined>)[field];
                if (!goal || goal.target == null) return null;
                return (
                  <li key={`${item.id}-${entry.subsetor}-${field}`} className="rounded-xl bg-[#F7F0FB] px-3 py-2">
                    <p className="text-[12.5px] font-semibold text-[#241B33]">{label}{entry.subsetor ? ` · ${entry.subsetor}` : ''}</p>
                    <p className="text-[12px] text-[#5C5168]">Valor da meta: {ledgerText(field, goal.target)}</p>
                    <p className="text-[12px] text-[#5C5168]">Regra: {goal.direction === 'lower' ? 'Menor é melhor' : 'Maior é melhor'}</p>
                    <p className="text-[12px] text-[#5C5168]">Período de validade: {item.label || monthTitle(selected)}</p>
                  </li>
                );
              })))}
            </ul>
          )}
        </section>

        <section className="grid gap-2">
          <h4 className="text-[13px] font-semibold text-[#4A1C73]">Resultados individuais</h4>
          {peopleCards.length === 0 && pending.length === 0 ? <p className="text-[12.5px] text-[#8A7C98]">Nenhum resultado armazenado neste período.</p> : null}
          {peopleCards.map(({ person, record, indicators, periodLabel, history }) => {
            const open = openId === (record?.id || person.id);
            const shownHistory = history?.length ? history : record?.history ?? [];
            return (
              <article key={person.id} className="overflow-hidden rounded-2xl border border-[#EDE4F5] bg-white">
                <button type="button" onClick={() => setOpenId(open ? '' : (record?.id || person.id))} className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left">
                  <span>
                    <span className="block text-[13px] font-semibold text-[#241B33]">{person.name}</span>
                    <span className="block text-[11.5px] text-[#8A7C98]">{person.funcao || person.role} · {periodLabel || record?.periodLabel || bankPeriod?.label || (selected ? monthTitle(selected) : 'Período a confirmar')}</span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#8A7C98] transition', open ? 'rotate-180' : '')} />
                </button>
                {open && (record || indicators?.length) ? (
                  <div className="border-t border-[#F3EAF8] px-3 py-3">
                    <ul className="grid gap-2">
                      {(indicators ?? LEDGER_FIELDS.map(([field, label]) => {
                        const value = record?.values[field];
                        if (value === null || value === undefined) return null;
                        const meta = metaFor(field);
                        return { field, name: label, value, met: goalMet(value, meta.rule, meta.importGoal), target: meta.rule ? meta.rule.value : meta.importGoal?.target, op: meta.rule?.op ?? '' };
                      }).filter(Boolean) as BankIndicator[]).map((item) => (
                          <li key={item.field} className="rounded-xl bg-[#FBF8FC] px-3 py-2">
                            <p className="text-[12.5px] font-semibold text-[#241B33]">{item.name}</p>
                            <div className="mt-1 grid gap-0.5 text-[12px] text-[#5C5168]">
                              <p>Resultado alcançado: {ledgerText(item.field, item.value)}</p>
                              {item.target != null ? <p>Meta estabelecida: {item.field === 'primeira' || item.field === 'resolucao' ? `${item.target} min` : item.field === 'resolvidos' || item.field === 'satisfacao' ? `${item.target}%` : String(item.target)}</p> : null}
                              <StatusText met={item.met} />
                            </div>
                          </li>
                      ))}
                    </ul>
                    {shownHistory.length ? (
                      <details className="mt-3 rounded-xl border border-[#EDE4F5] px-3 py-2">
                        <summary className="cursor-pointer text-[12px] font-medium text-[#6A228C]">Histórico de atualizações</summary>
                        <ul className="mt-2 grid gap-2">
                          {shownHistory.map((item, index) => (
                            <li key={`${item.at}-${index}`} className="rounded-lg bg-white px-2 py-2 text-[12px] text-[#8A7C98]">
                              <p className="font-medium text-[#5C5168]">{clock(item.at) || `Versão ${index + 1}`}</p>
                              <p>{LEDGER_FIELDS.filter(([field]) => item.values[field] !== null && item.values[field] !== undefined).map(([field, label]) => `${label}: ${ledgerText(field, item.values[field] ?? null)}`).join(' · ') || 'Sem indicadores nesta versão.'}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {pending.map((record) => {
            const open = openId === record.id;
            return (
              <article key={record.id} className="overflow-hidden rounded-2xl border border-[#F3E0C8] bg-white">
                <button type="button" onClick={() => setOpenId(open ? '' : record.id)} className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left">
                  <span>
                    <span className="block text-[13px] font-semibold text-[#241B33]">{record.sourceName || record.name}</span>
                    <span className="block text-[11.5px] font-medium text-[#A16207]">Aguardando identificação</span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#8A7C98] transition', open ? 'rotate-180' : '')} />
                </button>
                {open ? (
                  <div className="border-t border-[#F3EAF8] px-3 py-3">
                    <p className="text-[12px] leading-5 text-[#A16207]">{record.note || 'Este nome ainda não foi vinculado a um cadastro da Equipe. Nenhum colaborador novo foi criado.'}</p>
                    <ul className="mt-2 grid gap-2">
                      {LEDGER_FIELDS.map(([field, label]) => {
                        const value = record.values[field];
                        if (value === null || value === undefined) return null;
                        return (
                          <li key={field} className="rounded-xl bg-[#FBF8FC] px-3 py-2">
                            <p className="text-[12.5px] font-semibold text-[#241B33]">{label}</p>
                            <p className="text-[12px] text-[#5C5168]">Resultado alcançado: {ledgerText(field, value)}</p>
                            <StatusText met={null} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export const GoalsAssistant: FC = () => {
  const board = useBoard();
  const { goals, messages, draft, setDraft, busy, talk, phase, pendingRules, setPendingRules, conference, pendingPodium, confirmPodium, saveTemplate, cancelProposal } = board;
  const thread = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages, phase, pendingRules, conference]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void talk(draft);
  }

  return (
    <aside className={cn('relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#EDE4F5] bg-white', wide && 'fixed inset-3 z-[70] shadow-[0_24px_60px_rgba(80,40,120,0.22)] xl:inset-y-3 xl:right-3 xl:left-[256px]')}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F3EAF8] px-3 py-3 pr-10">
        <h3 className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-[#241B33]">
          <Sparkles className="h-4 w-4 shrink-0 text-[#8E35B8]" /> <span className="truncate">Fale com o assistente de metas</span>
          <Hint text="A Central interpreta metas e resultados, mostra uma conferência e só grava depois da confirmação. O pódio só muda com pedido explícito e confirmação." />
        </h3>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Abrir banco de dados dos relatórios" title="Banco de dados" onClick={() => setBankOpen(true)} className="grid h-8 w-8 place-items-center rounded-lg text-[#8E35B8] hover:bg-[#F3E4FA]">
            <FileText className="h-4 w-4" />
          </button>
          <button type="button" aria-label={wide ? 'Reduzir painel' : 'Ampliar chat e banco de dados'} title={wide ? 'Reduzir' : 'Ampliar chat e banco'} onClick={() => setWide((value) => !value)} className="grid h-8 w-8 place-items-center rounded-lg text-[#8E35B8] hover:bg-[#F3E4FA]">
            {wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {bankOpen ? <ReportBank goals={goals} wide={wide} onWide={() => setWide((value) => !value)} onClose={() => setBankOpen(false)} /> : null}
      <div ref={thread} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {messages.map((message) => (
          <div key={message.id} className={cn('flex gap-2', message.from === 'user' ? 'justify-end' : 'items-start')}>
            {message.from === 'bot' ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F3E4FA] text-[#8E35B8]"><Bot className="h-4 w-4" /></span> : null}
            <p className={cn('max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13px] leading-5', message.from === 'bot' ? 'bg-[#F7F0FB] text-[#3C3148]' : 'bg-[#8E35B8] text-white')}>{message.text}</p>
          </div>
        ))}
        {pendingPodium ? (
          <div className="grid gap-2 rounded-xl border border-[#E7DFF0] bg-[#FBF8FC] p-2">
            <p className="text-[12px] font-semibold text-[#4A1C73]">Só o pódio. As metas não mudam.</p>
            <p className="text-[12.5px] text-[#5C5168]">Critério: {pendingPodium.mode === 'overall' ? 'Desempenho geral' : METRICS.find((item) => item[0] === pendingPodium.indicator)?.[1] ?? pendingPodium.indicator}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void confirmPodium()} className="h-9 rounded-full bg-[#8E35B8] text-[12.5px] font-semibold text-white disabled:bg-[#C9A6DC]">Confirmar pódio</button>
              <button type="button" disabled={busy} onClick={cancelProposal} className="h-9 rounded-full border border-[#E7DFF0] text-[12.5px] font-semibold text-[#6A228C]">Cancelar</button>
            </div>
          </div>
        ) : null}
        {phase === 'custom' && !pendingRules && !conference ? (
          <div className="grid gap-1.5">
            {[
              'Meta personalizada: primeira resposta no máximo 5 minutos e TMA no máximo 8 minutos em janeiro de 2027.',
              'Índice de qualidade no atendimento pelo menos 90% em janeiro de 2027.',
            ].map((example) => (
              <button key={example} type="button" onClick={() => void talk(example)} className="rounded-xl border border-[#E7DFF0] px-3 py-2 text-left text-[12.5px] text-[#6A228C] hover:bg-[#FBF8FC]">
                {example}
              </button>
            ))}
          </div>
        ) : null}
        {conference ? (
          <div className="grid gap-2 rounded-xl border border-[#E7DFF0] bg-[#FBF8FC] p-2">
            <p className="text-[12px] font-semibold text-[#4A1C73]">Conferência. Nada foi salvo e o pódio não foi alterado.</p>
            {conference.period?.label ? <p className="text-[12px] text-[#5C5168]">Período: {conference.period.label}</p> : null}
            {conference.goals.length ? (
              <>
                <p className="text-[12px] font-medium text-[#4A1C73]">Metas da gestão — {conference.period.label}</p>
                <p className="text-[11px] text-[#8A7C98]">Indicador | Valor | Regra | Período</p>
                <ul className="grid gap-1 text-[12.5px] leading-5 break-words text-[#5C5168]">
                  {conference.goals.map((goal, index) => (
                    <li key={`${goal.indicator}-${index}`}>{ruleConference(goal, conference.period.label)}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {conference.overall?.scores?.length ? (
              <>
                <p className="text-[12px] font-medium text-[#4A1C73]">Desempenho geral</p>
                <p className="text-[11px] text-[#8A7C98]">
                  Incluídos: {(conference.overall.selected ?? []).map((id) => OVERALL_OPTIONS.find((item) => item.id === id)?.label ?? id).join(', ') || 'indicadores selecionados'}.
                  {(conference.overall.excluded ?? []).length ? ` Fora: ${(conference.overall.excluded ?? []).map((id) => OVERALL_OPTIONS.find((item) => item.id === id)?.label ?? id).join(', ')}.` : ''}
                  {' '}Pesos iguais.
                </p>
                <ul className="grid gap-1 text-[12.5px] leading-5 break-words text-[#5C5168]">
                  {conference.overall.scores.map((item) => (
                    <li key={item.userId}>
                      {item.place}º {item.name}: {item.score}%
                      {item.parts ? ` — ${Object.values(item.parts).map((part) => (typeof part === 'number' ? String(part) : `${part.name}: ${part.value ?? '—'} → ${part.contribution}%${part.eligible === false && part.reason ? ` (${part.reason})` : ''}`)).join('; ')}` : ''}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {conference.people.length ? (
              <>
                <p className="text-[12px] font-medium text-[#4A1C73]">Resultados individuais</p>
                <ul className="grid gap-2 text-[12.5px] leading-5 break-words text-[#5C5168]">
                  {conference.people.map((person) => (
                    <li key={person.userId || person.sourceName}>
                      <p className="font-medium text-[#241B33]">{person.name}{person.identified ? ' — cadastro da Equipe' : ' — aguardando identificação'}</p>
                      {person.results.map((item) => (
                        <p key={item.indicator}>{item.name}: {item.value}{item.unit} — {item.status}</p>
                      ))}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="text-[12px] text-[#8A7C98]">O pódio permanece como está.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void saveTemplate()} className="h-9 rounded-full bg-[#8E35B8] text-[12.5px] font-semibold text-white disabled:bg-[#C9A6DC]">Confirmar metas</button>
              <button type="button" disabled={busy} onClick={cancelProposal} className="h-9 rounded-full border border-[#E7DFF0] text-[12.5px] font-semibold text-[#6A228C]">Cancelar</button>
            </div>
          </div>
        ) : pendingRules ? (
          <div className="grid gap-2 rounded-xl border border-[#E7DFF0] bg-[#FBF8FC] p-2">
            <p className="text-[12px] font-semibold text-[#4A1C73]">Conferência. Nada foi salvo e o pódio não foi alterado.</p>
            {pendingRules.rules.length ? (
              <>
                <p className="text-[12px] font-medium text-[#4A1C73]">Metas da gestão — {pendingRules.periodLabel || 'período a confirmar'}</p>
                <p className="text-[11px] text-[#8A7C98]">Indicador | Valor | Regra | Período</p>
                <ul className="grid gap-1 text-[12.5px] leading-5 break-words text-[#5C5168]">
                  {pendingRules.rules.map((rule, index) => (
                    <li key={`${rule.indicator}-${index}`}>{ruleConference(rule, pendingRules.periodLabel)}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {(pendingRules.comparisons?.length || pendingRules.rows?.length) ? (
              <>
                <p className="text-[12px] font-medium text-[#4A1C73]">Resultados individuais</p>
                <ul className="grid gap-2 text-[12.5px] leading-5 break-words text-[#5C5168]">
                  {pendingRules.comparisons?.length
                    ? pendingRules.comparisons.map((person) => (
                      <li key={person.userId || person.sourceName || person.name}>
                        <p className="font-medium text-[#241B33]">{person.name || person.sourceName}{person.userId ? ' — cadastro da Equipe' : ''}</p>
                        {person.indicators.filter((item) => item.value !== null).map((item) => (
                          <p key={item.indicator}>{ruleConference({ indicator: item.indicator, op: item.op, value: item.value ?? 0 }, item.met === true ? 'Atingiu' : item.met === false ? 'Não atingiu' : 'Sem meta')}</p>
                        ))}
                      </li>
                    ))
                    : (pendingRules.rows ?? []).map((person) => (
                      <li key={person.userId || person.sourceName}>
                        <p className="font-medium text-[#241B33]">{person.name || person.sourceName}{person.userId ? ' — cadastro da Equipe' : ''}</p>
                        {Object.entries(person.values).filter(([, value]) => value !== null && value !== undefined).map(([field, value]) => (
                          <p key={field}>{RULE_NAMES[field] ?? field}: {String(value)}</p>
                        ))}
                      </li>
                    ))}
                </ul>
              </>
            ) : null}
            <p className="text-[12px] text-[#8A7C98]">{pendingRules.sourceText || pendingRules.rows?.length ? 'O pódio permanece como está.' : pendingRules.combine === 'any' ? 'Basta uma condição.' : 'Todas as condições são obrigatórias.'}{pendingRules.subsetor ? ` Subsetor ${pendingRules.subsetor}.` : ''}</p>
            {pendingRules.sourceText || pendingRules.rows?.length ? null : (
              <input value={pendingRules.name} onChange={(event) => setPendingRules({ ...pendingRules, name: event.target.value })} placeholder="Nome do pódio" className="h-9 w-full rounded-lg border border-[#E7DFF0] bg-white px-2 text-[13px]" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void saveTemplate()} className="h-9 rounded-full bg-[#8E35B8] text-[12.5px] font-semibold text-white disabled:bg-[#C9A6DC]">Confirmar metas</button>
              <button type="button" disabled={busy} onClick={cancelProposal} className="h-9 rounded-full border border-[#E7DFF0] text-[12.5px] font-semibold text-[#6A228C]">Cancelar</button>
            </div>
          </div>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="shrink-0 border-t border-[#F3EAF8] p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-[#E7DFF0] bg-[#FBF8FC] px-3 py-2">
          <input ref={fileRef} type="file" accept=".txt,.csv,.md,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) board.onFile(file); event.currentTarget.value = ''; }} />
          <button type="button" aria-label="Anexar relatório" onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-items-center text-[#8A7C98]"><Paperclip className="h-4 w-4" /></button>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Cole ou digite sua mensagem..." rows={2} className="min-h-10 max-h-24 flex-1 resize-none bg-transparent text-[13px] outline-none" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar" className="grid h-8 w-8 place-items-center rounded-full bg-[#8E35B8] text-white disabled:bg-[#C9A6DC]"><Send className="h-3.5 w-3.5" /></button>
        </div>
      </form>
    </aside>
  );
};
