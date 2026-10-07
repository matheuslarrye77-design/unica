import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'

  const handleSetTheme = (event: React.MouseEvent, theme: 'light' | 'dark' | 'system') => {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(theme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    const transition = document.startViewTransition(() => {
      setTheme(theme);
    });

    transition.ready.then(() => {
      const root = document.documentElement;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      
      // Set the custom properties for the animation
      root.style.setProperty('--ripple-x', x + 'px');
      root.style.setProperty('--ripple-y', y + 'px');
      root.style.setProperty('--ripple-radius', endRadius + 'px');
      
      // Add the class to trigger the animation in CSS
      root.classList.add('is-rippling');

      // Clean up the class after the animation is done
      setTimeout(() => {
        root.classList.remove('is-rippling');
        root.style.removeProperty('--ripple-x');
        root.style.removeProperty('--ripple-y');
        root.style.removeProperty('--ripple-radius');
      }, 600); // Must match animation duration in CSS
    });
  }

  return (
    <Button variant="outline" size="icon" className="relative h-10 w-10" aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={(event) => handleSetTheme(event, dark ? 'light' : 'dark')}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
