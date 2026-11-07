import { Search } from 'lucide-react';
import { type FC } from 'react';
import { usePageSearch } from '@/lib/pageSearch';

export const GlobalSearch: FC = () => {
  const { query, setQuery, placeholder } = usePageSearch();

  return (
    <label className="relative flex h-9 w-full cursor-text items-center gap-2 rounded-[12px] border border-transparent bg-transparent px-3 text-[13px] font-normal text-muted-foreground transition-colors focus-within:border-[#D4B8E8]/70 focus-within:bg-white/25">
      <Search className="h-4 w-4 shrink-0" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 truncate bg-transparent text-left text-[13px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
};
