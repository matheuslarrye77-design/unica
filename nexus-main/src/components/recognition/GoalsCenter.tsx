import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';
import { cn } from '@/lib/utils';
import { BarChart3, Bot, Check, Info, Paperclip, Pencil, Send, Settings2, Sparkles, Star, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type FC, type FormEvent } from 'react';
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

export const GoalsCenter: FC<{
  goals: GoalsPayload;
  week: string;
  onWeek: (key: string) => void;
  onChange: (goals: GoalsPayload) => void;
}> = ({ goals, week, onWeek, onChange }) => {
  const [draft, setDraft] = useState('');
  const [preview, setPreview] = useState<{ periodKey: string; warnings: string[]; rows: Row[] } | null>(null);
  const [periodKey, setPeriodKey] = useState(week || goals.currentKey);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingRules, setPendingRules] = useState<{ period: string; rules: Rule[]; name: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'hello',
    from: 'bot',
    text: 'Olá! Envie aqui os relatórios da sua equipe para que eu possa processar as informações e atualizar os pódios.',
  }]);
  const thread = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = goals.criterion ?? { mode: 'preset' as const, indicator: 'resolvidos' };

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages, preview]);

  function say(from: ChatMessage['from'], text: string) {
    setMessages((current) => [...current, { id: `${Date.now()}-${from}`, from, text }]);
  }

  async function choose(next: Criterion, silent = false) {
    if (!goals.canManage) return;
    if (sameCriterion(selected, next)) return;
    if (!silent && goals.criterion && !sameCriterion(goals.criterion, next) && !window.confirm('Trocar o critério ativo? Os resultados das semanas anteriores continuam salvos.')) return;
    try {
      const data = await send('/api/goals/criterion', 'POST', { ...next, periodKey: week || goals.currentKey });
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      toast.success('Critério salvo para esta configuração.');
    } catch {
      toast.error('Não foi possível salvar o critério.');
    }
  }

  const lastReport = useRef('');

  async function talk(text: string) {
    const source = text.trim();
    if (!source || busy) return;
    setDraft('');
    say('user', source);
    setBusy(true);
    try {
      const data = await send('/api/goals/assistant', 'POST', { text: source, preview, periodKey: periodKey || week || goals.currentKey });
      say('bot', String(data.reply ?? ''));
      if (data.kind === 'preview') {
        lastReport.current = source;
        setPreview(data.preview);
        setPeriodKey(data.preview.periodKey || periodKey);
        setReplace(false);
      }
      if (data.kind === 'cancel') setPreview(null);
      if (data.kind === 'approve') await approveWith(source);
      if (data.kind === 'criterion') await choose(data.criterion, true);
      if (data.kind === 'custom') setPendingRules({ period: data.period, rules: data.rules, name: '' });
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
    if (!pendingRules || !pendingRules.name.trim()) return;
    const data = await send('/api/goals/templates', 'POST', { confirm: true, name: pendingRules.name.trim(), description: pendingRules.name, rules: pendingRules.rules, period: pendingRules.period });
    onChange({ ...data, canManage: goals.canManage, people: goals.people });
    const template = data.templates?.at(-1);
    if (template?.id) await choose({ mode: 'custom', indicator: selected.indicator, templateId: template.id });
    setPendingRules(null);
    say('bot', 'Modelo salvo. O pódio personalizado fica disponível para esta e as próximas semanas.');
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void talk(draft);
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

  const cards = [
    {
      id: 'preset' as const,
      title: 'Critérios Predefinidos',
      text: 'Utilize os indicadores já definidos pela empresa.',
      icon: BarChart3,
      points: ['Tickets resolvidos', 'Tickets transferidos', 'Tempo de primeira resposta', 'Tempo médio de resolução'],
      criterion: { mode: 'preset' as const, indicator: selected.mode === 'preset' ? selected.indicator || 'resolvidos' : 'resolvidos' },
    },
    {
      id: 'custom' as const,
      title: 'Critérios Personalizados',
      text: 'Crie um pódio com regras livres e específicas para sua necessidade.',
      icon: Settings2,
      points: ['Defina indicadores e condições', 'Use modelos prontos', 'Personalize como quiser'],
      criterion: { mode: 'custom' as const, indicator: selected.indicator, templateId: selected.templateId || goals.templates[0]?.id || '' },
    },
    {
      id: 'overall' as const,
      title: 'Desempenho Geral',
      text: 'Avalia o conjunto das métricas com pesos personalizados.',
      icon: Star,
      points: ['Pontuação de 0 a 100', 'Equilíbrio entre indicadores', 'Regras de participação'],
      criterion: { mode: 'overall' as const, indicator: selected.indicator },
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
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
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {cards.map((card) => {
              const active = selected.mode === card.id;
              const Icon = card.icon;
              return (
                <article key={card.id} className={cn('relative flex flex-col rounded-[22px] border bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.05)]', active ? 'border-[#8E35B8]' : 'border-[#EDE4F5]')}>
                  {active ? <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#8E35B8] text-white"><Check className="h-3.5 w-3.5" /></span> : null}
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><Icon className="h-5 w-5" /></span>
                  <h4 className="mt-3 text-[15px] font-semibold text-[#241B33]">{card.title}</h4>
                  <p className="mt-1 min-h-10 text-[12.5px] leading-5 text-[#8A7C98]">{card.text}</p>
                  <ul className="mt-3 grid gap-1.5 text-[12.5px] text-[#5C5168]">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        {card.id === 'preset' && active ? (
                          <button type="button" className={cn('mt-0.5 grid h-4 w-4 place-items-center rounded-full', selected.indicator === METRICS.find((item) => item[1] === point)?.[0] ? 'bg-[#8E35B8] text-white' : 'bg-[#EFE6F8] text-[#8E35B8]')} onClick={() => void choose({ mode: 'preset', indicator: METRICS.find((item) => item[1] === point)?.[0] ?? 'resolvidos' })}>
                            <Check className="h-2.5 w-2.5" />
                          </button>
                        ) : <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8E35B8]" />}
                        {point}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={!goals.canManage}
                    onClick={() => void choose(card.criterion)}
                    className={cn('mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold', active ? 'bg-[#8E35B8] text-white' : 'border border-[#E7DFF0] text-[#6A228C]')}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : card.id === 'custom' ? <Pencil className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
                    {active ? 'Selecionado' : 'Selecionar'}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#F7F0FB] px-3 py-2 text-[12.5px] text-[#6A228C]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Após definir o critério, basta enviar os relatórios no chat ao lado para que o sistema faça a análise automaticamente.
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
            <button type="button" disabled={busy} onClick={() => void approveWith(lastReport.current)} className="mt-3 w-fit rounded-full bg-[#8E35B8] px-4 py-2 text-[13px] font-semibold text-white">Aprovar importação</button>
          </section>
        ) : null}

        {pendingRules ? (
          <section className="rounded-[22px] border border-[#EDE4F5] bg-white p-4">
            <p className="text-[13px] text-[#5C5168]">Regras interpretadas. Confirme o nome para salvar o modelo, sem ativar um pódio inventado.</p>
            {pendingRules.rules.map((rule) => <p key={`${rule.indicator}-${rule.op}`} className="text-[13px]">{rule.indicator} {rule.op} {rule.value}{rule.valueTo !== undefined ? ` e ${rule.valueTo}` : ''}</p>)}
            <input value={pendingRules.name} onChange={(event) => setPendingRules({ ...pendingRules, name: event.target.value })} placeholder="Nome do pódio" className="mt-2 h-10 w-full rounded-xl border border-[#E7DFF0] px-3 text-sm" />
            <button type="button" onClick={() => void saveTemplate()} className="mt-2 text-[13px] font-semibold text-[#6A228C]">Aprovar e salvar modelo</button>
          </section>
        ) : null}
      </div>

      <aside className="flex min-h-[540px] flex-col overflow-hidden rounded-[22px] border border-[#EDE4F5] bg-white shadow-[0_8px_22px_rgba(80,40,120,0.05)]">
        <div className="flex items-center justify-between border-b border-[#F3EAF8] px-4 py-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-[#241B33]">
            <Sparkles className="h-4 w-4 text-[#8E35B8]" /> Fale com o assistente de metas
            <Hint text="Cole os relatórios recebidos. O sistema identifica colaboradores e métricas por regras, sem serviço pago de IA." />
          </h3>
        </div>
        <div ref={thread} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((message) => (
            <div key={message.id} className={cn('flex gap-2', message.from === 'user' ? 'justify-end' : 'items-start')}>
              {message.from === 'bot' ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F3E4FA] text-[#8E35B8]"><Bot className="h-4 w-4" /></span> : null}
              <p className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-5', message.from === 'bot' ? 'bg-[#F7F0FB] text-[#3C3148]' : 'bg-[#8E35B8] text-white')}>{message.text}</p>
            </div>
          ))}
          <div className="grid gap-1.5 pt-1">
            {['Processar relatório da semana', 'Criar um pódio personalizado', 'Ver metas atuais'].map((hint) => (
              <button key={hint} type="button" onClick={() => void talk(hint === 'Processar relatório da semana' ? 'Analise os relatórios desta semana.' : hint === 'Criar um pódio personalizado' ? 'Quero criar um pódio para quem resolveu mais tickets.' : 'Mostre as metas atuais.')} className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[12.5px] text-[#6A228C] hover:bg-[#FBF8FC]">
                <Sparkles className="h-3.5 w-3.5" /> {hint}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={onSubmit} className="border-t border-[#F3EAF8] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-[#E7DFF0] bg-[#FBF8FC] px-3 py-2">
            <input ref={fileRef} type="file" accept=".txt,.csv,.md,text/plain" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.currentTarget.value = ''; }} />
            <button type="button" aria-label="Anexar relatório" onClick={() => fileRef.current?.click()} className="grid h-8 w-8 place-items-center text-[#8A7C98]"><Paperclip className="h-4 w-4" /></button>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onPaste={(event) => {
              const pasted = event.clipboardData.getData('text');
              if (pasted.length > 180) {
                event.preventDefault();
                void talk(pasted);
              }
            }} placeholder="Cole ou digite sua mensagem..." rows={2} className="min-h-10 flex-1 resize-none bg-transparent text-[13px] outline-none" />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar" className="grid h-8 w-8 place-items-center rounded-full bg-[#8E35B8] text-white disabled:bg-[#C9A6DC]"><Send className="h-3.5 w-3.5" /></button>
          </div>
        </form>
      </aside>
    </div>
  );
};
