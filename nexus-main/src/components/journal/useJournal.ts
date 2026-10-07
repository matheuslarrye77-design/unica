import { getJournalArticles, subscribeJournal } from '@/data/journal';
import { useEffect, useState } from 'react';

export function useJournalArticles() {
  const [articles, setArticles] = useState(getJournalArticles);
  useEffect(() => {
    return subscribeJournal(() => setArticles(getJournalArticles()));
  }, []);
  return articles;
}
