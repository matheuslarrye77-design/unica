import { createContext, useContext, useMemo, useState, type FC, type ReactNode } from 'react';

type MuralSearchValue = {
  query: string;
  setQuery: (value: string) => void;
};

const MuralSearchContext = createContext<MuralSearchValue | null>(null);

export const MuralSearchProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState('');
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <MuralSearchContext.Provider value={value}>{children}</MuralSearchContext.Provider>;
};

export function useMuralSearchOptional() {
  return useContext(MuralSearchContext);
}
