import { EmojiText } from '@/components/Emoji';
import { Heart, ImagePlus, Sticker, Trash2, X } from 'lucide-react';
import { useRef, useState, type FC, type FormEvent } from 'react';
import type { SocialComment } from './types';

const STICKERS = ['coracao', 'estrela', 'joinha', 'festa'].map((name) => `/figurinhas/${name}.svg`);

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
}> = ({ inputId, comments, draft, onDraft, onSubmit, onLike, canDelete, onDelete, pendingMedia, onMedia, onGifFile }) => {
  const gifRef = useRef<HTMLInputElement>(null);
  const [stickers, setStickers] = useState(false);
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
                <span className="font-semibold">{comment.author}</span> {comment.body ? <EmojiText text={comment.body} /> : null}
              </p>
              {comment.media ? <img src={comment.media.url} alt="" className="mt-1 h-24 w-24 rounded-xl object-cover" /> : null}
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
        {stickers ? (
          <div className="flex gap-2">
            {STICKERS.map((src) => (
              <button key={src} type="button" onClick={() => { onMedia?.({ kind: 'sticker', url: src }); setStickers(false); }}>
                <img src={src} alt="" className="h-12 w-12 rounded-xl" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={inputId}>Comentário</label>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            placeholder="Escreva um comentário..."
            className="h-10 min-w-0 flex-1 rounded-full border border-border bg-muted/40 px-4 text-sm outline-none focus-visible:border-primary"
          />
          <input ref={gifRef} type="file" accept="image/gif,image/webp,image/png" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onGifFile?.(file); }} />
          <button type="button" aria-label="Enviar GIF" className="text-muted-foreground hover:text-foreground" onClick={() => gifRef.current?.click()}><ImagePlus className="h-4 w-4" /></button>
          <button type="button" aria-label="Figurinhas" className="text-muted-foreground hover:text-foreground" onClick={() => setStickers((open) => !open)}><Sticker className="h-4 w-4" /></button>
          <button type="submit" disabled={!draft.trim() && !pendingMedia} className="text-sm font-semibold text-primary disabled:opacity-40">Publicar</button>
        </div>
      </form>
    </div>
  );
};
