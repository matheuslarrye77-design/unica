import { useState, type FC } from 'react';
import { toast } from 'sonner';
import { PostCard } from './PostCard';
import type { SocialPost } from './types';

const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

const initialPreview: SocialPost[] = [
  {
    id: 'previa-reconhecimento',
    kind: 'recognition',
    author: 'Helena Duarte',
    role: 'Coordenadora',
    department: 'Reconhecimento',
    avatar: avatar('Helena'),
    time: 'há 2 horas',
    bannerTitle: 'Reconhecimento especial para um colaborador',
    body: 'Obrigado pelo cuidado com os alunos e pela dedicação que faz diferença no dia a dia da equipe.',
    tag: 'Reconhecimento',
    likes: 15,
    liked: false,
    shares: 1,
    shared: false,
    commentsOpen: false,
    comments: [
      {
        id: 'previa-c1',
        author: 'Ana Santos',
        avatar: avatar('Ana'),
        body: 'Merecido. A equipe sente essa diferença.',
        time: 'há 1 hora',
        likes: 2,
        liked: false,
      },
    ],
  },
  {
    id: 'previa-jornal',
    kind: 'announcement',
    author: 'Ana Santos',
    role: 'Designer',
    department: 'Jornal',
    avatar: avatar('Ana'),
    time: 'há 4 horas',
    bannerTitle: 'Pesquisa de clima 2026',
    body: 'A pesquisa deste ano já está aberta. Reserve alguns minutos para contar como tem sido a rotina.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
    likes: 8,
    liked: false,
    shares: 0,
    shared: false,
    commentsOpen: false,
    comments: [],
  },
  {
    id: 'previa-social',
    kind: 'text',
    author: 'Matheus Larrie',
    role: 'Colaborador',
    department: 'Equipe',
    avatar: avatar('Matheus'),
    time: 'há 5 horas',
    body: 'A equipe fechou a semana com a campanha de matrícula no ar. Foi bom ver cada área puxando um pedaço.',
    likes: 6,
    liked: false,
    shares: 0,
    shared: false,
    commentsOpen: false,
    comments: [],
  },
];

export const FeedPreview: FC = () => {
  const [posts, setPosts] = useState(initialPreview);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function patch(id: string, update: (post: SocialPost) => SocialPost) {
    setPosts((current) => current.map((post) => (post.id === id ? update(post) : post)));
  }

  return (
    <section aria-label="Prévia visual do mural" className="flex flex-col gap-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#55309D]">Prévia visual · não salva no mural</p>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          preview
          post={post}
          commentDraft={drafts[post.id] ?? ''}
          onCommentDraft={(value) => setDrafts((current) => ({ ...current, [post.id]: value }))}
          onLike={() => patch(post.id, (item) => ({ ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) }))}
          onShare={() => toast('Prévia: esta publicação não entra no mural.')}
          onToggleComments={() => patch(post.id, (item) => ({ ...item, commentsOpen: !item.commentsOpen }))}
          onAddComment={() => {
            const text = (drafts[post.id] ?? '').trim();
            if (!text) return;
            patch(post.id, (item) => ({
              ...item,
              commentsOpen: true,
              comments: [...item.comments, { id: `previa-${Date.now()}`, author: 'Você', avatar: avatar('Matheus'), body: text, time: 'agora', likes: 0, liked: false }],
            }));
            setDrafts((current) => ({ ...current, [post.id]: '' }));
          }}
          onLikeComment={() => undefined}
          onVote={() => undefined}
          onRepublish={() => toast('Prévia: republicar não grava esta publicação.')}
        />
      ))}
    </section>
  );
};
