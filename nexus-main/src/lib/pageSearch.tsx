import { createContext, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

function placeholderFor(pathname: string) {
  if (pathname === '/') return 'Buscar publicações...';
  if (pathname.startsWith('/announcements')) return 'Buscar por título ou conteúdo...';
  if (pathname.startsWith('/kudos')) return 'Buscar reconhecimentos...';
  if (pathname.startsWith('/resources')) return 'Pesquisar documentos...';
  if (pathname.startsWith('/employees')) return 'Buscar por nome, ramal ou e-mail...';
  if (pathname.startsWith('/sugestoes')) return 'Buscar sugestão...';
  if (pathname.startsWith('/projects')) return 'Buscar atividades...';
  if (pathname.startsWith('/calendar')) return 'Buscar eventos...';
  if (pathname.startsWith('/help-desk')) return 'Buscar chamados...';
  if (pathname.startsWith('/for-you')) return 'Buscar atualizações...';
  if (pathname.startsWith('/publicacao')) return 'Buscar publicações...';
  return 'Buscar...';
}

type PageSearchValue = {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
};

const PageSearchContext = createContext<PageSearchValue>({
  query: '',
  setQuery: () => undefined,
  placeholder: 'Buscar...',
});

export const PageSearchProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [query, setQuery] = useState('');
  useEffect(() => {
    setQuery('');
  }, [location.pathname, location.search]);
  const placeholder = placeholderFor(location.pathname);
  const value = useMemo(() => ({ query, setQuery, placeholder }), [query, placeholder]);
  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
};

export function usePageSearch() {
  return useContext(PageSearchContext);
}
