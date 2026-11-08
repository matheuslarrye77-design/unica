import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { TEAM_FUNCOES, UNIQUE_FUNCOES, teamRoster, type TeamFuncao, type TeamMember } from '@/data/team';
import { cn } from '@/lib/utils';
import { isLeader } from '@/lib/institution';
import { actor, authHeaders, getDemoId } from '@/lib/session';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { ChevronRight, Filter, LayoutGrid, List, Mail, MessageCircle, MoreHorizontal, Phone, Plus, User, UserRound, Users } from 'lucide-react';
import { usePageSearch } from '@/lib/pageSearch';
import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const ROLE_ICON: Record<TeamFuncao, FC<{ className?: string }>> = {
  'Líder': UserRound,
  Supervisor: User,
  Chat: MessageCircle,
  'E-mail': Mail,
  'Ligação': Phone,
};

function RoleBadge({ funcao }: { funcao: TeamFuncao }) {
  const Icon = ROLE_ICON[funcao];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE7FE] px-2 py-0.5 text-[11px] font-medium text-[#3600C2]">
      <Icon className="h-3 w-3" />
      {funcao}
    </span>
  );
}

const emptyForm = { name: '', email: '', role: '', funcao: 'Chat' as TeamFuncao, phone: '', ramal: '' };

export const EmployeeDirectoryPage: FC = () => {
  const { query: searchQuery, setQuery: setSearchQuery } = usePageSearch();
  const [roles, setRoles] = useState<TeamFuncao[]>([...TEAM_FUNCOES]);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [colleagues, setColleagues] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aliasFor, setAliasFor] = useState<TeamMember | null>(null);
  const [aliasText, setAliasText] = useState('');
  const leader = isLeader(actor());
  const [canAliases, setCanAliases] = useState(leader);
  useEffect(() => {
    if (leader) return;
    void fetch('/api/goals', { credentials: 'include', headers: { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) } })
      .then((response) => response.ok ? response.json() as Promise<{ canManage?: boolean }> : null)
      .then((data) => { if (data?.canManage) setCanAliases(true); })
      .catch(() => undefined);
  }, [leader]);

  useEffect(() => {
    void fetch('/api/colleagues', { credentials: 'include', headers: authHeaders() })
      .then((response) => response.json() as Promise<{ colleagues: TeamMember[] }>)
      .then((data) => setColleagues((data.colleagues ?? []).filter((person) => !teamRoster.some((item) => item.email === person.email))))
      .catch(() => undefined);
  }, []);

  const roster = useMemo(() => [...colleagues, ...teamRoster], [colleagues]);
  const taken = useMemo(() => new Set(roster.map((person) => person.funcao).filter((funcao) => UNIQUE_FUNCOES.includes(funcao))), [roster]);
  const filtered = roster.filter((person) => {
    if (!roles.includes(person.funcao)) return false;
    const text = searchQuery.trim().toLowerCase();
    if (!text) return true;
    return [person.name, person.email, person.ramal, person.role, person.funcao].some((value) => value.toLowerCase().includes(text));
  });

  function toggleRole(funcao: TeamFuncao) {
    setRoles((current) => current.includes(funcao) ? current.filter((item) => item !== funcao) : [...current, funcao]);
  }

  async function addColleague(event: FormEvent) {
    event.preventDefault();
    if (UNIQUE_FUNCOES.includes(form.funcao) && taken.has(form.funcao)) {
      toast.error(form.funcao === 'Líder' ? 'A equipe já tem um líder.' : 'A equipe já tem um supervisor.');
      return;
    }
    const response = await fetch('/api/colleagues', {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify(form),
    });
    if (response.status === 409) {
      const data = await response.json().catch(() => ({ error: 'email' })) as { error?: string };
      toast.error(data.error === 'unique-role'
        ? (form.funcao === 'Líder' ? 'A equipe já tem um líder.' : 'A equipe já tem um supervisor.')
        : 'Já existe um colaborador com este e-mail.');
      return;
    }
    if (!response.ok) {
      toast.error('Preencha nome, e-mail, função e cargo.');
      return;
    }
    const data = await response.json() as { colleague: TeamMember };
    setColleagues((current) => [data.colleague, ...current]);
    setOpen(false);
    setForm(emptyForm);
    toast.success('Colaborador adicionado.');
  }

  async function openAliases(person: TeamMember) {
    setAliasFor(person);
    setAliasText('');
    try {
      const response = await fetch('/api/goals', { credentials: 'include', headers: { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) } });
      const data = await response.json() as { people?: { id: string; aliases: string[] }[] };
      const found = data.people?.find((item) => item.id === person.id);
      setAliasText((found?.aliases ?? []).join('\n'));
    } catch {
      setAliasText('');
    }
  }

  async function saveAliases(event: FormEvent) {
    event.preventDefault();
    if (!aliasFor) return;
    const names = aliasText.split('\n').map((item) => item.trim()).filter(Boolean);
    const response = await fetch('/api/goals/aliases', {
      method: 'PUT',
      credentials: 'include',
      headers: { ...authHeaders(), ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }) },
      body: JSON.stringify({ userId: aliasFor.id, names }),
    });
    if (!response.ok) {
      toast.error('Não foi possível salvar os nomes.');
      return;
    }
    setAliasFor(null);
    toast.success('Nomes dos relatórios salvos.');
  }

  return (
    <PageFrame>
      <div>
        <PageHero
          icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
          title="Equipe"
          subtitle="Conheça nossos colaboradores e suas informações de contato."
          aside={
            <div className="flex shrink-0 gap-2">
              <Button className="h-10 rounded-full bg-[#4600F3] px-4 hover:bg-[#3600C2]" onClick={() => { setSearchQuery(''); setRoles([...TEAM_FUNCOES]); }}>
                <Users className="h-4 w-4" /> Ver equipe
              </Button>
              {leader ? (
                <Button variant="outline" className="h-10 rounded-full border-[#DDD4F5] bg-white px-4" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" /> Adicionar colaborador
                </Button>
              ) : null}
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-11 rounded-xl border-[#DDD4F5] bg-white px-4 text-[#5C5168] shadow-none">
                <Filter className="h-4 w-4" /> Filtrar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setRoles([...TEAM_FUNCOES])}>Todas as funções</DropdownMenuItem>
              {TEAM_FUNCOES.map((funcao) => (
                <DropdownMenuCheckboxItem key={funcao} checked={roles.includes(funcao)} onSelect={(event) => event.preventDefault()} onCheckedChange={() => toggleRole(funcao)}>
                  {funcao}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="ml-auto text-[13px] text-[#8A7C98]">Total: {roster.length} colaboradores</p>
          <div className="flex rounded-xl bg-white p-1 shadow-[0_4px_14px_rgba(70,0,243,0.05)]">
            <button type="button" aria-label="Grade" onClick={() => setLayout('grid')} className={cn('grid h-8 w-8 place-items-center rounded-lg', layout === 'grid' ? 'bg-[#EDE7FE] text-[#4600F3]' : 'text-[#8A7C98]')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Lista" onClick={() => setLayout('list')} className={cn('grid h-8 w-8 place-items-center rounded-lg', layout === 'list' ? 'bg-[#EDE7FE] text-[#4600F3]' : 'text-[#8A7C98]')}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-[22px] border border-[#EDE7FE] bg-white px-6 py-14 text-center">
            <p className="font-medium text-[#2C2433]">Nenhum colaborador encontrado</p>
            <p className="mt-1 text-sm text-[#8A7C98]">Ajuste a pesquisa ou os filtros.</p>
          </div>
        ) : (
          <div className={cn('mt-5', layout === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4' : 'grid gap-3')}>
            {filtered.map((person) => (
              <article key={person.id} className="relative rounded-[22px] border border-[#EDE7FE] bg-white p-4 shadow-[0_8px_22px_rgba(70,0,243,0.04)]">
                <div className="flex items-start gap-3">
                  <img src={person.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full bg-[#EDE7FE]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold leading-tight text-[#2C2433]">{person.name}</h2>
                        <div className="mt-1"><RoleBadge funcao={person.funcao} /></div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <a href={`mailto:${person.email}`} aria-label={`Enviar e-mail para ${person.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#4600F3] hover:bg-[#F5F1FF]">
                          <Mail className="h-4 w-4" />
                        </a>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label={`Ações de ${person.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-[#8A7C98] hover:bg-[#F5F1FF]">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`mailto:${person.email}`)}>Enviar e-mail</DropdownMenuItem>
                            {canAliases ? <DropdownMenuItem onClick={() => void openAliases(person)}>Nomes nos relatórios</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 px-6 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-[#5C5168]">
                    <Phone className="h-3.5 w-3.5 text-[#4600F3]" /> Ramal: {person.ramal || '—'}
                  </p>
                  <a href={`mailto:${person.email}`} className="mt-1 block text-center text-[11px] leading-tight text-[#4600F3]">{person.email}</a>
                </div>
                <a href={`mailto:${person.email}`} aria-label={`Contato de ${person.name}`} className="absolute right-3 bottom-3 grid h-7 w-7 place-items-center rounded-full text-[#C4B6D4] hover:bg-[#F5F1FF] hover:text-[#4600F3]">
                  <ChevronRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar colaborador</DialogTitle>
          </DialogHeader>
          <form id="novo-colaborador" className="grid gap-3" onSubmit={(event) => void addColleague(event)}>
            <div className="grid gap-1"><Label htmlFor="col-nome">Nome</Label><Input id="col-nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
            <div className="grid gap-1"><Label htmlFor="col-email">E-mail</Label><Input id="col-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
            <div className="grid gap-1"><Label htmlFor="col-cargo">Cargo</Label><Input id="col-cargo" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></div>
            <div className="grid gap-1">
              <Label htmlFor="col-funcao">Função</Label>
              <select id="col-funcao" className="h-9 rounded-md border bg-background px-3 text-sm" value={form.funcao} onChange={(event) => setForm({ ...form, funcao: event.target.value as TeamFuncao })}>
                {TEAM_FUNCOES.map((item) => (
                  <option key={item} value={item} disabled={UNIQUE_FUNCOES.includes(item) && taken.has(item)}>
                    {item}{UNIQUE_FUNCOES.includes(item) && taken.has(item) ? ' (já ocupada)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1"><Label htmlFor="col-telefone">Telefone</Label><Input id="col-telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="grid gap-1"><Label htmlFor="col-ramal">Ramal</Label><Input id="col-ramal" inputMode="numeric" value={form.ramal} onChange={(event) => setForm({ ...form, ramal: event.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1001" /></div>
          </form>
          <DialogFooter>
            <Button type="submit" form="novo-colaborador">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(aliasFor)} onOpenChange={(open) => { if (!open) setAliasFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nomes reconhecidos nos relatórios</DialogTitle>
          </DialogHeader>
          <form id="nomes-relatorio" className="grid gap-2" onSubmit={(event) => void saveAliases(event)}>
            <p className="text-sm text-muted-foreground">Um nome por linha. O nome oficial de {aliasFor?.name} continua valendo.</p>
            <textarea value={aliasText} onChange={(event) => setAliasText(event.target.value)} className="min-h-28 rounded-xl border px-3 py-2 text-sm" placeholder={'Matheus\nMatheus Larrye'} />
          </form>
          <DialogFooter>
            <Button type="submit" form="nomes-relatorio">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
};
