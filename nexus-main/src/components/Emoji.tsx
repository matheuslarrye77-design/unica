import { cn } from '@/lib/utils';
import { Fragment, useState, type FC, type ReactNode } from 'react';

const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*/gu;

export function emojiCode(value: string) {
  const stripped = value.includes('\u200D') ? value : value.replace(/\uFE0F/g, '');
  return [...stripped].map((char) => (char.codePointAt(0) ?? 0).toString(16)).join('-');
}

export const Emoji: FC<{ emoji: string; className?: string }> = ({ emoji, className }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={className}>{emoji}</span>;
  return (
    <img
      src={`/emoji/${emojiCode(emoji)}.svg`}
      alt={emoji}
      draggable={false}
      className={cn('inline-block h-[1.15em] w-[1.15em] align-[-0.15em]', className)}
      onError={() => setFailed(true)}
    />
  );
};

export function EmojiText({ text, className }: { text: string; className?: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(EMOJI)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(<Emoji key={`${index}-${match[0]}`} emoji={match[0]} className={className} />);
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
