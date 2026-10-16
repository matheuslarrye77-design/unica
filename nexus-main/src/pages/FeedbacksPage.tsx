import { FeedbackDialog } from '@/components/FeedbackDialog';
import { PageFrame } from '@/components/shell/PageFrame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isLeader, type FeedbackItem } from '@/lib/institution';
import { actor } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Calendar, Check, ChevronDown, ChevronRight, Clock, Eye, Heart, Lightbulb, Lock, Mail, MessageSquare, Plus, Search, Send, Trash2, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';

type Destination = 'gestao' | 'suporte';
type Status = 'recebido' | 'analise' | 'resolvido';

type Reply = { id: string; author: string; text: string; when: string };

type Item = {
  id: string;
  title: string;
  body: string;
  destination: Destination;
  status: Status;
  anonymous: boolean;
  authorName: string;
  authorId: string | null;
  avatar?: string;
  when: string;
  replies: Reply[];
};

const DEST: Record<Destination, string> = {
  gestao: 'Gestão',
  suporte: 'Suporte da plataforma',
};

const STATUS: Record<Status, { label: string; icon: typeof Clock }> = {
  analise: { label: 'Em análise', icon: Clock },
  recebido: { label: 'Recebido', icon: Mail },
  resolvido: { label: 'Resolvido', icon: Check },
};

const BOARD: Item[] = [
  {
    id: 'fb-docs',
    title: 'Dificuldade para acessar os documentos',
    body: 'Ao abrir a área de documentos, a página demora para carregar e às vezes retorna ao início.',
    destination: 'suporte',
    status: 'analise',
    anonymous: true,
    authorName: 'Anônimo',
    authorId: null,
    when: 'Hoje, 14:32',
    replies: [
      { id: 'd1', author: 'Suporte da plataforma', text: 'Estamos acompanhando a lentidão na central de documentos.', when: 'Hoje, 15:05' },
      { id: 'd2', author: 'Equipe Única', text: 'Vamos avisar por aqui quando a página estabilizar.', when: 'Hoje, 15:40' },
    ],
  },
  {
    id: 'fb-comunicacao',
    title: 'Melhorar a comunicação entre equipes',
    body: 'Seria útil ter um resumo semanal das atividades e decisões da equipe.',
    destination: 'gestao',
    status: 'recebido',
    anonymous: false,
    authorName: 'Ana Ribeiro',
    authorId: 'ana',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaRibeiro',
    when: 'Ontem, 16:48',
    replies: [
      { id: 'c1', author: 'Gestão', text: 'Boa ideia. Vamos incluir o resumo na reunião de segunda.', when: 'Ontem, 18:10' },
    ],
  },
  {
    id: 'fb-chat',
    title: 'Atalho para abrir o chat',
    body: 'Adicionar um atalho para acessar conversas recentes com mais rapidez.',
    destination: 'suporte',
    status: 'resolvido',
    anonymous: false,
    authorName: 'Carlos Mendes',
    authorId: 'carlos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CarlosMendes',
    when: '12 out, 09:15',
    replies: [
      { id: 'h1', author: 'Suporte da plataforma', text: 'O atalho entrou na barra do mural.', when: '13 out, 11:20' },
      { id: 'h2', author: 'Carlos Mendes', text: 'Testei aqui e ficou bem mais rápido.', when: '13 out, 14:02' },
      { id: 'h3', author: 'Suporte da plataforma', text: 'Fechamos este pedido como resolvido.', when: '13 out, 14:18' },
    ],
  },
];

function ownExample(user: { id: string; name: string; avatar: string }): Item {
  return {
    id: 'fb-meu',
    title: 'Acesso aos documentos da equipe',
    body: 'Quando entro na central de documentos, alguns arquivos demoram para abrir e a lista volta para o topo.',
    destination: 'suporte',
    status: 'analise',
    anonymous: false,
    authorName: user.name,
    authorId: user.id,
    avatar: user.avatar,
    when: 'Hoje, 14:32',
    replies: [
      { id: 'm1', author: 'Suporte da plataforma', text: 'Recebemos o relato e já estamos olhando o carregamento da central.', when: 'Hoje, 15:10' },
      { id: 'm2', author: 'Equipe Única', text: 'Assim que a correção subir, avisamos por aqui.', when: 'Hoje, 16:02' },
    ],
  };
}

function fromApi(item: FeedbackItem, user: { id: string; name: string; avatar: string }): Item {
  const destination: Destination = item.destination === 'plataforma' ? 'suporte' : 'gestao';
  const status: Status = item.status === 'analise' ? 'analise' : item.status === 'resolvido' ? 'resolvido' : 'recebido';
  return {
    id: item.id,
    title: item.message.split('\n')[0].slice(0, 72),
    body: item.message,
    destination,
    status,
    anonymous: item.anonymous,
    authorName: item.anonymous ? 'Anônimo' : user.name,
    authorId: item.anonymous ? null : user.id,
    avatar: item.anonymous ? undefined : user.avatar,
    when: 'Agora',
    replies: [],
  };
}

const HowItWorks: FC = () => (
  <div className="grid min-w-0 gap-3">
    <section className="rounded-[22px] border border-[#F0E7F6] bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#2C2433]">
        <Lightbulb className="h-4 w-4 text-[#8E35B8]" /> Como funciona
      </h2>
      <ol className="mt-4 grid gap-3">
        <li className="flex gap-3 text-[13px] leading-snug text-[#5C5168]">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F3E4FA] text-[12px] font-semibold text-[#8E35B8]">1</span>
          Escolha Gestão ou Suporte da plataforma.
        </li>
        <li className="flex gap-3 text-[13px] leading-snug text-[#5C5168]">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F3E4FA] text-[12px] font-semibold text-[#8E35B8]">2</span>
          Você pode enviar anônimo ou mostrar seu nome.
        </li>
      </ol>
    </section>
    <section className="rounded-[22px] bg-gradient-to-r from-[#F8EAFB] to-[#F3DDF8] p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-[#8E35B8]"><Heart className="h-4 w-4" /></span>
        <div>
          <p className="text-[14px] font-semibold text-[#6A228C]">Seu feedback faz a diferença!</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#8A5AA0]">Juntos construímos uma experiência melhor.</p>
        </div>
      </div>
    </section>
  </div>
);

export const FeedbacksPage: FC = () => {
  const me = actor();
  const leader = isLeader(me);
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<'todos' | Destination>('todos');
  const [status, setStatus] = useState<'todos' | Status>('todos');
  const [scope, setScope] = useState<'todos' | 'meus'>('todos');
  const [preview, setPreview] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [created, setCreated] = useState<Item[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const collaborator = preview || !leader;

  useEffect(() => {
    function onCreated(event: Event) {
      const detail = (event as CustomEvent<FeedbackItem>).detail;
      if (!detail?.id) return;
      setCreated((current) => [fromApi(detail, me), ...current.filter((item) => item.id !== detail.id)]);
    }
    window.addEventListener('unica-feedback-created', onCreated);
    return () => window.removeEventListener('unica-feedback-created', onCreated);
  }, [me.id, me.name, me.avatar]);

  const mine = useMemo(() => [ownExample(me), ...created].filter((item) => !removed.includes(item.id)), [created, me, removed]);
  const board = BOARD.filter((item) => !removed.includes(item.id));
  const source = collaborator || scope === 'meus' ? mine : [...created, ...board];
  const text = query.trim().toLowerCase();
  const visible = source.filter((item) => {
    const haystack = `${item.title} ${item.body} ${item.authorName}`.toLowerCase();
    return (destination === 'todos' || item.destination === destination)
      && (status === 'todos' || item.status === status)
      && (!text || haystack.includes(text));
  });
  const showPhotoStats = leader && !collaborator && scope === 'todos' && destination === 'todos' && status === 'todos' && !text;
  const stats = showPhotoStats
    ? [
      { label: 'Total recebidos', value: '24', icon: MessageSquare },
      { label: 'Em análise', value: '08', icon: Clock },
      { label: 'Resolvidos', value: '16', icon: Check },
    ]
    : [
      { label: 'Total recebidos', value: String(source.length).padStart(2, '0'), icon: MessageSquare },
      { label: 'Em análise', value: String(source.filter((item) => item.status === 'analise').length).padStart(2, '0'), icon: Clock },
      { label: 'Resolvidos', value: String(source.filter((item) => item.status === 'resolvido').length).padStart(2, '0'), icon: Check },
    ];

  return (
    <PageFrame rail={<HowItWorks />}>
      <div>
        {collaborator && leader ? (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F3E4FA] px-3 py-1 text-[12px] font-medium text-[#6A228C]">
            <Eye className="h-3.5 w-3.5" /> Visão do colaborador
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-[#241B33]">Feedbacks</h1>
              <p className="mt-0.5 text-[13.5px] text-[#8A7C98]">Ouça, acompanhe e transforme sugestões em melhorias.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {leader ? (
              <button
                type="button"
                aria-pressed={preview}
                aria-label={preview ? 'Voltar à visão da gestão' : 'Ver como o colaborador vê'}
                onClick={() => setPreview((value) => !value)}
                className={cn('grid h-10 w-10 place-items-center rounded-full text-white', preview ? 'bg-[#6A228C]' : 'bg-[#8E35B8] hover:bg-[#7A2CA0]')}
              >
                <Eye className="h-4 w-4" />
              </button>
            ) : null}
            <Button className="h-10 rounded-full bg-[#8E35B8] px-4 hover:bg-[#7A2CA0]" onClick={() => setComposer(true)}>
              <Plus className="h-4 w-4" /> Novo feedback
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <section key={stat.label} className="flex items-center gap-3 rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><Icon className="h-5 w-5" /></span>
                <span>
                  <span className="block text-[12.5px] text-[#8A7C98]">{stat.label}</span>
                  <span className="block text-[28px] font-semibold leading-none text-[#2C2433]">{stat.value}</span>
                </span>
              </section>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#B7A8C4]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar feedback..." className="h-10 rounded-full border-[#E7DFF0] bg-white pl-9" />
          </div>
          <select aria-label="Destino" className="h-10 rounded-full border border-[#E7DFF0] bg-white px-3 text-[13px] text-[#5C5168]" value={destination} onChange={(event) => setDestination(event.target.value as typeof destination)}>
            <option value="todos">Todos os destinos</option>
            <option value="gestao">Gestão</option>
            <option value="suporte">Suporte da plataforma</option>
          </select>
          <select aria-label="Status" className="h-10 rounded-full border border-[#E7DFF0] bg-white px-3 text-[13px] text-[#5C5168]" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="todos">Todos os status</option>
            <option value="recebido">Recebido</option>
            <option value="analise">Em análise</option>
            <option value="resolvido">Resolvido</option>
          </select>
          {collaborator ? null : (
            <div className="flex rounded-full bg-white p-1 shadow-[0_4px_14px_rgba(80,40,120,0.05)]">
              <button type="button" onClick={() => setScope('todos')} className={cn('rounded-full px-3 py-1.5 text-[13px] font-medium', scope === 'todos' ? 'bg-[#8E35B8] text-white' : 'text-[#8A7C98]')}>Todos</button>
              <button type="button" onClick={() => setScope('meus')} className={cn('rounded-full px-3 py-1.5 text-[13px] font-medium', scope === 'meus' ? 'bg-[#8E35B8] text-white' : 'text-[#8A7C98]')}>Meus feedbacks</button>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          {visible.length === 0 ? (
            <p className="rounded-[22px] border border-[#F0E7F6] bg-white px-4 py-10 text-center text-sm text-[#8A7C98]">
              {collaborator ? 'Você ainda não enviou feedbacks.' : 'Nenhum feedback encontrado.'}
            </p>
          ) : visible.map((item) => {
            const StatusIcon = STATUS[item.status].icon;
            const expanded = open === item.id;
            return (
              <article key={item.id} className="rounded-[22px] border border-[#F0E7F6] bg-white p-4 shadow-[0_8px_22px_rgba(80,40,120,0.04)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#F3E4FA] text-[#8E35B8]"><MessageSquare className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-[#2C2433]">{item.title}</h2>
                      <span className="rounded-full bg-[#F3E4FA] px-2 py-0.5 text-[11px] font-medium text-[#6A228C]">{DEST[item.destination]}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-[#8A7C98]"><StatusIcon className="h-3.5 w-3.5" /> {STATUS[item.status].label}</span>
                    </div>
                    <p className="mt-2 max-w-xl text-[13.5px] leading-snug text-[#5C5168]">{item.body}</p>
                    {expanded ? (
                      <div className="mt-3 grid gap-2 rounded-2xl bg-[#FBF7FC] p-3">
                        {item.replies.length === 0 ? <p className="text-[12.5px] text-[#8A7C98]">Ainda sem respostas.</p> : item.replies.map((reply) => (
                          <div key={reply.id}>
                            <p className="text-[12.5px] font-semibold text-[#2C2433]">{reply.author} <span className="font-normal text-[#8A7C98]">· {reply.when}</span></p>
                            <p className="text-[13px] text-[#5C5168]">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#8A7C98]">
                      {item.avatar ? <img src={item.avatar} alt="" className="h-6 w-6 rounded-full bg-[#F3E4FA]" /> : <span className="grid h-6 w-6 place-items-center rounded-full bg-[#F3E4FA] text-[#8E35B8]"><UserRound className="h-3.5 w-3.5" /></span>}
                      <span className="font-medium text-[#2C2433]">{item.authorName}</span>
                      <span className="inline-flex items-center gap-1">{item.anonymous ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {item.anonymous ? 'Anônimo' : 'Nome visível'}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {item.when}</span>
                      {collaborator ? (
                        <button type="button" className="ml-auto inline-flex items-center gap-1 font-medium text-[#E2186A]" onClick={() => { if (confirm('Excluir este feedback?')) setRemoved((current) => [...current, item.id]); }}>
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="inline-flex items-center gap-1 text-[12px] text-[#8A7C98]"><Send className="h-3.5 w-3.5 text-[#8E35B8]" /> Destino</p>
                    <p className="text-[13px] font-medium text-[#2C2433]">{DEST[item.destination]}</p>
                    <button type="button" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-[#8E35B8]" onClick={() => setOpen(expanded ? null : item.id)}>
                      <MessageSquare className="h-3.5 w-3.5" /> {item.replies.length} {item.replies.length === 1 ? 'resposta' : 'respostas'}
                    </button>
                    <button type="button" aria-label={expanded ? 'Recolher respostas' : 'Ver respostas'} className="mt-2 grid h-7 w-7 place-items-center rounded-full text-[#C4B6D4]" onClick={() => setOpen(expanded ? null : item.id)}>
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <FeedbackDialog open={composer} onOpenChange={setComposer} />
    </PageFrame>
  );
};
