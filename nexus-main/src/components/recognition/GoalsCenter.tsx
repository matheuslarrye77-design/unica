import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';
import { cn } from '@/lib/utils';
import { BarChart3, Bot, Check, Info, Paperclip, Pencil, Send, Settings2, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FC, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

type Rule = { indicator: string; op: string; value: number; valueTo?: number };
type Values = { resolvidos: number | null; resolvidosCount: number | null; transferidos: number | null; primeira: number | null; resolucao: number | null };
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
type Person = { id: string; name: string; funcao: string; role: string; aliases: string[] };
type Template = { id: string; name: string; description: string; period: string; rules: Rule[] };
type Criterion = { mode: 'preset' | 'custom' | 'overall'; indicator?: string; templateId?: string };
export type GoalsPayload = {
  canManage: boolean;
  currentKey: string;
  criterion?: Criterion;
  weights: { resolvidos: number; primeira: number; resolucao: number; floor: number };
  tieBreak: string[];
  people: Person[];
  templates: Template[];
  imports: GoalImport[];
};

const METRICS = [
  ['resolvidos', 'Tickets resolvidos'],
  ['transferidos', 'Tickets transferidos'],
  ['primeira', 'Tempo de primeira resposta'],
  ['resolucao', 'Tempo médio de resolução'],
] as const;

type ChatMessage = { id: string; from: 'bot' | 'user'; text: string };
type Phase = 'idle' | 'preset' | 'custom';

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
  pendingRules: { period: string; rules: Rule[]; name: string } | null;
  setPendingRules: (value: { period: string; rules: Rule[]; name: string } | null) => void;
  messages: ChatMessage[];
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  choose: (next: Criterion, silent?: boolean) => Promise<void>;
  startPreset: () => void;
  startCustom: () => void;
  pickPreset: (indicator: string) => void;
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
  const [pendingRules, setPendingRules] = useState<{ period: string; rules: Rule[]; name: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'hello',
    from: 'bot',
    text: 'Olá! Envie aqui os relatórios da sua equipe para que eu possa processar as informações e atualizar os pódios.',
  }]);
  const lastReport = useRef('');
  const selected = goals.criterion ?? { mode: 'preset' as const, indicator: 'resolvidos' };

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

  function startPreset() {
    setPhase('preset');
    say('bot', 'Qual indicador predefinido entra no pódio desta semana? Escolha um dos quatro abaixo.');
  }

  function startCustom() {
    setPhase('custom');
    say('bot', 'Descreva a regra do pódio, com números. Exemplo: reconhecer quem resolveu pelo menos 250 tickets no mês, com tempo médio abaixo de 18 minutos.');
  }

  async function pickPreset(indicator: string) {
    await choose({ mode: 'preset', indicator });
    const label = METRICS.find((item) => item[0] === indicator)?.[1] ?? indicator;
    say('bot', `Pódio predefinido: ${label}. Agora cole os relatórios para eu calcular.`);
  }

  async function talk(text: string) {
    const source = text.trim();
    if (!source || busy) return;
    setDraft('');
    say('user', source);
    setBusy(true);
    try {
      const data = await send('/api/goals/assistant', 'POST', { text: source, preview, periodKey: periodKey || week || goals.currentKey, intent: phase });
      say('bot', String(data.reply ?? ''));
      if (data.kind === 'preview') {
        lastReport.current = source;
        setPreview(data.preview);
        setPeriodKey(data.preview.periodKey || periodKey);
        setReplace(false);
      }
      if (data.kind === 'cancel') setPreview(null);
      if (data.kind === 'approve') await approveWith(source);
      if (data.kind === 'criterion') await choose(data.criterion);
      if (data.kind === 'custom') {
        setPendingRules({ period: data.period, rules: data.rules, name: '' });
        setPhase('custom');
      }
      if (data.kind === 'goal' && preview) {
        setPreview({
          ...preview,
          rows: preview.rows.map((row) => {
            if (data.channel && row.subsetor !== data.channel) return row;
            return { ...row, goal: { ...row.goal, [data.metric]: { ...(row.goal[data.metric as 'resolvidos'] ?? {}), target: data.target, direction: data.metric === 'resolvidos' ? 'higher' : 'lower' } } };
          }),
        });
      }
    } catch {
      say('bot', 'Não foi possível processar essa mensagem agora.');
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
    if (!pendingRules) return;
    const name = pendingRules.name.trim() || 'Pódio personalizado';
    const data = await send('/api/goals/templates', 'POST', { confirm: true, name, description: name, rules: pendingRules.rules, period: pendingRules.period });
    onChange({ ...data, canManage: goals.canManage, people: goals.people });
    const template = data.templates?.at(-1);
    if (template?.id) await choose({ mode: 'custom', indicator: selected.indicator, templateId: template.id });
    setPendingRules(null);
    setPhase('idle');
    say('bot', 'Modelo salvo. O pódio personalizado fica disponível para esta e as próximas semanas.');
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
    messages,
    draft,
    setDraft,
    busy,
    choose,
    startPreset,
    startCustom,
    pickPreset,
    talk,
    approveWith,
    patchRow,
    saveTemplate,
    onFile,
    lastReport: lastReport.current,
  }), [goals, selected, phase, preview, periodKey, replace, pendingRules, messages, draft, busy]);

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
};

export const GoalsCenter: FC = () => {
  const board = useBoard();
  const { goals, selected, phase, preview, periodKey, replace, setPeriodKey, setReplace, busy, choose, startPreset, startCustom, patchRow, approveWith } = board;

  const cards = [
    {
      id: 'preset' as const,
      title: 'Critérios Predefinidos',
      text: 'Use um indicador já medido no relatório para definir o 1º, 2º e 3º lugares.',
      icon: BarChart3,
      points: ['Tickets resolvidos: maior percentual', 'Tickets transferidos: só se a gestão definir meta', 'Primeira resposta: menor tempo', 'Tempo médio de resolução: menor tempo'],
    },
    {
      id: 'custom' as const,
      title: 'Critérios Personalizados',
      text: 'Crie um pódio com a regra que você escrever no chat, com números e condições.',
      icon: Settings2,
      points: ['Maior, menor, igual ou entre valores', 'Dá para combinar mais de um indicador', 'Salva a regra para usar de novo'],
    },
    {
      id: 'overall' as const,
      title: 'Desempenho Geral',
      text: 'Não olha um indicador isolado. Junta as três metas numa nota de 0 a 100, cada uma no peso do subsetor da pessoa.',
      icon: Star,
      points: ['Resolvidos 40%, primeira resposta 25%, resolução 35%', 'Quem vai muito mal numa meta não sobe só porque foi bem em outra', 'Tickets transferidos não entram nessa nota'],
    },
  ];

  function onSelect(id: 'preset' | 'custom' | 'overall') {
    if (id === 'preset') {
      startPreset();
      return;
    }
    if (id === 'custom') {
      startCustom();
      return;
    }
    void choose({ mode: 'overall' });
  }

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-r from-[#F4E4FB] via-[#EED4F8] to-[#E3C2F4] px-5 py-4">
        <div className="relative flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/70 text-[#8E35B8]"><Target className="h-6 w-6" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-[20px] font-semibold text-[#4A1C73]">Central Inteligente de Metas <Hint text="Defina o critério dos pódios e deixe o sistema calcular os resultados automaticamente." /></h2>
            <p className="mt-0.5 text-[13px] text-[#8A5AA0]">Defina o critério dos pódios e deixe o sistema calcular os resultados automaticamente.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#241B33]">
          <Trophy className="h-4 w-4 text-[#8E35B8]" /> Escolha o critério de reconhecimento
        </h3>
        <p className="mt-0.5 text-[12.5px] text-[#8A7C98]">Selecione como deseja montar os pódios desta semana:</p>
        <div className="mt-3 grid items-stretch gap-3 md:grid-cols-3">
          {cards.map((card) => {
            const committed = phase === 'idle' && selected.mode === card.id;
            const pending = (card.id === 'preset' && phase === 'preset') || (card.id === 'custom' && phase === 'custom');
            const Icon = card.icon;
            return (
              <article key={card.id} className={cn('relative flex h-full flex-col rounded-[22px] border bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.05)]', committed || pending ? 'border-[#8E35B8]' : 'border-[#EDE4F5]')}>
                {committed ? <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#8E35B8] text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><Icon className="h-5 w-5" /></span>
                <h4 className="mt-3 text-[15px] font-semibold text-[#241B33]">{card.title}</h4>
                <p className="mt-1 text-[12.5px] leading-5 text-[#8A7C98]">{card.text}</p>
                {card.id === 'preset' && selected.mode === 'preset' && selected.indicator ? (
                  <p className="mt-2 text-[12px] font-medium text-[#6A228C]">Ativo: {METRICS.find((item) => item[0] === selected.indicator)?.[1] ?? selected.indicator}</p>
                ) : null}
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

export const GoalsAssistant: FC = () => {
  const board = useBoard();
  const { messages, draft, setDraft, busy, talk, phase, pickPreset, pendingRules, setPendingRules, saveTemplate } = board;
  const thread = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages, phase, pendingRules]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void talk(draft);
  }

  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#EDE4F5] bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[#F3EAF8] px-3 py-3 pr-10">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#241B33]">
          <Sparkles className="h-4 w-4 text-[#8E35B8]" /> Fale com o assistente de metas
          <Hint text="Cole os relatórios recebidos. O sistema identifica colaboradores e métricas por regras, sem serviço pago de IA." />
        </h3>
      </div>
      <div ref={thread} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {messages.map((message) => (
          <div key={message.id} className={cn('flex gap-2', message.from === 'user' ? 'justify-end' : 'items-start')}>
            {message.from === 'bot' ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F3E4FA] text-[#8E35B8]"><Bot className="h-4 w-4" /></span> : null}
            <p className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-5', message.from === 'bot' ? 'bg-[#F7F0FB] text-[#3C3148]' : 'bg-[#8E35B8] text-white')}>{message.text}</p>
          </div>
        ))}
        {phase === 'preset' ? (
          <div className="grid gap-1.5">
            {METRICS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => void pickPreset(id)} className="rounded-xl border border-[#E7DFF0] px-3 py-2 text-left text-[12.5px] text-[#6A228C] hover:bg-[#FBF8FC]">
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {phase === 'custom' && !pendingRules ? (
          <div className="grid gap-1.5">
            {[
              'Reconhecer quem resolveu pelo menos 250 tickets no mês, com tempo médio abaixo de 18 minutos.',
              'Pódio para quem ficou abaixo de 5 minutos na primeira resposta.',
            ].map((example) => (
              <button key={example} type="button" onClick={() => void talk(example)} className="rounded-xl border border-[#E7DFF0] px-3 py-2 text-left text-[12.5px] text-[#6A228C] hover:bg-[#FBF8FC]">
                {example}
              </button>
            ))}
          </div>
        ) : null}
        {pendingRules ? (
          <div className="rounded-xl border border-[#E7DFF0] bg-[#FBF8FC] p-2">
            <p className="text-[12px] text-[#5C5168]">Dê um nome a essa regra para salvar.</p>
            <input value={pendingRules.name} onChange={(event) => setPendingRules({ ...pendingRules, name: event.target.value })} placeholder="Nome do pódio" className="mt-1 h-9 w-full rounded-lg border border-[#E7DFF0] bg-white px-2 text-[13px]" />
            <button type="button" onClick={() => void saveTemplate()} className="mt-1 text-[12.5px] font-semibold text-[#6A228C]">Salvar regra</button>
          </div>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="shrink-0 border-t border-[#F3EAF8] p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-[#E7DFF0] bg-[#FBF8FC] px-3 py-2">
          <input ref={fileRef} type="file" accept=".txt,.csv,.md,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) board.onFile(file); event.currentTarget.value = ''; }} />
          <button type="button" aria-label="Anexar relatório" onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-items-center text-[#8A7C98]"><Paperclip className="h-4 w-4" /></button>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onPaste={(event) => {
            const pasted = event.clipboardData.getData('text');
            if (pasted.length > 180) {
              event.preventDefault();
              void talk(pasted);
            }
          }} placeholder="Cole ou digite sua mensagem..." rows={2} className="min-h-10 max-h-24 flex-1 resize-none bg-transparent text-[13px] outline-none" />
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar" className="grid h-8 w-8 place-items-center rounded-full bg-[#8E35B8] text-white disabled:bg-[#C9A6DC]"><Send className="h-3.5 w-3.5" /></button>
        </div>
      </form>
    </aside>
  );
};
