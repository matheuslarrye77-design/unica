import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { actor, logout } from '@/lib/session';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';

export const Profile: FC = () => {
  const navigate = useNavigate();
  const user = actor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-[12px] px-1.5 hover:bg-accent"
          aria-label="Menu do perfil"
        >
          <img
            className="h-8 w-8 rounded-full bg-muted object-cover"
            src={user.avatar}
            alt=""
          />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-[13px] font-semibold leading-4 text-foreground">{user.name.split(' ')[0]}</span>
            <span className="block truncate text-[11px] font-normal leading-4 text-muted-foreground">{user.role}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" collisionPadding={12}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/perfil')}>
          <User className="mr-2 h-4 w-4" />
          <span>Ver perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/configuracoes')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => window.dispatchEvent(new Event('unica-open-notifications'))}>
          <Bell className="mr-2 h-4 w-4" />
          <span>Notificações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={() => {
            void logout().finally(() => navigate(LOGIN_REQUIRED ? '/login' : '/', { replace: true }));
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
