import { ThemeProviderContext } from '@/contexts/ThemeProviderContext';
import { useEffect } from 'react';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: 'dark' | 'light' | 'system';
  storageKey?: string;
};

export function ThemeProvider({
  children,
  storageKey = 'nexus-ui-theme',
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    try {
      localStorage.setItem(storageKey, 'light');
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return (
    <ThemeProviderContext.Provider
      {...props}
      value={{
        theme: 'light',
        setTheme: () => {},
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}
