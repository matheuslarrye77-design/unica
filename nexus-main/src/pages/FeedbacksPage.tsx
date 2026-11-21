import { FeedbackDialog } from '@/components/FeedbackDialog';
import { ComposerExtras } from '@/components/social/ComposerExtras';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { Button } from '@/components/ui/button';
import { isLeader, loadFeedback, replyToFeedback, updateFeedbackStatus, type FeedbackItem, type SuggestionStatus } from '@/lib/institution';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { actor, useDemoProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Filter, MessageSquare, Plus } from 'lucide-react';
import { usePageSearch } from '@/lib/pageSearch';
import { useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

const STATUS: Record<SuggestionStatus, { label: string; dot: string }> = {
  novo: { label: 'Novo', dot: '#d6336c' },
  analise: { label: 'Análise', dot: '#d98a14' },
  respondido: { label: 'Respondido', dot: '#17a58b' },
};
const STATUS_FILTERS: { id: SuggestionStatus | 'todos'; label: string; dot: string }[] = [
  { id: 'todos', label: 'Todos', dot: '#7c5cf5' },
  { id: 'novo', label: 'Novo', dot: '#ec6fb0' },
  { id: 'analise', label: 'Análise', dot: '#f2a33a' },
  { id: 'respondido', label: 'Respondido', dot: '#22b8a0' },
];

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
  const { query, setQuery } = usePageSearch();
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
  const listTicket = useRef(0);
  const filterRef = useRef<HTMLDivElement>(null);

  function holdList() {
    listTicket.current += 1;
  }

  useEffect(() => {
    let active = true;
    const load = (first: boolean) => {
      const ticket = ++listTicket.current;
      if (first) {
        setLoading(true);
        setFailed(false);
      }
      loadFeedback()
        .then((data) => {
          if (!active || ticket !== listTicket.current) return;
          setItems(data.feedback);
          setFailed(false);
        })
        .catch(() => {
          if (active && first) setFailed(true);
        })
        .finally(() => {
          if (active && first) setLoading(false);
        });
    };
    load(true);
    const refresh = () => load(false);
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [demo, gestao]);

  useEffect(() => {
    if (!filtersOpen) return;
    const close = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filtersOpen]);

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
      holdList();
      setItems((current) => current.map((entry) => (entry.id === item.id ? saved.feedback : entry)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o status.');
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
      holdList();
      setItems((current) => current.map((entry) => (entry.id === item.id ? saved.feedback : entry)));
      setDrafts((current) => ({ ...current, [item.id]: '' }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a resposta.');
    } finally {
      setSending(null);
    }
  }

  function openReply(id: string) {
    setOpenId(id);
    window.setTimeout(() => document.getElementById(`resposta-${id}`)?.focus(), 0);
  }

  function onReplyKey(event: KeyboardEvent<HTMLTextAreaElement>, item: FeedbackItem) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendReply(item);
    }
  }

  return (
    <PageFrame>
      <div className="w-full">
        <PageHero
          icon={<MessageSquare className="h-5 w-5" strokeWidth={1.75} />}
          title="Sugestões"
          subtitle="Sua opinião também constrói o nosso futuro. Deixe aqui suas ideias, comentários e sugestões."
          aside={
            <button type="button" onClick={() => setComposer(true)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500">
              <Plus className="h-4 w-4" /> Nova sugestão
            </button>
          }
        />

        <div className="mt-5 flex justify-end px-[3px]">
          <div className="relative" ref={filterRef}>
            <button type="button" className={cn('inline-flex h-[42px] items-center gap-2.5 rounded-full bg-white pr-2 pl-4 text-sm font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#4f33b8]', filtersOpen && 'text-[#4f33b8]')} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-haspopup="true">
              <Filter className="h-4 w-4" />
              Filtros
              <span className="inline-flex items-center rounded-full bg-[#f6f3ff] px-3 py-1 text-[12.5px] font-semibold text-[#4f33b8]">{statusFilter === 'todos' ? 'Todos' : STATUS[statusFilter].label}</span>
              <ChevronDown className={cn('h-4 w-4 text-[#8a85a0] transition-transform', filtersOpen && 'rotate-180')} />
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 z-20 mt-2.5 flex w-[236px] flex-col gap-2 rounded-[22px] bg-white p-2.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4]">
                {STATUS_FILTERS.map((item) => {
                  const count = item.id === 'todos' ? items.length : items.filter((entry) => entry.status === item.id).length;
                  const on = statusFilter === item.id;
                  return (
                    <button key={item.id} type="button" className={cn('flex h-10 items-center gap-2.5 rounded-full bg-white pr-2 pl-4 text-[13.5px] font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff] hover:bg-[#f6f3ff] hover:text-[#4f33b8]', on && 'bg-[#f6f3ff] text-[#4f33b8] shadow-[0_0_0_1.5px_#7c5cf5]')} onClick={() => { setStatusFilter(item.id); setFiltersOpen(false); }}>
                      <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.dot }} />
                      {item.label}
                      <em className={cn('ml-auto grid h-6 min-w-6 place-items-center rounded-xl bg-[#f6f5fa] px-1.5 text-[11.5px] not-italic text-[#8a85a0]', on && 'bg-[#6644e0] text-white')}>{count}</em>
                    </button>
                  );
                })}
                {gestao ? (
                  <>
                    <label className="mt-1 block text-[12px] font-medium text-[#6B5A7A]">
                      Colaborador
                      <input className="mt-1 h-9 w-full rounded-lg border border-[#EFE6F4] bg-white px-2 text-[13px]" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)} placeholder="Nome do autor" />
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
                <button type="button" className="mt-1 text-[12px] font-medium text-[#6644e0]" onClick={clearFilters}>Limpar filtros</button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-[18px] px-[3px]">
          {loading ? <p className="rounded-2xl border border-[#EFE6F4] bg-white px-4 py-8 text-center text-sm text-[#8A7C98]">Carregando sugestões...</p> : null}
          {failed ? <p className="rounded-2xl border border-[#F8D0E3] bg-white px-4 py-8 text-center text-sm text-[#9D174D]">Não foi possível carregar as sugestões.</p> : null}
          {!loading && !failed && filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#EFE6F4] bg-white px-4 py-10 text-center">
              <p className="text-sm text-[#8A7C98]">{items.length === 0 ? 'Nenhuma sugestão ainda.' : 'Nenhuma sugestão encontrada para esta busca.'}</p>
              {items.length === 0 ? (
                <Button className="mt-4 rounded-full" onClick={() => setComposer(true)}>Criar a primeira sugestão</Button>
              ) : (
                <button type="button" className="mt-3 text-sm font-medium text-[#4600F3]" onClick={clearFilters}>Limpar pesquisa</button>
              )}
            </div>
          ) : null}
          {!loading && !failed ? filtered.map((item) => {
            const name = item.anonymous ? 'Anônimo' : item.authorName || 'Colaborador';
            const open = openId === item.id;
            const count = item.replies?.length ?? 0;
            const draft = drafts[item.id] ?? '';
            return (
              <article key={item.id} className="rounded-[22px] bg-white px-5 py-4 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4] transition-transform hover:-translate-y-0.5">
                <div className="flex items-start gap-3.5">
                  <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#ece6ff] text-xs font-bold text-[#4f33b8]">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold break-words text-[#1f1b2e]">{item.title || item.message}</h3>
                    <p className="mt-1 text-[13px] leading-[1.45] break-words whitespace-pre-wrap text-[#5f5a78]">{item.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-2">
                      <span className="text-[12.5px] text-[#8a85a0]"><b className="mr-2 font-semibold text-[#4a4560]">{name}</b>{whenLabel(item.createdAt)}</span>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                        <div className="relative">
                          {gestao ? (
                            <button
                              type="button"
                              className={cn('inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]', savingStatus === item.id && 'opacity-60')}
                              style={{ color: STATUS[item.status].dot }}
                              onClick={() => setStatusMenu(statusMenu === item.id ? null : item.id)}
                              disabled={savingStatus === item.id}
                              aria-label={`Alterar status de ${item.title || 'sugestão'}`}
                            >
                              <i className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[item.status].dot }} />
                              {STATUS[item.status].label}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]" style={{ color: STATUS[item.status].dot }}>
                              <i className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[item.status].dot }} />
                              {STATUS[item.status].label}
                            </span>
                          )}
                          {statusMenu === item.id ? (
                            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-[#e8e4f4] bg-white p-1 shadow-lg">
                              {(Object.keys(STATUS) as SuggestionStatus[]).map((status) => (
                                <button key={status} type="button" className={cn('block w-full rounded-lg px-2 py-1.5 text-left text-[12px]', status === item.status ? 'bg-[#f6f3ff] font-medium text-[#4f33b8]' : 'hover:bg-[#f6f3ff]')} onClick={() => void changeStatus(item, status)}>
                                  {STATUS[status].label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <button type="button" className="rounded-[9px] px-2.5 py-1.5 text-[13px] font-semibold text-[#6644e0] hover:bg-[#f6f3ff]" onClick={() => openReply(item.id)}>Responder</button>
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8a85a0]">
                          <MessageSquare className="h-3.5 w-3.5" /> {replyLabel(count)}
                        </span>
                        <button type="button" aria-label={open ? 'Fechar' : 'Abrir'} onClick={() => { setOpenId(open ? null : item.id); setStatusMenu(null); }} className="grid h-[30px] w-[30px] place-items-center rounded-full text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">
                          <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
                        </button>
                      </div>
                    </div>
                    {open ? (
                      <div className="mt-3.5 border-t border-[#e8e4f4] pt-3.5">
                        {(item.replies ?? []).map((reply) => {
                          const replyName = reply.authorName || 'Anônimo';
                          return (
                            <div key={reply.id} className="mb-2.5 flex gap-2.5 text-[13px] leading-[1.45] break-words whitespace-pre-wrap text-[#4a4560]">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[10px] font-bold text-[#4f33b8]">{initials(replyName)}</span>
                              <div className="min-w-0">
                                <b className="block text-xs font-semibold text-[#8a85a0]">{replyName} <span className="font-normal">{whenLabel(reply.createdAt)}</span></b>
                                {reply.text}
                              </div>
                            </div>
                          );
                        })}
                        <textarea
                          id={`resposta-${item.id}`}
                          value={draft}
                          maxLength={10000}
                          onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value.slice(0, 10000) }))}
                          onKeyDown={(event) => onReplyKey(event, item)}
                          placeholder="Escreva sua resposta…"
                          aria-label={`Resposta para ${item.title || 'sugestão'}`}
                          className="grow-note short w-full overflow-y-auto rounded-[14px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 py-[11px] text-sm text-[#1f1b2e] outline-none focus:border-[#9b82ff] focus:bg-white"
                        />
                        <ComposerExtras onEmoji={(emoji) => setDrafts((current) => ({ ...current, [item.id]: `${current[item.id] ?? ''}${emoji}` }))} />
                        <div className="mt-3 flex justify-end">
                          <Button type="button" disabled={!draft.trim() || sending === item.id} onClick={() => void sendReply(item)}>
                            {sending === item.id ? 'Enviando...' : 'Enviar resposta'}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
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
