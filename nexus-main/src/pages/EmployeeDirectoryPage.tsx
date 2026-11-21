import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TEAM_FUNCOES, UNIQUE_FUNCOES, teamRoster, type TeamFuncao, type TeamMember } from '@/data/team';
import { cn } from '@/lib/utils';
import { isLeader } from '@/lib/institution';
import { actor, authHeaders, getDemoId } from '@/lib/session';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { ChevronDown, Filter, KeyRound, LayoutGrid, List, Mail, MessageCircle, Phone, Plus, Search, User, UserRound } from 'lucide-react';
import { usePageSearch } from '@/lib/pageSearch';
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const ROLE_ICON: Record<TeamFuncao, FC<{ className?: string }>> = {
  'Líder': UserRound,
  Supervisor: User,
  Chat: MessageCircle,
  'E-mail': Mail,
  'Ligação': Phone,
};

const FILTER_GROUPS: { title: string; items: TeamFuncao[] }[] = [
  { title: 'Cargo', items: ['Líder', 'Supervisor'] },
  { title: 'Subsetor', items: ['Chat', 'E-mail', 'Ligação'] },
];

const field = 'h-[42px] w-full rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 text-sm outline-none focus:border-[#9b82ff] focus:bg-white';
const mainBtn = 'inline-flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#6644e0] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8] disabled:cursor-not-allowed disabled:bg-[#d9ccff] disabled:shadow-none';

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

function slugName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).slice(0, 2).join('.');
}

function nextRamal(people: TeamMember[]) {
  const highest = people.reduce((max, person) => Math.max(max, Number(person.ramal) || 0), 1000);
  return String(highest + 1);
}

const emptyForm = { name: '', email: '', role: '', funcao: 'Chat' as TeamFuncao, phone: '', ramal: '' };

export const EmployeeDirectoryPage: FC = () => {
  const { query, setQuery } = usePageSearch();
  const [selected, setSelected] = useState<TeamFuncao[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [colleagues, setColleagues] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [mailTouched, setMailTouched] = useState(false);
  const [formError, setFormError] = useState({ name: false, email: false, ramal: false });
  const [aliasFor, setAliasFor] = useState<TeamMember | null>(null);
  const [aliasText, setAliasText] = useState('');
  const [pwFor, setPwFor] = useState<TeamMember | null>(null);
  const [pwMethod, setPwMethod] = useState<'link' | 'temp'>('link');
  const [pwForce, setPwForce] = useState(true);
  const [pwTemp, setPwTemp] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!filtersOpen) return;
    const close = (event: MouseEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filtersOpen]);

  const roster = useMemo(() => [...colleagues, ...teamRoster], [colleagues]);
  const taken = useMemo(() => new Set(roster.map((person) => person.funcao).filter((funcao) => UNIQUE_FUNCOES.includes(funcao))), [roster]);
  const filtered = roster.filter((person) => {
    if (selected.length && !selected.includes(person.funcao)) return false;
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return [person.name, person.email, person.ramal, person.role, person.funcao].some((value) => value.toLowerCase().includes(text));
  });
  const filterLabel = selected.length === 0 ? 'Todos' : selected.length === 1 ? selected[0] : `${selected.length} filtros`;

  function toggleRole(funcao: TeamFuncao) {
    setSelected((current) => current.includes(funcao) ? current.filter((item) => item !== funcao) : [...current, funcao]);
  }

  function openAdd() {
    setMailTouched(false);
    setFormError({ name: false, email: false, ramal: false });
    setForm({ ...emptyForm, ramal: nextRamal(roster) });
    setOpen(true);
  }

  function onName(name: string) {
    setForm((current) => ({
      ...current,
      name,
      email: mailTouched ? current.email : (name.trim() ? `${slugName(name)}@company.com` : ''),
    }));
    setFormError((current) => ({ ...current, name: false }));
  }

  async function addColleague(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const ramal = form.ramal.trim();
    const nextError = {
      name: !name,
      email: !/^\S+@\S+\.\S+$/.test(email),
      ramal: !ramal,
    };
    setFormError(nextError);
    if (nextError.name || nextError.email || nextError.ramal) return;
    if (UNIQUE_FUNCOES.includes(form.funcao) && taken.has(form.funcao)) {
      toast.error(form.funcao === 'Líder' ? 'A equipe já tem um líder.' : 'A equipe já tem um supervisor.');
      return;
    }
    const role = form.role.trim() || (form.funcao === 'Líder' || form.funcao === 'Supervisor' ? form.funcao : 'Atendimento');
    const response = await fetch('/api/colleagues', {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ ...form, name, email, ramal, role }),
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

  function openPassword(person: TeamMember) {
    setPwFor(person);
    setPwMethod('link');
    setPwForce(true);
    setPwTemp('');
    setPwBusy(false);
  }

  async function resetPassword() {
    if (!pwFor || pwBusy) return;
    if (pwTemp) {
      try {
        await navigator.clipboard.writeText(pwTemp);
        toast.success('Senha copiada.');
      } catch {
        toast.error('Selecione e copie a senha manualmente.');
      }
      return;
    }
    setPwBusy(true);
    try {
      const response = await fetch('/api/password-resets', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ email: pwFor.email, method: pwMethod, forceChange: pwMethod === 'temp' ? pwForce : true }),
      });
      const data = await response.json().catch(() => ({})) as { password?: string };
      if (!response.ok) {
        toast.error(response.status === 403 ? 'Somente a gestão pode redefinir senhas.' : 'Não foi possível redefinir a senha.');
        return;
      }
      if (pwMethod === 'link') {
        setPwFor(null);
        toast.success('Link de redefinição enviado.');
        return;
      }
      setPwTemp(data.password ?? '');
    } catch {
      toast.error('Não foi possível redefinir a senha.');
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <PageFrame>
      <div>
        <PageHero
          title="Equipe"
          subtitle="Conheça nossos colaboradores e suas informações de contato."
          aside={leader ? (
            <button type="button" className={mainBtn} onClick={openAdd}>
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          ) : null}
        />

        <div className="mt-5 flex flex-wrap items-center gap-3.5 px-[3px]">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#8a85a0]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, e-mail ou ramal" className="h-[42px] w-full rounded-full bg-white pr-4 pl-10 text-sm shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] outline-none focus:shadow-[0_0_0_1.5px_#9b82ff]" />
          </div>
          <div className="relative" ref={filterRef}>
            <button type="button" aria-expanded={filtersOpen} aria-haspopup="true" onClick={() => setFiltersOpen((value) => !value)} className={cn('inline-flex h-[42px] items-center gap-2.5 rounded-full bg-white pr-2 pl-4 text-sm font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#4f33b8]', filtersOpen && 'text-[#4f33b8]')}>
              <Filter className="h-4 w-4" />
              Filtros
              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-semibold', selected.length ? 'bg-[#6644e0] text-white' : 'bg-[#f6f3ff] text-[#4f33b8]')}>{filterLabel}</span>
              <ChevronDown className={cn('h-4 w-4 text-[#8a85a0] transition-transform', filtersOpen && 'rotate-180')} />
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 z-20 mt-2.5 flex w-[264px] flex-col gap-2 rounded-[22px] bg-white p-3 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4]">
                {FILTER_GROUPS.map((group) => (
                  <div key={group.title} className="flex flex-col gap-2">
                    <p className="px-2 pt-1 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">{group.title}</p>
                    {group.items.map((funcao) => {
                      const Icon = ROLE_ICON[funcao];
                      const on = selected.includes(funcao);
                      const count = roster.filter((person) => person.funcao === funcao).length;
                      return (
                        <button key={funcao} type="button" onClick={() => toggleRole(funcao)} className={cn('flex h-10 items-center gap-2.5 rounded-full bg-white pr-2 pl-3.5 text-[13.5px] font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff] hover:bg-[#f6f3ff] hover:text-[#4f33b8]', on && 'bg-[#f6f3ff] text-[#4f33b8] shadow-[0_0_0_1.5px_#7c5cf5]')}>
                          <Icon className="h-4 w-4 shrink-0 text-[#9b82ff]" />
                          {funcao}
                          <em className={cn('ml-auto grid h-6 min-w-6 place-items-center rounded-xl bg-[#f6f5fa] px-1.5 text-[11.5px] not-italic text-[#8a85a0]', on && 'bg-[#6644e0] text-white')}>{count}</em>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {selected.length ? <button type="button" className="self-end rounded-[9px] px-2.5 py-1.5 text-[13px] font-semibold text-[#6644e0] hover:bg-[#f6f3ff]" onClick={() => setSelected([])}>Limpar filtros</button> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3.5 mb-3.5 flex items-center justify-between px-[3px]">
          <p className="text-[13px] text-[#8a85a0]">Total: <b className="font-bold text-[#4f33b8]">{filtered.length}</b> {filtered.length === 1 ? 'colaborador' : 'colaboradores'}</p>
          <div className="flex gap-1 rounded-full bg-white p-1 shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]">
            <button type="button" aria-label="Grade" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} className={cn('grid h-[34px] w-[34px] place-items-center rounded-full', layout === 'grid' ? 'bg-[#f6f3ff] text-[#6644e0]' : 'text-[#8a85a0] hover:text-[#6644e0]')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Lista" aria-pressed={layout === 'list'} onClick={() => setLayout('list')} className={cn('grid h-[34px] w-[34px] place-items-center rounded-full', layout === 'list' ? 'bg-[#f6f3ff] text-[#6644e0]' : 'text-[#8a85a0] hover:text-[#6644e0]')}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#8a85a0]">Nenhum colaborador encontrado</p>
        ) : (
          <div className={cn('px-[3px]', layout === 'grid' ? 'grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-3.5')}>
            {filtered.map((person) => {
              const Icon = ROLE_ICON[person.funcao];
              return (
                <article key={person.id} className={cn('rounded-[22px] bg-white shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4] transition-transform hover:-translate-y-0.5', layout === 'list' ? 'grid items-center gap-3.5 px-5 py-3.5 sm:grid-cols-[44px_minmax(0,1fr)] lg:grid-cols-[44px_minmax(0,1.1fr)_minmax(0,1.6fr)_auto_auto] lg:gap-x-[18px]' : 'grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3.5 p-5')}>
                  {person.avatar ? (
                    <img src={person.avatar} alt="" className="h-11 w-11 rounded-full bg-[#ece6ff] object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ece6ff] text-[13px] font-bold text-[#4f33b8]">{initials(person.name)}</span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold text-[#1f1b2e]">{person.name}</h2>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#4f33b8] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]">
                      <Icon className="h-3 w-3 text-[#9b82ff]" />
                      {person.funcao}
                    </span>
                  </div>
                  <div className={cn('flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px]', layout === 'grid' ? 'col-span-full border-t border-[#e8e4f4] pt-3' : 'sm:col-span-2 lg:col-span-1')}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#5f5a78]"><Phone className="h-3.5 w-3.5 text-[#9b82ff]" />Ramal: {person.ramal || '—'}</span>
                    <a href={`mailto:${person.email}`} className="font-medium break-all text-[#6644e0] hover:underline">{person.email}</a>
                  </div>
                  <div className={cn('flex flex-wrap items-center gap-2', layout === 'grid' ? 'col-span-full' : 'sm:col-span-2 lg:col-auto lg:contents')}>
                    {leader ? (
                      <button type="button" onClick={() => openPassword(person)} className="inline-flex h-[38px] items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#4f33b8]">
                        <KeyRound className="h-3.5 w-3.5 text-[#6644e0]" /> Redefinir senha
                      </button>
                    ) : null}
                    {canAliases ? (
                      <button type="button" onClick={() => void openAliases(person)} className="inline-flex h-[38px] items-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#4f33b8]">Nomes nos relatórios</button>
                    ) : null}
                    <a href={`mailto:${person.email}`} aria-label={`Enviar e-mail para ${person.name}`} className={cn('grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-white text-[#6644e0] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff]', layout === 'list' && 'lg:order-last')}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} overlayClassName="bg-[rgba(31,27,46,0.38)] backdrop-blur-none" className="!flex max-h-[min(92vh,760px)] w-[min(520px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !overflow-hidden !rounded-[22px] !border-0 !bg-white !p-0 shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]">
          <div className="flex items-center justify-between px-[26px] pt-[22px]">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[#1f1b2e]">
              <UserRound className="h-5 w-5 text-[#6644e0]" /> Adicionar colaborador
            </DialogTitle>
            <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg leading-none text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">×</button>
          </div>
          <form className="min-h-0 flex-1 overflow-y-auto px-[26px] pt-4" onSubmit={(event) => void addColleague(event)}>
            <label className="mb-3.5 block">
              <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Nome</span>
              <input value={form.name} onChange={(event) => onName(event.target.value)} placeholder="Nome completo" className={cn(field, formError.name && 'border-[#e5484d]')} />
            </label>
            <div className="mb-3.5 grid gap-2.5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">E-mail</span>
                <input type="email" value={form.email} onChange={(event) => { setMailTouched(true); setForm({ ...form, email: event.target.value }); setFormError((current) => ({ ...current, email: false })); }} placeholder="nome.sobrenome@company.com" className={cn(field, formError.email && 'border-[#e5484d]')} />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Ramal</span>
                <input inputMode="numeric" value={form.ramal} onChange={(event) => { setForm({ ...form, ramal: event.target.value.replace(/\D/g, '').slice(0, 4) }); setFormError((current) => ({ ...current, ramal: false })); }} placeholder="1018" className={cn(field, formError.ramal && 'border-[#e5484d]')} />
              </label>
            </div>
            <div className="mb-3.5">
              <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Função</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {TEAM_FUNCOES.map((item) => {
                  const busy = UNIQUE_FUNCOES.includes(item) && taken.has(item);
                  return (
                    <button key={item} type="button" aria-pressed={form.funcao === item} disabled={busy} onClick={() => setForm({ ...form, funcao: item })} className={cn('choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[12.5px] font-medium outline-none disabled:cursor-not-allowed disabled:opacity-40', form.funcao === item ? 'border border-[#6644e0] bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', form.funcao === item ? 'bg-white' : 'bg-[#9b82ff]')} />
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-3.5 grid gap-2.5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Cargo</span>
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Atendimento" className={field} />
              </label>
              <label>
                <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Telefone</span>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Opcional" className={field} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e8e4f4] py-3.5">
              <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit" className={mainBtn}>Adicionar</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pwFor)} onOpenChange={(next) => { if (!next) setPwFor(null); }}>
        <DialogContent showCloseButton={false} overlayClassName="bg-[rgba(31,27,46,0.38)] backdrop-blur-none" className="!flex max-h-[min(92vh,760px)] w-[min(520px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !overflow-hidden !rounded-[22px] !border-0 !bg-white !p-0 shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]">
          <div className="flex items-center justify-between px-[26px] pt-[22px]">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[#1f1b2e]">
              <KeyRound className="h-5 w-5 text-[#6644e0]" /> Redefinir senha
            </DialogTitle>
            <button type="button" aria-label="Fechar" onClick={() => setPwFor(null)} className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg leading-none text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">×</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-[26px] pt-4">
            {pwTemp ? (
              <div className="mb-3.5 rounded-[22px] bg-white p-4 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ece6ff] text-[13px] font-bold text-[#4f33b8]">{initials(pwFor?.name ?? '')}</span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{pwFor?.name}</h3>
                    <small className="text-[12.5px] text-[#8a85a0]">Senha temporária gerada</small>
                  </div>
                </div>
                <p className="py-2.5 text-center font-mono text-2xl font-semibold tracking-wider text-[#4f33b8] select-all">{pwTemp}</p>
                <p className="text-center text-[12.5px] leading-normal text-[#8a85a0]">Envie ao colaborador por um canal seguro. Ela não será exibida novamente.</p>
              </div>
            ) : (
              <>
                <div className="mb-3.5 rounded-[22px] bg-white p-4 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#ece6ff] text-[13px] font-bold text-[#4f33b8]">{initials(pwFor?.name ?? '')}</span>
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold">{pwFor?.name}</h3>
                      <small className="block truncate text-[12.5px] text-[#8a85a0]">{pwFor?.email}</small>
                    </div>
                  </div>
                </div>
                <span className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Como redefinir</span>
                <div className="mb-3 flex gap-1.5">
                  {([['link', 'Enviar link por e-mail'], ['temp', 'Gerar senha temporária']] as const).map(([id, label]) => (
                    <button key={id} type="button" aria-pressed={pwMethod === id} onClick={() => setPwMethod(id)} className={cn('choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[12.5px] font-medium outline-none', pwMethod === id ? 'border border-[#6644e0] bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', pwMethod === id ? 'bg-white' : 'bg-[#9b82ff]')} />
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mb-3 text-[12.5px] leading-normal text-[#8a85a0]">
                  {pwMethod === 'link'
                    ? `Enviaremos um link para ${pwFor?.email} para a pessoa criar uma nova senha.`
                    : 'Uma senha temporária será gerada para você repassar ao colaborador.'}
                </p>
                {pwMethod === 'temp' ? (
                  <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-[13px] text-[#4a4560] select-none">
                    <input type="checkbox" className="peer sr-only" checked={pwForce} onChange={(event) => setPwForce(event.target.checked)} />
                    <span className="relative h-5 w-[34px] shrink-0 rounded-full bg-[#d9d5e8] transition peer-checked:bg-[#7c5cf5] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.2)] after:transition peer-checked:after:translate-x-3.5" />
                    Exigir troca de senha no próximo acesso
                  </label>
                ) : null}
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-[#e8e4f4] px-[26px] py-3.5">
            <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={() => setPwFor(null)}>{pwTemp ? 'Fechar' : 'Cancelar'}</button>
            <button type="button" className={mainBtn} disabled={pwBusy} onClick={() => void resetPassword()}>{pwTemp ? 'Copiar senha' : pwBusy ? 'Redefinindo...' : 'Redefinir senha'}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(aliasFor)} onOpenChange={(next) => { if (!next) setAliasFor(null); }}>
        <DialogContent showCloseButton={false} overlayClassName="bg-[rgba(31,27,46,0.38)] backdrop-blur-none" className="!flex w-[min(520px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !overflow-hidden !rounded-[22px] !border-0 !bg-white !p-0 shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]">
          <div className="flex items-center justify-between px-[26px] pt-[22px]">
            <DialogTitle className="text-lg font-bold text-[#1f1b2e]">Nomes reconhecidos nos relatórios</DialogTitle>
            <button type="button" aria-label="Fechar" onClick={() => setAliasFor(null)} className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg leading-none text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">×</button>
          </div>
          <form className="px-[26px] pt-4" onSubmit={(event) => void saveAliases(event)}>
            <p className="mb-3 text-[13px] leading-normal text-[#8a85a0]">Um nome por linha. O nome oficial de {aliasFor?.name} continua valendo.</p>
            <textarea value={aliasText} onChange={(event) => setAliasText(event.target.value)} className="min-h-28 w-full rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 py-2 text-sm outline-none focus:border-[#9b82ff] focus:bg-white" placeholder={'Matheus\nMatheus Larrye'} />
            <div className="flex justify-end gap-2 border-t border-[#e8e4f4] py-3.5">
              <button type="button" className="rounded-[11px] px-4 py-2.5 text-sm font-semibold text-[#6b6682] hover:bg-[#f6f3ff]" onClick={() => setAliasFor(null)}>Cancelar</button>
              <button type="submit" className={mainBtn}>Salvar</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageFrame>
  );
};
