import { Heart, Trash2 } from 'lucide-react';
import { type FC, type FormEvent } from 'react';
import type { SocialComment } from './types';

export const Comments: FC<{
  inputId: string;
  comments: SocialComment[];
  draft: string;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  onLike: (commentId: string) => void;
  canDelete?: (commentId: string) => boolean;
  onDelete?: (commentId: string) => void;
}> = ({ inputId, comments, draft, onDraft, onSubmit, onLike, canDelete, onDelete }) => {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p> : null}
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <img src={comment.avatar} alt="" className="h-8 w-8 rounded-full bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5">
                <span className="font-semibold">{comment.author}</span> {comment.body}
              </p>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{comment.time}</span>
                <button type="button" onClick={() => onLike(comment.id)} className={comment.liked ? 'inline-flex items-center gap-1 font-medium text-primary' : 'inline-flex items-center gap-1 hover:text-foreground'}>
                  <Heart className="h-3.5 w-3.5" fill={comment.liked ? 'currentColor' : 'none'} />
                  {comment.likes}
                </button>
                {canDelete?.(comment.id) ? (
                  <button type="button" onClick={() => onDelete?.(comment.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-center gap-2">
        <label className="sr-only" htmlFor={inputId}>Comentário</label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          placeholder="Escreva um comentário..."
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-muted/40 px-4 text-sm outline-none focus-visible:border-primary"
        />
        <button type="submit" className="text-sm font-semibold text-primary">Publicar</button>
      </form>
    </div>
  );
};
