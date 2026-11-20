import { type FC } from 'react';
import { FileText } from 'lucide-react';
import { JournalNewsCard } from './JournalNewsCard';
import { PollPost } from './PollPost';
import { ZoomImage } from './PhotoGallery';
import { ReadMore } from './ReadMore';
import { articleSummary, getJournalArticles, type JournalCategory } from '@/data/journal';
import type { SocialPost } from './types';

function asCategory(value?: string | null): JournalCategory | undefined {
  if (value === 'processos' || value === 'urgente' || value === 'social' || value === 'treinamentos') return value;
  return undefined;
}

function cleanCaption(value: string) {
  return value.replace(/legenda da publicação \(opcional\)/gi, '').trim();
}

function captionText(post: SocialPost, title: string, excerpt: string) {
  const labeled = [post.caption, post.comment].filter(Boolean).join('\n').trim();
  if (labeled && labeled !== title && labeled !== excerpt) return labeled;
  let body = (post.body || '').trim();
  if (!body || body === title || body === excerpt) return '';
  if (title && body.startsWith(title)) body = body.slice(title.length).replace(/^\s+/, '');
  if (excerpt && (body === excerpt || body.startsWith(excerpt))) body = body.slice(excerpt.length).replace(/^\s+/, '');
  return body === title || body === excerpt ? '' : body;
}

export const AnnouncementPost: FC<{ post: SocialPost; expandId?: string; onVote?: (optionId: string) => void }> = ({ post, expandId, onVote }) => {
  const href = post.journalHref || '/announcements';
  const article = post.journalHref
    ? getJournalArticles().find((item) => post.journalHref?.endsWith(`/${item.id}`))
    : undefined;
  const title = post.bannerTitle || article?.title || 'Notícia do jornal';
  const category = asCategory(post.journalCategory) || article?.category;
  const excerpt = post.journalExcerpt || (article ? articleSummary(article.content) : '');
  const caption = cleanCaption(captionText(post, title, excerpt));
  const decorative = new Set((post.blocks ?? []).flatMap((block) => (block.type === 'image' && block.display ? [block.url] : [])));
  const listed = post.images?.length ? post.images : post.image ? [post.image] : [];
  const extras = listed.filter((url) => !decorative.has(url) && url !== post.image);
  const stickers = (post.blocks ?? []).filter((block) => block.type === 'image' && block.display);
  const files = post.attachments?.length ? post.attachments : post.attachment ? [post.attachment] : [];
  const audios = files.filter((item) => item.type === 'audio');
  const docs = files.filter((item) => item.type !== 'audio');

  return (
    <div className="mt-3">
      {caption ? (
        <div className="mb-3">
          <ReadMore id={expandId ?? `${post.id}-legenda`} text={caption} className="text-[15px] leading-6 text-[#3C3148]" />
        </div>
      ) : null}
      {audios.map((item, index) => item.url ? <audio key={`audio-${index}`} src={item.url} controls className="mb-3 h-10 w-full" /> : null)}
      {stickers.length ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {stickers.map((block, index) => block.type === 'image' ? <ZoomImage key={`${block.url}-${index}`} src={block.url} alt={block.display === 'gif' ? 'GIF' : 'Figurinha'} className="h-24 w-24 rounded-xl bg-[#F5F1FF] object-contain" /> : null)}
        </div>
      ) : null}
      {extras.length ? (
        <div className={`mb-3 grid gap-2 ${extras.length > 1 ? 'grid-cols-2' : ''}`}>
          {extras.map((url) => <ZoomImage key={url} src={url} className="max-h-56 w-full rounded-xl object-cover" />)}
        </div>
      ) : null}
      {docs.map((item, index) => (
        <div key={`${item.url ?? item.name}-${index}`} className="mb-3">
          {item.type === 'video' && item.url ? <video src={item.url} controls preload="metadata" className="max-h-[420px] w-full rounded-xl bg-black" /> : null}
          {item.type === 'document' && item.url ? <a href={item.url} download={item.name} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"><FileText className="h-4 w-4 text-primary" />{item.name}</a> : null}
        </div>
      ))}
      {post.poll && post.poll.length > 0 && onVote ? <div className="mb-3"><PollPost post={post} onVote={onVote} optionsOnly expandId={`${post.id}-enquete`} /></div> : null}
      <JournalNewsCard title={title} category={category} excerpt={excerpt} href={href} />
    </div>
  );
};
