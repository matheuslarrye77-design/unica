import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isLeader, loadFeedback, updateFeedbackStatus, type FeedbackItem } from '@/lib/institution';
import { currentUser } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useEffect, useState, type FC } from 'react';

const destinationLabel = { lideranca: 'Liderança', plataforma: 'Plataforma' };
const typeLabel = { feedback: 'Feedback', sugestao: 'Sugestão de melhoria' };
const statusLabel = { novo: 'Novo', analise: 'Em análise', resolvido: 'Resolvido' };

export const FeedbacksPage: FC = () => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [destination, setDestination] = useState<'todos' | FeedbackItem['destination']>('todos');
  const [type, setType] = useState<'todos' | FeedbackItem['type']>('todos');
  const [status, setStatus] = useState<'todos' | FeedbackItem['status']>('todos');
  const allowed = isLeader(currentUser);

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

  const visible = items.filter((item) => {
    return (destination === 'todos' || item.destination === destination)
      && (type === 'todos' || item.type === type)
      && (status === 'todos' || item.status === status);
  });

  async function mark(id: string, next: FeedbackItem['status']) {
    const result = await updateFeedbackStatus(id, next);
    setItems((current) => current.map((item) => item.id === id ? result.feedback : item));
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Feedbacks</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['todos', 'lideranca', 'plataforma'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setDestination(item)} className={cn('rounded-full border px-3 py-1.5 text-sm', destination === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
              {item === 'todos' ? 'Todos os destinos' : destinationLabel[item]}
            </button>
          ))}
          {(['todos', 'feedback', 'sugestao'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setType(item)} className={cn('rounded-full border px-3 py-1.5 text-sm', type === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
              {item === 'todos' ? 'Todos os tipos' : typeLabel[item]}
            </button>
          ))}
          {(['todos', 'novo', 'analise', 'resolvido'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} className={cn('rounded-full border px-3 py-1.5 text-sm', status === item ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
              {item === 'todos' ? 'Todos os status' : statusLabel[item]}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {visible.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum feedback encontrado.</p> : visible.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-4 text-sm">
                <p className="leading-6 whitespace-pre-wrap">{item.message}</p>
                <p className="text-muted-foreground">
                  {typeLabel[item.type]} · {item.destination === 'lideranca' ? 'Feedback para Liderança' : 'Feedback para Plataforma'} · {new Date(item.createdAt).toLocaleString('pt-BR')} · {statusLabel[item.status]}
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
      </div>
    </div>
  );
};
