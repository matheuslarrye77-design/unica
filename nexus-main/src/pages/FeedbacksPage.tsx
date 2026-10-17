import { FeedbackDialog } from '@/components/FeedbackDialog';
import { PageFrame } from '@/components/shell/PageFrame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { isLeader, loadFeedback, replyToFeedback, updateFeedbackStatus, type FeedbackItem, type SuggestionStatus } from '@/lib/institution';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { actor, useDemoProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ChevronRight, Filter, MessageSquare, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type FC, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

const STATUS: Record<SuggestionStatus, { label: string; className: string }> = {
  novo: { label: 'Novo', className: 'bg-[#FCE7F3] text-[#BE185D]' },
  analise: { label: 'Análise', className: 'bg-[#F3E8FF] text-[#6D28D9]' },
  respondido: { label: 'Respondido', className: 'bg-[#E0E7FF] text-[#3730A3]' },
};

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'AN';
}

function whenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((start - day) / 86_400_000);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Hoje, ${time}`;
  if (diff === 1) return `Ontem, ${time}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

function replyLabel(count: number) {
  return count === 1 ? '1 resposta' : `${count} respostas`;
}

export const FeedbacksPage: FC = () => {
  const demo = useDemoProfile();
  const user = actor();
  const gestao = LOGIN_REQUIRED ? isLeader(user) : demo === 'helena';
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'todos'>('todos');
  const [authorFilter, setAuthorFilter] = useState('');
  const [period, setPeriod] = useState<'todos' | '7' | '30'>('todos');
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    loadFeedback()
      .then((data) => {
        if (!active) return;
        setItems(data.feedback);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [demo, gestao]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const author = authorFilter.trim().toLowerCase();
    const limit = period === 'todos' ? null : Date.now() - Number(period) * 86_400_000;
    return items.filter((item) => {
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false;
      if (gestao && author && !(item.anonymous ? 'anônimo' : item.authorName ?? '').toLowerCase().includes(author)) return false;
      if (limit !== null && new Date(item.createdAt).getTime() < limit) return false;
      if (!term) return true;
      return `${item.title} ${item.message}`.toLowerCase().includes(term);
    });
  }, [items, query, statusFilter, authorFilter, period, gestao]);

  function clearFilters() {
    setStatusFilter('todos');
    setAuthorFilter('');
    setPeriod('todos');
    setQuery('');
  }

  async function changeStatus(item: FeedbackItem, status: SuggestionStatus) {
    if (!gestao || item.status === status || savingStatus) return;
    setSavingStatus(item.id);
    setStatusMenu(null);
    try {
      const saved = await updateFeedbackStatus(item.id, status);
      setItems((current) => current.map((entry) => (entry.id === item.id ? saved.feedback : entry)));
    } catch {
      toast.error('Não foi possível atualizar o status.');
    } finally {
      setSavingStatus(null);
    }
  }

  async function sendReply(item: FeedbackItem) {
    const text = (drafts[item.id] ?? '').trim();
    if (!text || sending) return;
    setSending(item.id);
    try {
      const saved = await replyToFeedback(item.id, text);
      setItems((current) => current.map((entry) => (entry.id === item.id ? saved.feedback : entry)));
      setDrafts((current) => ({ ...current, [item.id]: '' }));
    } catch {
      toast.error('Não foi possível enviar a resposta.');
    } finally {
      setSending(null);
    }
  }

  function onReplyKey(event: KeyboardEvent<HTMLTextAreaElement>, item: FeedbackItem) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendReply(item);
    }
  }

  return (
    <PageFrame>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight text-[#241B33]">Sugestões</h1>
              <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#8A7C98]">Sua opinião também constrói o nosso futuro. Deixe aqui suas ideias, comentários e sugestões.</p>
            </div>
          </div>
          <Button className="rounded-full" onClick={() => setComposer(true)}>
            <Plus className="h-4 w-4" /> Nova sugestão
          </Button>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7A8C4]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar sugestão..."
              className="h-11 rounded-xl border-[#EFE6F4] bg-white pl-9"
              aria-label="Buscar sugestão por título ou conteúdo"
            />
          </div>
          <div className="relative">
            <Button type="button" variant="outline" className="h-11 rounded-xl border-[#EFE6F4] bg-white" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
              <Filter className="h-4 w-4" /> Filtros
            </Button>
            {filtersOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[#EFE6F4] bg-white p-3 shadow-lg">
                <label className="block text-[12px] font-medium text-[#6B5A7A]">
                  Status
                  <select className="mt-1 h-9 w-full rounded-lg border border-[#EFE6F4] bg-white px-2 text-[13px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SuggestionStatus | 'todos')}>
                    <option value="todos">Todos</option>
                    <option value="novo">Novo</option>
                    <option value="analise">Análise</option>
                    <option value="respondido">Respondido</option>
                  </select>
                </label>
                {gestao ? (
                  <>
                    <label className="mt-3 block text-[12px] font-medium text-[#6B5A7A]">
                      Colaborador
                      <input className="mt-1 h-9 w-full rounded-lg border border-[#EFE6F4] px-2 text-[13px]" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)} placeholder="Nome do autor" />
                    </label>
                    <label className="mt-3 block text-[12px] font-medium text-[#6B5A7A]">
                      Período
                      <select className="mt-1 h-9 w-full rounded-lg border border-[#EFE6F4] bg-white px-2 text-[13px]" value={period} onChange={(event) => setPeriod(event.target.value as 'todos' | '7' | '30')}>
                        <option value="todos">Todo o período</option>
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                      </select>
                    </label>
                  </>
                ) : null}
                <button type="button" className="mt-3 text-[12px] font-medium text-[#8E35B8]" onClick={clearFilters}>Limpar filtros</button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? <p className="rounded-2xl border border-[#EFE6F4] bg-white px-4 py-8 text-center text-sm text-[#8A7C98]">Carregando sugestões...</p> : null}
          {failed ? <p className="rounded-2xl border border-[#F8D0E3] bg-white px-4 py-8 text-center text-sm text-[#9D174D]">Não foi possível carregar as sugestões.</p> : null}
          {!loading && !failed && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#EFE6F4] bg-white px-4 py-10 text-center">
              <p className="text-sm text-[#8A7C98]">{items.length === 0 ? 'Nenhuma sugestão ainda.' : 'Nenhuma sugestão encontrada para esta busca.'}</p>
              {items.length === 0 ? (
                <Button className="mt-4 rounded-full" onClick={() => setComposer(true)}>Criar a primeira sugestão</Button>
              ) : (
                <button type="button" className="mt-3 text-sm font-medium text-[#8E35B8]" onClick={clearFilters}>Limpar pesquisa</button>
              )}
            </div>
          ) : null}
          {!loading && !failed ? filtered.map((item) => {
            const name = item.anonymous ? 'Anônimo' : item.authorName || 'Colaborador';
            const open = openId === item.id;
            const count = item.replies?.length ?? 0;
            const draft = drafts[item.id] ?? '';
            return (
              <article key={item.id} className="rounded-2xl border border-[#EFE6F4] bg-white">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3E8FF] text-[12px] font-semibold text-[#7C3AED]">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <button type="button" className="block w-full text-left" onClick={() => { setOpenId(open ? null : item.id); setStatusMenu(null); }}>
                      <span className="block truncate text-[14px] font-semibold text-[#241B33]">{item.title || item.message}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-[#8A7C98]">{item.message}</span>
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-[12px] text-[#8A7C98]">{name}</span>
                      <span className="text-[12px] text-[#8A7C98]">{whenLabel(item.createdAt)}</span>
                      <span className="ml-auto flex items-center gap-3">
                    <div className="relative">
                      {gestao ? (
                        <button
                          type="button"
                          className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', STATUS[item.status].className, savingStatus === item.id && 'opacity-60')}
                          onClick={() => setStatusMenu(statusMenu === item.id ? null : item.id)}
                          disabled={savingStatus === item.id}
                          aria-label={`Alterar status de ${item.title || 'sugestão'}`}
                        >
                          {STATUS[item.status].label}
                        </button>
                      ) : (
                        <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-medium', STATUS[item.status].className)}>{STATUS[item.status].label}</span>
                      )}
                      {statusMenu === item.id ? (
                        <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-[#EFE6F4] bg-white p-1 shadow-lg">
                          {(Object.keys(STATUS) as SuggestionStatus[]).map((status) => (
                            <button key={status} type="button" className={cn('block w-full rounded-lg px-2 py-1.5 text-left text-[12px]', status === item.status ? 'bg-[#F8EAFB] font-medium' : 'hover:bg-[#FBF7FD]')} onClick={() => void changeStatus(item, status)}>
                              {STATUS[status].label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button type="button" className="inline-flex items-center gap-1 text-[12px] text-[#8A7C98]" onClick={() => setOpenId(open ? null : item.id)} aria-label={replyLabel(count)}>
                      <MessageSquare className="h-3.5 w-3.5" /> {replyLabel(count)}
                    </button>
                    <ChevronRight className={cn('h-4 w-4 text-[#C4B6D4] transition-transform', open && 'rotate-90')} />
                      </span>
                    </div>
                  </div>
                </div>
                {open ? (
                  <div className="border-t border-[#F3EEF6] px-4 py-3">
                    <div className="space-y-3">
                      {(item.replies ?? []).length === 0 ? <p className="text-[13px] text-[#8A7C98]">Ainda não há respostas.</p> : null}
                      {(item.replies ?? []).map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-[#FBF7FD] px-3 py-2">
                          <p className="text-[12px] font-medium text-[#6B5A7A]">{reply.authorName || 'Anônimo'} <span className="font-normal text-[#B7A8C4]">{whenLabel(reply.createdAt)}</span></p>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#2C2433]">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Textarea
                        value={draft}
                        onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                        onKeyDown={(event) => onReplyKey(event, item)}
                        placeholder="Escreva uma resposta"
                        className="min-h-20 rounded-xl border-[#EFE6F4]"
                        aria-label={`Resposta para ${item.title || 'sugestão'}`}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button type="button" className="rounded-full" disabled={!draft.trim() || sending === item.id} onClick={() => void sendReply(item)}>
                          {sending === item.id ? 'Enviando...' : 'Enviar resposta'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          }) : null}
        </div>
      </div>
      <FeedbackDialog
        open={composer}
        onOpenChange={(open) => {
          setComposer(open);
          if (!open) {
            void loadFeedback().then((data) => setItems(data.feedback)).catch(() => undefined);
          }
        }}
      />
    </PageFrame>
  );
};
