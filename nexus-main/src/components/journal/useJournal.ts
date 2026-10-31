import { getJournalArticles, journalCovers, savedJournalIds, subscribeJournal } from '@/data/journal';
import { useEffect, useState } from 'react';

export function useJournalArticles() {
  const [articles, setArticles] = useState(getJournalArticles);
  useEffect(() => {
    return subscribeJournal(() => setArticles(getJournalArticles()));
  }, []);
  return articles;
}

export function useJournalSaved() {
  const [ids, setIds] = useState(savedJournalIds);
  useEffect(() => {
    return subscribeJournal(() => setIds(savedJournalIds()));
  }, []);
  return ids;
}

export function useJournalCovers() {
  const [covers, setCovers] = useState(journalCovers);
  useEffect(() => {
    return subscribeJournal(() => setCovers(journalCovers()));
  }, []);
  return covers;
}
