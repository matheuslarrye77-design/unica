import { PageFrame } from '@/components/shell/PageFrame';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { isLeader, loadFeedback, updateFeedbackStatus, type FeedbackItem } from '@/lib/institution';
import { actor } from '@/lib/session';
import { useEffect, useState, type FC } from 'react';

const destinationLabel = { lideranca: 'Liderança', plataforma: 'Plataforma' };
const typeLabel = { feedback: 'Feedback', sugestao: 'Sugestão de melhoria' };
const statusLabel = { novo: 'Novo', analise: 'Em análise', resolvido: 'Resolvido' };

export const FeedbacksPage: FC = () => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<'todos' | FeedbackItem['destination']>('todos');
  const [type, setType] = useState<'todos' | FeedbackItem['type']>('todos');
  const [status, setStatus] = useState<'todos' | FeedbackItem['status']>('todos');
  const allowed = isLeader(actor());

  useEffect(() => {
    if (!allowed) return;
    void loadFeedback().then((result) => setItems(result.feedback)).catch(() => setItems([]));
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <p className="px-6 py-10 text-sm text-muted-foreground">Esta área é restrita à liderança.</p>
      </div>
    );
  }

  const text = query.trim().toLowerCase();
  const visible = items.filter((item) => {
    const haystack = `${item.message} ${item.authorName ?? ''}`.toLowerCase();
    return (destination === 'todos' || item.destination === destination)
      && (type === 'todos' || item.type === type)
      && (status === 'todos' || item.status === status)
      && (!text || haystack.includes(text));
  });
  const openCount = items.filter((item) => item.status !== 'resolvido').length;

  async function mark(id: string, next: FeedbackItem['status']) {
    const result = await updateFeedbackStatus(id, next);
    setItems((current) => current.map((item) => item.id === id ? result.feedback : item));
  }

  return (
    <PageFrame rail={
      <section className="shrink-0 rounded-2xl border bg-card p-3">
        <h2 className="px-1 text-sm font-semibold">Em aberto</h2>
        <p className="px-1 py-2 text-sm text-muted-foreground">{openCount === 0 ? 'Nenhum feedback em aberto.' : `${openCount} em aberto`}</p>
      </section>
    }>
      <h1 className="text-2xl font-semibold tracking-tight">Feedbacks</h1>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar feedbacks" className="sm:max-w-xs" />
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="todos">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="analise">Em análise</option>
          <option value="resolvido">Resolvido</option>
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={destination} onChange={(event) => setDestination(event.target.value as typeof destination)}>
          <option value="todos">Todos os destinos</option>
          <option value="lideranca">Liderança</option>
          <option value="plataforma">Plataforma</option>
        </select>
        <select className="h-9 rounded-md border bg-background px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
          <option value="todos">Todos os tipos</option>
          <option value="feedback">Feedback</option>
          <option value="sugestao">Sugestão de melhoria</option>
        </select>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum feedback encontrado.</p> : visible.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-3 p-4 text-sm">
              <p className="whitespace-pre-wrap leading-6">{item.message}</p>
              <p className="text-muted-foreground">
                {typeLabel[item.type]} · {destinationLabel[item.destination]} · {new Date(item.createdAt).toLocaleString('pt-BR')} · {statusLabel[item.status]}
              </p>
              <p>{item.anonymous || !item.authorName ? 'Anônimo' : item.authorName}</p>
              <div className="flex flex-wrap gap-2">
                {(['novo', 'analise', 'resolvido'] as const).map((next) => (
                  <Button key={next} size="sm" variant={item.status === next ? 'default' : 'outline'} onClick={() => void mark(item.id, next)}>{statusLabel[next]}</Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageFrame>
  );
};
