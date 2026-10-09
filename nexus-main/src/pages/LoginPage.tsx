import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/session';
import { type FC, type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('matheus.larrie@unica.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('E-mail ou senha incorretos.');
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">Ú</div>
          <span className="text-lg font-semibold text-primary">Única</span>
        </div>
        <h1 className="text-xl font-semibold">Entrar</h1>
        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
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
