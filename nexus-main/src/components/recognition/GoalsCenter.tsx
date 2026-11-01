import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { authHeaders, getDemoId } from '@/lib/session';
import { cn } from '@/lib/utils';
import { useState, type FC } from 'react';
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
  goal: { resolvidos?: { target: number | null }; primeira?: { target: number | null }; resolucao?: { target: number | null }; transferidos?: { target: number | null }; transferidosMode?: string };
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
export type GoalsPayload = {
  canManage: boolean;
  currentKey: string;
  weights: { resolvidos: number; primeira: number; resolucao: number; floor: number };
  tieBreak: string[];
  people: Person[];
  templates: Template[];
  imports: GoalImport[];
};

const METRICS = [
  ['resolvidos', 'Tickets resolvidos'],
  ['transferidos', 'Tickets transferidos'],
  ['primeira', 'Primeira resposta'],
  ['resolucao', 'Tempo médio'],
] as const;

function headers() {
  return { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) };
}

function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={text} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-4 w-4 place-items-center rounded-full border border-[#E7DFF0] text-[10px] font-semibold text-[#8A7C98]">i</button>
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

export const GoalsCenter: FC<{
  goals: GoalsPayload;
  week: string;
  onWeek: (key: string) => void;
  onChange: (goals: GoalsPayload) => void;
}> = ({ goals, week, onWeek, onChange }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ periodKey: string; warnings: string[]; rows: Row[] } | null>(null);
  const [periodKey, setPeriodKey] = useState('');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [customName, setCustomName] = useState('');
  const [draftRules, setDraftRules] = useState<{ period: string; rules: Rule[] } | null>(null);
  const [weights, setWeights] = useState(goals.weights);
  const current = goals.imports.find((item) => item.periodKey === (week || goals.currentKey));

  async function confer() {
    setBusy(true);
    try {
      const data = await send('/api/goals/preview', 'POST', { text });
      setPreview(data);
      setPeriodKey(data.periodKey || '');
      setReplace(false);
      if (data.rows.length === 0) toast.error('Não encontrei colaboradores nesse texto.');
    } catch {
      toast.error('Não foi possível ler o relatório.');
    } finally {
      setBusy(false);
    }
  }

  function patchRow(index: number, patch: Partial<Row>) {
    setPreview((currentPreview) => currentPreview ? { ...currentPreview, rows: currentPreview.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) } : currentPreview);
  }

  async function approve() {
    if (!preview) return;
    if (!periodKey) {
      toast.error('Escolha a semana desses resultados.');
      return;
    }
    setBusy(true);
    try {
      const data = await send('/api/goals/approve', 'POST', {
        text,
        periodKey,
        replace,
        display: { mode: 'overall' },
        rows: preview.rows.map((row) => ({ sourceName: row.sourceName, userId: row.userId, values: row.values })),
      });
      setPreview(null);
      setText('');
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      onWeek(periodKey);
      toast.success('Importação aprovada. O pódio desta semana foi atualizado.');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'duplicate') toast.error('Esse relatório já foi importado.');
      else if (code === 'period') toast.error('Esta semana já tem um pódio aprovado. Confirme se quer substituir só esta semana.');
      else toast.error('Ainda há nomes ou valores para conferir.');
    } finally {
      setBusy(false);
    }
  }

  async function showOnPodium(display: { mode: string; indicator?: string; templateId?: string }) {
    if (!current) return;
    const data = await send('/api/goals/display', 'POST', { periodKey: current.periodKey, display });
    onChange({ ...data, canManage: goals.canManage, people: goals.people });
    toast.success('O pódio passou a usar este critério.');
  }

  async function interpret() {
    try {
      const data = await send('/api/goals/templates', 'POST', { description: custom });
      setDraftRules({ period: data.period, rules: data.rules });
    } catch (error) {
      const message = error instanceof Error && 'data' in error ? String((error as { data?: { message?: string } }).data?.message ?? '') : '';
      toast.error(message || 'Não consegui transformar esse pedido em regras.');
    }
  }

  async function saveTemplate() {
    if (!draftRules || !customName.trim()) return;
    const data = await send('/api/goals/templates', 'POST', { confirm: true, name: customName.trim(), description: custom, rules: draftRules.rules, period: draftRules.period });
    onChange({ ...data, canManage: goals.canManage, people: goals.people });
    setDraftRules(null);
    setCustom('');
    setCustomName('');
    toast.success('Critério salvo.');
  }

  async function saveWeights() {
    try {
      const data = await send('/api/goals/settings', 'PUT', { weights, tieBreak: goals.tieBreak });
      onChange({ ...data, canManage: goals.canManage, people: goals.people });
      toast.success('Pesos atualizados. As semanas antigas continuam com as metas da época.');
    } catch {
      toast.error('Os três pesos precisam somar 100.');
    }
  }

  return (
    <section className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
      <div className="flex items-center gap-2">
        <h2 className="text-[16px] font-semibold text-[#241B33]">Central Inteligente de Metas</h2>
        <Hint text="Cole os relatórios da semana para identificar colaboradores, metas e resultados. Nada é salvo antes da conferência." />
      </div>
      {goals.canManage ? (
        <div className="mt-3 grid gap-2">
          <label className="text-[13px] font-medium text-[#5C5168]" htmlFor="relatorios-metas">Importar resultados <Hint text="Cole os relatórios recebidos para que o sistema identifique automaticamente os colaboradores e suas métricas." /></label>
          <textarea id="relatorios-metas" value={text} onChange={(event) => setText(event.target.value)} placeholder="Cole aqui um relatório ou vários, do jeito que chegaram." className="min-h-36 w-full rounded-2xl border border-[#E7DFF0] px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !text.trim()} onClick={() => void confer()} className="w-fit rounded-full bg-[#8E35B8] px-4 py-2 text-[13px] font-semibold text-white disabled:bg-[#C9A6DC]">Conferir importação</button>
        </div>
      ) : null}

      {preview ? (
        <div className="mt-4 grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[13px] text-[#5C5168]">Semana
              <input type="week" value={periodKey} onChange={(event) => setPeriodKey(event.target.value)} className="h-10 rounded-xl border border-[#E7DFF0] px-3" />
            </label>
            <label className="flex items-center gap-2 text-[13px] text-[#5C5168]">
              <input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} />
              Substituir apenas o pódio já aprovado desta semana
            </label>
          </div>
          {preview.warnings.map((warning) => <p key={warning} className="text-[13px] text-[#A16207]">{warning}</p>)}
          <div className="overflow-x-auto">
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
                        {id !== 'transferidos' && row.goal[id]?.target !== null && row.goal[id]?.target !== undefined ? <span className="block text-[11px] text-[#8A7C98]">meta {row.goal[id]?.target}</span> : null}
                      </td>
                    ))}
                    <td className="py-2">{row.overall ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" disabled={busy} onClick={() => void approve()} className="w-fit rounded-full bg-[#8E35B8] px-4 py-2 text-[13px] font-semibold text-white">Aprovar importação</button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-[#F3E4FA] p-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">Critérios predefinidos <Hint text="Escolhe um indicador já lido nos relatórios para montar o pódio da semana." /></h3>
          <div className="mt-2 grid gap-2">
            {METRICS.map(([id, label]) => (
              <button key={id} type="button" disabled={!current || !goals.canManage || (id === 'transferidos' && current.rows.every((row) => row.goal.transferidosMode !== 'higher' && row.goal.transferidosMode !== 'lower'))} onClick={() => void showOnPodium({ mode: 'preset', indicator: id })} className="rounded-xl border border-[#E7DFF0] px-3 py-2 text-left text-[13px] disabled:opacity-50">{label}</button>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-[#F3E4FA] p-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">Critério personalizado <Hint text="Permite criar um reconhecimento com regras próprias. As regras aparecem para aprovação antes de valer." /></h3>
          {goals.canManage ? (
            <div className="mt-2 grid gap-2">
              <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Nome do pódio" className="h-10 rounded-xl border border-[#E7DFF0] px-3 text-sm" />
              <textarea value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Descreva quem deve entrar no pódio" className="min-h-20 rounded-xl border border-[#E7DFF0] px-3 py-2 text-sm" />
              <button type="button" onClick={() => void interpret()} className="w-fit text-[13px] font-semibold text-[#6A228C]">Interpretar regras</button>
              {draftRules ? (
                <div className="rounded-xl bg-[#FBF8FC] p-2 text-[12.5px] text-[#5C5168]">
                  <p>{draftRules.period === 'month' ? 'Período mensal' : 'Período semanal'}</p>
                  {draftRules.rules.map((rule) => <p key={`${rule.indicator}-${rule.op}`}>{rule.indicator} {rule.op} {rule.value}{rule.valueTo !== undefined ? ` e ${rule.valueTo}` : ''}</p>)}
                  <button type="button" onClick={() => void saveTemplate()} className="mt-2 font-semibold text-[#6A228C]">Aprovar e salvar modelo</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <ul className="mt-2 grid gap-1 text-[13px]">
            {goals.templates.map((template) => (
              <li key={template.id}>
                <button type="button" disabled={!current || !goals.canManage} onClick={() => void showOnPodium({ mode: 'custom', templateId: template.id })} className="text-left text-[#6A228C] disabled:opacity-50">{template.name}</button>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-[#F3E4FA] p-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">Desempenho geral <Hint text="Classifica os colaboradores pelo cumprimento conjunto das metas, sem comparar o tempo absoluto de canais diferentes." /></h3>
          {goals.canManage ? (
            <div className="mt-2 grid gap-2 text-[13px]">
              {(['resolvidos', 'primeira', 'resolucao'] as const).map((id) => (
                <label key={id} className="flex items-center justify-between gap-2">{METRICS.find((item) => item[0] === id)?.[1]}
                  <input type="number" min={0} max={100} value={weights[id]} onChange={(event) => setWeights({ ...weights, [id]: Number(event.target.value) })} className="h-9 w-16 rounded-lg border border-[#E7DFF0] px-2" />
                </label>
              ))}
              <button type="button" onClick={() => void saveWeights()} className="w-fit font-semibold text-[#6A228C]">Salvar pesos</button>
              <button type="button" disabled={!current} onClick={() => void showOnPodium({ mode: 'overall' })} className="w-fit rounded-full border border-[#E7DFF0] px-3 py-1.5 disabled:opacity-50">Usar no pódio</button>
            </div>
          ) : <p className="mt-2 text-[13px] text-[#8A7C98]">Pesos: resolvidos {goals.weights.resolvidos}%, primeira resposta {goals.weights.primeira}%, resolução {goals.weights.resolucao}%.</p>}
        </article>
      </div>

      {current ? (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold">Metas vigentes <Hint text="Apresenta as metas utilizadas para avaliar os resultados do período selecionado." /></h3>
          <p className="mt-1 text-[12.5px] text-[#8A7C98]">Aprovado por {current.approvedBy} em {new Date(current.approvedAt).toLocaleString('pt-BR')}.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[#8A7C98]"><tr><th className="py-2 pr-3 font-medium">Colaborador</th><th className="py-2 pr-3 font-medium">Subsetor</th><th className="py-2 pr-3 font-medium">Resolvidos</th><th className="py-2 pr-3 font-medium">Primeira resposta</th><th className="py-2 pr-3 font-medium">Resolução</th><th className="py-2 font-medium">Geral</th></tr></thead>
              <tbody>
                {current.rows.map((row) => (
                  <tr key={row.userId} className="border-t border-[#F3E4FA]">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3">{row.subsetor}</td>
                    <td className={cn('py-2 pr-3', tone(row.states?.resolvidos))}>{row.values.resolvidos ?? '—'}{row.goal.resolvidos?.target != null ? ` / ${row.goal.resolvidos.target}%` : ''}</td>
                    <td className={cn('py-2 pr-3', tone(row.states?.primeira))}>{row.values.primeira ?? '—'}{row.goal.primeira?.target != null ? ` / ${row.goal.primeira.target} min` : ''}</td>
                    <td className={cn('py-2 pr-3', tone(row.states?.resolucao))}>{row.values.resolucao ?? '—'}{row.goal.resolucao?.target != null ? ` / ${row.goal.resolucao.target} min` : ''}</td>
                    <td className="py-2">{row.overall ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <p className="mt-4 text-[13px] text-[#8A7C98]">Nenhum resultado aprovado para a semana selecionada. O pódio anterior continua no ar.</p>}

      {goals.imports.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-[14px] font-semibold">Histórico de importações</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {goals.imports.map((item) => (
              <button key={item.id} type="button" onClick={() => onWeek(item.periodKey)} className={cn('rounded-full border px-3 py-1 text-[12.5px]', item.periodKey === current?.periodKey ? 'border-[#8E35B8] bg-[#F3E4FA] text-[#6A228C]' : 'border-[#E7DFF0] text-[#5C5168]')}>{item.label}</button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
