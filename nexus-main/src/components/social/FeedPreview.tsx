import { useState, type FC } from 'react';
import { toast } from 'sonner';
import { PostCard } from './PostCard';
import type { SocialPost } from './types';

const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

const initialPreview: SocialPost[] = [
  {
    id: 'previa-reconhecimento',
    kind: 'recognition',
    author: 'Jéssica Almeida',
    role: 'Coordenadora',
    department: 'Reconhecimento',
    avatar: avatar('JessicaAlmeida'),
    time: 'há 2 horas',
    bannerTitle: 'Reconhecimento especial para o Matheus!',
    body: 'Quero parabenizar o Matheus pelo comprometimento e pela dedicação no atendimento aos nossos alunos. Seu trabalho faz toda a diferença no dia a dia da instituição.\nObrigado por ser essa pessoa incrível! 💜',
    tag: 'Reconhecimento',
    likes: 15,
    liked: false,
    shares: 0,
    shared: false,
    commentsOpen: false,
    comments: [
      { id: 'previa-c1', author: 'Ana Souza', avatar: avatar('AnaSouza'), body: 'Merecido.', time: 'há 1 hora', likes: 1, liked: false },
      { id: 'previa-c2', author: 'João Pereira', avatar: avatar('JoaoPereira'), body: 'Concordo.', time: 'há 1 hora', likes: 0, liked: false },
      { id: 'previa-c3', author: 'Caio Mendes', avatar: avatar('Caio'), body: 'Parabéns.', time: 'há 40 min', likes: 0, liked: false },
      { id: 'previa-c4', author: 'Marina Costa', avatar: avatar('Marina'), body: 'Muito bom.', time: 'há 20 min', likes: 0, liked: false },
    ],
  },
  {
    id: 'previa-jornal',
    kind: 'announcement',
    author: 'Ana Souza',
    role: 'Comunicação',
    department: 'Jornal',
    avatar: avatar('AnaSouza'),
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
];

export const FeedPreview: FC = () => {
  const [posts, setPosts] = useState(initialPreview);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function patch(id: string, update: (post: SocialPost) => SocialPost) {
    setPosts((current) => current.map((post) => (post.id === id ? update(post) : post)));
  }

  return (
    <section aria-label="Prévia visual do mural" className="flex flex-col gap-3">
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
