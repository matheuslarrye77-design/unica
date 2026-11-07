import { MuralPublishDialog } from '@/components/social/MuralPublishDialog';
import type { JournalArticle } from '@/data/journal';
import { type FC } from 'react';

export const JournalShareDialog: FC<{
  article: JournalArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;
}> = ({ article, open, onOpenChange, onShared }) => {
  if (!article) return null;
  return (
    <MuralPublishDialog
      open={open}
      onOpenChange={onOpenChange}
      source="journal"
      article={article}
      onShared={onShared}
    />
  );
};
