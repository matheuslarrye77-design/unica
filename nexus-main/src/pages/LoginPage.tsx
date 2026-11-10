import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/session';
import { type FC, type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('matheus');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      setError(error instanceof Error && error.message === 'unavailable'
        ? 'Não foi possível entrar agora. Tente de novo em instantes.'
        : 'Usuário ou senha incorretos.');
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-transparent px-4">
      <form onSubmit={(event) => void submit(event)} className="unica-surface w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <img src="/marca-unica.png" alt="" className="h-8 w-8 rounded-full object-cover" />
          <span className="unica-display text-lg">
            Única{' '}
            <span className="text-[var(--ds-purple)]">Conecta</span>
          </span>
        </div>
        <h1 className="text-xl font-medium">Entrar</h1>
        <p className="mt-1.5 text-[14px] font-normal leading-relaxed text-[var(--ds-slate)]">Acesse a Única Conecta com sua conta.</p>
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Usuário</Label>
            <Input id="email" type="text" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">Entrar</Button>
        </div>
      </form>
    </div>
  );
};
