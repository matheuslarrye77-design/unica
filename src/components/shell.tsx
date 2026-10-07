"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Gift,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  PartyPopper,
  Search,
  Settings,
  SquareKanban,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { logout, searchPreview, setTheme } from "@/server/actions";
import type { SearchResults, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, ToastProvider } from "./ui";

const GROUPS = [
  {
    id: "social",
    label: "Social",
    items: [
      { href: "/inicio", label: "Feed da equipe", icon: Users },
      { href: "/pessoas", label: "Pessoas", icon: UserRound },
      { href: "/aniversarios", label: "Celebrações", icon: Gift },
    ],
  },
  {
    id: "trabalho",
    label: "Trabalho",
    items: [
      { href: "/tarefas", label: "Minhas missões", icon: SquareKanban },
      { href: "/equipe", label: "Equipe", icon: Users },
    ],
  },
  {
    id: "reconhecimento",
    label: "Reconhecimento",
    items: [
      { href: "/reconhecimentos", label: "Reconhecer", icon: Award },
      { href: "/reconhecimentos", label: "Mural", icon: Megaphone },
    ],
  },
  {
    id: "comunicacao",
    label: "Comunicação",
    items: [
      { href: "/mural", label: "Jornal", icon: Newspaper },
      { href: "/documentos", label: "Documentos", icon: FileText },
    ],
  },
];

function active(pathname: string, href: string) {
  return pathname === href || (href !== "/inicio" && pathname.startsWith(`${href}/`));
}

export function Shell({ user, unread, greeting, firstName, birthdayToday, rail, mobileRail, children }: { user: SessionUser; unread: number; greeting: string; firstName: string; birthdayToday?: boolean; rail?: React.ReactNode; mobileRail?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const [panel, setPanel] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ social: true, trabalho: true, reconhecimento: true, comunicacao: true });
  useEffect(() => {
    const stored = window.localStorage.getItem("unica-nav");
    if (!stored) return;
    try {
      setOpenGroups(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      /* mantém as categorias abertas */
    }
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", user.theme === "dark");
  }, [user.theme]);
  const groups = GROUPS;

  return (
    <ToastProvider>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Ir para o conteúdo
      </a>
      <div className={cn("h-dvh overflow-hidden", user.theme === "dark" && "theme-dark")}>
        {birthdayToday ? <BirthdayConfetti /> : null}
        <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col px-2.5 py-2 min-[1040px]:grid min-[1040px]:grid-cols-[216px_minmax(0,1fr)_400px] min-[1040px]:grid-rows-[36px_minmax(0,1fr)] min-[1040px]:gap-x-3 min-[1040px]:gap-y-2 min-[1040px]:px-3 min-[1040px]:py-2.5">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[200px] flex-col overflow-hidden border-r border-line bg-white md:flex min-[1040px]:static min-[1040px]:inset-auto min-[1040px]:z-auto min-[1040px]:col-start-1 min-[1040px]:row-span-2 min-[1040px]:h-auto min-[1040px]:min-h-0 min-[1040px]:w-auto min-[1040px]:rounded-[18px] min-[1040px]:border min-[1040px]:border-[#EFEAF5] min-[1040px]:bg-white min-[1040px]:shadow-card">
          <Link href="/inicio" className="relative z-10 px-3.5 pb-1 pt-3 text-[18px] font-semibold leading-none tracking-tight text-unica">
            Única
          </Link>
          <nav className="relative z-10 flex flex-1 flex-col gap-0 overflow-y-auto px-2 py-1.5" aria-label="Principal">
            <Link href="/inicio" aria-current={pathname === "/inicio" ? "page" : undefined} className={cn("flex h-[26px] items-center gap-2 rounded-lg px-2 text-[12px]", pathname === "/inicio" ? "bg-[#F3E9FC] font-semibold text-unica" : "text-[#3F3A46] hover:bg-[#F7F5F8]")}>
              <Home size={14} aria-hidden /> Início
            </Link>
            {groups.map((group) => {
              const open = openGroups[group.id] !== false;
              return (
                <div key={group.id} className="mt-2">
                  <button type="button" className="flex h-5 w-full items-center justify-between px-2 text-[11px] font-medium text-mute" aria-expanded={open} onClick={() => setOpenGroups((current) => {
                    const next = { ...current, [group.id]: !open };
                    window.localStorage.setItem("unica-nav", JSON.stringify(next));
                    return next;
                  })}>
                    {group.label}
                    <ChevronDown size={12} className={open ? "rotate-180 transition" : "transition"} />
                  </button>
                  {open ? group.items.map((item) => {
                    const Icon = item.icon;
                    const current = item.href !== "/inicio" && active(pathname, item.href.split("?")[0]);
                    return (
                      <Link key={item.href + item.label} href={item.href} aria-current={current ? "page" : undefined} className={cn("flex h-[26px] items-center gap-2 rounded-lg px-2 text-[12px]", current ? "bg-[#F3E9FC] font-semibold text-unica" : "text-[#3F3A46] hover:bg-[#F7F5F8]")}>
                        <Icon size={14} aria-hidden />
                        {item.label}
                      </Link>
                    );
                  }) : null}
                </div>
              );
            })}
          </nav>
          <div className="relative z-10 mt-auto border-t border-line px-2 py-1.5">
            <Link href="/conta" className={cn("flex h-[26px] items-center gap-2 rounded-lg px-2 text-[12px]", active(pathname, "/conta") ? "bg-[#F3E9FC] font-semibold text-unica" : "text-[#3F3A46] hover:bg-[#F7F5F8]")}>
              <Settings size={14} aria-hidden /> Configurações
            </Link>
            {user.role === "leadership" ? (
              <Link href="/configuracoes" className={cn("flex h-[26px] items-center gap-2 rounded-lg px-2 text-[12px]", active(pathname, "/configuracoes") ? "bg-[#F3E9FC] font-semibold text-unica" : "text-[#3F3A46] hover:bg-[#F7F5F8]")}>
                <Users size={14} aria-hidden /> Administração
              </Link>
            ) : null}
          </div>
        </aside>
        <Topbar user={user} unread={unread} greeting={greeting} firstName={firstName} onPanel={() => setPanel(true)} />
        <main id="conteudo" className="page-enter min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-24 pt-2 md:pb-3 md:pl-[200px] min-[1040px]:col-start-2 min-[1040px]:row-start-2 min-[1040px]:px-0 min-[1040px]:pb-0.5 min-[1040px]:pt-0">
          {children}
        </main>
        {rail ? <aside className="hidden min-h-0 min-w-0 overflow-y-auto overscroll-contain min-[1040px]:col-start-3 min-[1040px]:row-start-2 min-[1040px]:block">{rail}</aside> : null}
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden" aria-label="Mobile" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <ul className="grid grid-cols-5">
            {[
              { href: "/inicio", label: "Início", icon: Home },
              { href: "/tarefas", label: "Tarefas", icon: SquareKanban },
              { href: "/mural", label: "Mural", icon: Megaphone },
              { href: "/calendario", label: "Calendário", icon: CalendarDays },
            ].map((item) => {
              const Icon = item.icon;
              const current = active(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={current ? "page" : undefined} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", current ? "text-unica" : "text-mute")}>
                    <Icon size={18} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button type="button" className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] text-mute" onClick={() => setMore(true)} aria-expanded={more} aria-label="Mais opções">
                <Menu size={18} aria-hidden />
                Mais
              </button>
            </li>
          </ul>
        </nav>
        {more ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button type="button" className="absolute inset-0 bg-[#1E1A24]/40" aria-label="Fechar menu" onClick={() => setMore(false)} />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-8">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/brand/u1.png" alt="" width={32} height={32} className="h-8 w-8" />
                  <span className="text-sm font-semibold">Única</span>
                </div>
                <button type="button" aria-label="Fechar" className="grid h-10 w-10 place-items-center rounded-lg" onClick={() => setMore(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-1">
                {[
                  { href: "/pessoas", label: "Pessoas", icon: Users },
                  { href: "/aniversarios", label: "Celebrações", icon: PartyPopper },
                  { href: "/reconhecimentos", label: "Reconhecimentos", icon: Award },
                  { href: "/enquetes", label: "Enquetes", icon: Megaphone },
                  { href: "/feedbacks", label: "Feedbacks", icon: MessageSquare },
                  { href: "/documentos", label: "Documentos", icon: FileText },
                  { href: "/conta", label: "Configurações", icon: Settings },
                  ...(user.role === "leadership"
                    ? [
                        { href: "/equipe", label: "Equipe", icon: Users },
                        { href: "/configuracoes", label: "Administração", icon: Settings },
                      ]
                    : []),
                  { href: "/perfil", label: "Perfil", icon: UserRound },
                  { href: "/notificacoes", label: "Notificações", icon: Bell },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href + item.label} href={item.href} onClick={() => setMore(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-unica-wash">
                      <Icon size={18} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
                <form action={logout}>
                  <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-sm text-danger">
                    <LogOut size={18} aria-hidden />
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
        {panel ? (
          <div className="fixed inset-0 z-40 min-[1040px]:hidden">
            <button type="button" className="absolute inset-0 bg-[#1E1A24]/40" aria-label="Fechar painel" onClick={() => setPanel(false)} />
            <div className="absolute inset-y-0 right-0 w-[min(100%,360px)] overflow-y-auto bg-[#F7F4FB] p-4">{mobileRail}</div>
          </div>
        ) : null}
      </div>
    </ToastProvider>
  );
}

function BirthdayConfetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 18 }, (_, index) => (
        <span key={index} className="confetti" style={{ left: `${(index * 17) % 100}%`, animationDelay: `${index * 0.12}s`, background: index % 2 ? "#6424B3" : "#E8D9F6" }} />
      ))}
    </div>
  );
}

function Topbar({ user, unread, greeting, firstName, onPanel }: { user: SessionUser; unread: number; greeting: string; firstName: string; onPanel: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const roleLabel = user.jobTitle || (user.role === "leadership" ? "Liderança" : "Colaborador");
  return (
    <header className="relative z-20 flex h-9 shrink-0 items-center gap-2 md:pl-[200px] min-[1040px]:col-span-2 min-[1040px]:col-start-2 min-[1040px]:row-start-1 min-[1040px]:grid min-[1040px]:h-9 min-[1040px]:grid-cols-subgrid min-[1040px]:items-center min-[1040px]:pl-0">
      <p className="sr-only">{greeting}, {firstName}</p>
      <Link href="/inicio" className="md:hidden">
        <img src="/brand/u1.png" alt="Única" width={32} height={32} className="h-8 w-8" />
      </Link>
      <Link href="/busca" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white md:hidden" aria-label="Buscar">
        <Search size={18} />
      </Link>
      <SearchBox />
      <div className="ml-auto flex items-center gap-0.5 min-[1040px]:col-start-2 min-[1040px]:ml-0 min-[1040px]:justify-self-end">
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white min-[1040px]:hidden" aria-label="Calendário e humor" onClick={onPanel}>
          <CalendarDays size={15} />
        </button>
        <Link href="/calendario" className="hidden h-8 w-8 place-items-center rounded-full hover:bg-white min-[1040px]:grid" aria-label="Calendário completo">
          <CalendarDays size={15} />
        </Link>
        <Link href="/notificacoes" className="relative grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"}>
          <Bell size={15} />
          {unread > 0 ? <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#E24B6A] px-1 text-[9px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span> : null}
        </Link>
        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-white" aria-label={user.theme === "dark" ? "Modo claro" : "Modo escuro"} onClick={async () => {
          const result = await setTheme(user.theme === "dark" ? "light" : "dark");
          if (!result.ok) return;
          router.refresh();
        }}>
          <Sun size={15} />
        </button>
        <button type="button" className="hidden items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 hover:bg-white md:flex" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Conta">
          <Avatar name={user.name} id={user.id} hasAvatar={user.hasAvatar} size={26} />
          <span className="hidden text-left min-[1040px]:block">
            <span className="block max-w-[7.5rem] truncate text-[12px] font-semibold leading-4">{user.name}</span>
            <span className="block max-w-[7.5rem] truncate text-[10px] leading-3 text-mute">{roleLabel}</span>
          </span>
          <ChevronDown size={13} className="hidden text-mute min-[1040px]:block" />
        </button>
        {open ? (
          <div className="absolute right-6 top-14 hidden w-52 rounded-xl border border-line bg-white p-1 shadow-card md:block">
            <Link href="/perfil" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-unica-wash" onClick={() => setOpen(false)}>
              <UserRound size={16} /> Meu perfil
            </Link>
            <Link href="/enquetes" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-unica-wash" onClick={() => setOpen(false)}>
              <MessageSquare size={16} /> Enquetes
            </Link>
            <Link href="/feedbacks" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-unica-wash" onClick={() => setOpen(false)}>
              <MessageSquare size={16} /> Feedbacks
            </Link>
            <Link href="/conta" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-unica-wash" onClick={() => setOpen(false)}>
              <Settings size={16} /> Configurações
            </Link>
            <form action={logout}>
              <button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-unica-wash">
                <LogOut size={16} /> Sair
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Pick<SearchResults, "tasks" | "people" | "announcements" | "events"> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      const data = await searchPreview(query.trim());
      setResults(data);
      setOpen(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const empty = results && results.tasks.length + results.people.length + results.announcements.length + results.events.length === 0;

  return (
    <form
      className="relative hidden min-w-0 md:block min-[1040px]:col-start-1"
      action="/busca"
      onSubmit={(event) => {
        event.preventDefault();
        const value = query.trim();
        if (value) router.push(`/busca?q=${encodeURIComponent(value)}`);
        setOpen(false);
      }}
    >
      <label className="sr-only" htmlFor="busca-global">
        Buscar
      </label>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" aria-hidden />
      <input
        id="busca-global"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Busque por pessoas, posts, documentos..."
        className="h-8 w-full rounded-full border border-[#EFEAF5] bg-white pl-9 pr-3 text-[12px] shadow-card outline-none focus-visible:border-unica"
        autoComplete="off"
      />
      {open && results ? (
        <div className="absolute left-0 right-0 top-12 z-30 max-h-96 overflow-auto rounded-xl border border-line bg-white p-2 shadow-card">
          {empty ? <p className="px-2 py-3 text-sm text-mute">Nenhum resultado.</p> : null}
          <SearchGroup title="Tarefas" items={results.tasks.map((item) => ({ href: `/tarefas/${item.id}`, label: item.title }))} />
          <SearchGroup title="Pessoas" items={results.people.map((item) => ({ href: `/perfil/${item.id}`, label: item.name }))} />
          <SearchGroup title="Comunicados" items={results.announcements.map((item) => ({ href: `/mural/${item.id}`, label: item.title }))} />
          <SearchGroup title="Eventos" items={results.events.map((item) => ({ href: "/calendario", label: item.title }))} />
          <Link href={`/busca?q=${encodeURIComponent(query.trim())}`} className="block rounded-lg px-2 py-2 text-sm font-medium text-unica hover:bg-unica-wash" onClick={() => setOpen(false)}>
            Ver todos os resultados
          </Link>
        </div>
      ) : null}
    </form>
  );
}

function SearchGroup({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-xs font-medium text-mute">{title}</p>
      {items.map((item) => (
        <Link key={item.href + item.label} href={item.href} className="block truncate rounded-lg px-2 py-2 text-sm hover:bg-unica-wash">
          {item.label}
        </Link>
      ))}
    </div>
  );
}
