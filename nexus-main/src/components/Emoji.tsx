import { cn } from '@/lib/utils';
import { Fragment, useState, type FC, type ReactNode } from 'react';

const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*/gu;

export function emojiCode(value: string) {
  const stripped = value.includes('\u200D') ? value : value.replace(/\uFE0F/g, '');
  return [...stripped].map((char) => (char.codePointAt(0) ?? 0).toString(16)).join('-');
}

function emojiSources(emoji: string) {
  const raw = [...emoji].map((char) => (char.codePointAt(0) ?? 0).toString(16)).join('-');
  const plain = emojiCode(emoji);
  const codes = [...new Set([plain, raw, plain.replace(/-fe0f/g, '')])];
  const hosts = [
    (code: string) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`,
    (code: string) => `https://unpkg.com/twemoji@14.0.2/assets/svg/${code}.svg`,
  ];
  return hosts.flatMap((host) => codes.map(host));
}

export const Emoji: FC<{ emoji: string; className?: string }> = ({ emoji, className }) => {
  const sources = emojiSources(emoji);
  const [index, setIndex] = useState(0);
  if (index >= sources.length) return <span className={className}>{emoji}</span>;
  return (
    <img
      src={sources[index]}
      alt={emoji}
      draggable={false}
      className={cn('inline-block h-[1.15em] w-[1.15em] align-[-0.15em] object-contain', className)}
      onError={() => setIndex((current) => current + 1)}
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
