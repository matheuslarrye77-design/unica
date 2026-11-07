import { AttachPhotos } from '@/components/social/AttachPhotos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { articleCover, articleSummary, categoryLabel, type JournalArticle } from '@/data/journal';
import { createFeedPost } from '@/lib/feed';
import { actor } from '@/lib/session';
import { Loader2 } from 'lucide-react';
import { type FC, useState } from 'react';
import { toast } from 'sonner';

export const JournalShareDialog: FC<{
  article: JournalArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;
}> = ({ article, open, onOpenChange, onShared }) => {
  const user = actor();
  const [caption, setCaption] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  function reset() {
    setCaption('');
    setComment('');
    setPhotos([]);
  }

  async function publish() {
    if (!article || sending) return;
    const cover = articleCover(article);
    const images = [...photos];
    if (cover && !images.includes(cover)) images.unshift(cover);
    setSending(true);
    try {
      await createFeedPost({
        body: caption.trim() || comment.trim() || articleSummary(article.content),
        kind: 'announcement',
        bannerTitle: article.title,
        journalHref: `/announcements/${article.id}`,
        images,
        image: images[0],
        caption: caption.trim() || undefined,
        comment: comment.trim() || undefined,
        journalCategory: article.category,
        journalExcerpt: articleSummary(article.content),
        nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      });
      toast.success('Notícia publicada no mural.');
      reset();
      onOpenChange(false);
      onShared?.();
    } catch {
      toast.error('Não foi possível publicar no mural.');
    } finally {
      setSending(false);
    }
  }

  if (!article) return null;
  const cover = articleCover(article);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!sending) onOpenChange(next); }}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Personalizar publicação no mural</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-[13px]">
          <div className="rounded-2xl border border-[#EDE4F5] bg-[#FBF8FC] p-3">
            <p className="text-[11px] font-semibold tracking-wide text-[#8E35B8]">{categoryLabel(article.category)}</p>
            <p className="mt-1 text-[15px] font-semibold text-[#241B33]">{article.title}</p>
            <p className="mt-1 line-clamp-3 text-[12.5px] text-[#8A7C98]">{articleSummary(article.content)}</p>
          </div>
          <label className="grid gap-1">
            Legenda
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={2} placeholder="Opcional" className="w-full resize-none rounded-xl border border-[#E7DFF0] bg-white px-3 py-2 outline-none focus-visible:border-[#C084E0]" />
          </label>
          <label className="grid gap-1">
            Comentário complementar
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Opcional" className="w-full resize-none rounded-xl border border-[#E7DFF0] bg-white px-3 py-2 outline-none focus-visible:border-[#C084E0]" />
          </label>
          <AttachPhotos urls={photos} onChange={setPhotos} />
          <div className="rounded-2xl border border-[#EDE4F5] bg-white p-3">
            <p className="text-[11px] font-semibold tracking-wide text-[#8A7C98]">Prévia</p>
            <p className="mt-1 text-[14px] font-semibold text-[#241B33]">{article.title}</p>
            <p className="text-[12px] text-[#8E35B8]">{categoryLabel(article.category)}</p>
            {cover || photos[0] ? <img src={photos[0] || cover} alt="" className="mt-2 max-h-36 w-full rounded-xl object-cover" /> : null}
            <p className="mt-2 line-clamp-3 text-[12.5px] text-[#5C5168]">{articleSummary(article.content)}</p>
            {caption.trim() ? <p className="mt-2 text-[13px] text-[#241B33]">{caption.trim()}</p> : null}
            {comment.trim() ? <p className="mt-1 text-[12.5px] text-[#8A7C98]">{comment.trim()}</p> : null}
            <p className="mt-2 text-[11px] text-[#8A7C98]">{user.name} · agora</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={sending} onClick={() => onOpenChange(false)} className="h-10 rounded-full px-4 text-[13px] font-medium text-[#6A228C] hover:bg-[#F3E4FA]">Cancelar</button>
            <button type="button" disabled={sending} onClick={() => void publish()} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8E35B8] px-4 text-[13px] font-semibold text-white hover:bg-[#7A2CA0] disabled:opacity-60">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publicar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
