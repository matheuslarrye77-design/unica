import { EmojiText } from '@/components/Emoji';
import { Heart, Trash2, X } from 'lucide-react';
import { useRef, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { ComposerExtras } from './ComposerExtras';
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
  pendingMedia?: { kind: 'gif' | 'sticker'; url: string } | null;
  onMedia?: (media: { kind: 'gif' | 'sticker'; url: string } | null) => void;
  onGifFile?: (file: File) => void;
}> = ({ inputId, comments, draft, onDraft, onSubmit, onLike, canDelete, onDelete, pendingMedia, onMedia }) => {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  function insertEmoji(emoji: string) {
    const field = fieldRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    onDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => field?.focus());
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
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
                <span className="font-semibold">{comment.author}</span> {comment.body ? <EmojiText text={comment.body} /> : null}
              </p>
              {comment.media ? <img src={comment.media.url} alt={comment.media.kind === 'gif' ? 'GIF' : 'Figurinha'} className="mt-1 h-28 w-28 rounded-xl bg-[#F8EAFB] object-contain" /> : null}
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
      <form onSubmit={submit} className="space-y-2">
        {pendingMedia ? (
          <div className="relative inline-block">
            <img src={pendingMedia.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <button type="button" aria-label="Remover anexo" className="absolute -right-1 -top-1 rounded-full bg-card p-0.5" onClick={() => onMedia?.(null)}><X className="h-3 w-3" /></button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={inputId}>Comentário</label>
          <textarea
            ref={fieldRef}
            id={inputId}
            value={draft}
            rows={1}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={onKey}
            placeholder="Escreva um comentário..."
            className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2 text-sm outline-none focus-visible:border-primary"
          />
          <button type="submit" disabled={!draft.trim() && !pendingMedia} className="h-10 text-sm font-semibold text-primary disabled:opacity-40">Publicar</button>
        </div>
        <ComposerExtras onEmoji={insertEmoji} onSticker={(url) => onMedia?.({ kind: 'sticker', url })} onGif={(url) => onMedia?.({ kind: 'gif', url })} />
      </form>
    </div>
  );
};
