import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { type LucideIcon } from 'lucide-react';
import { type ElementType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type NavItemData = {
  id: string;
  title: string;
  icon: LucideIcon | ElementType;
  href?: string;
  onClick?: () => void;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

export function NavItem({
  item,
  active,
  collapsed,
  onSelect,
  level = 0,
}: {
  item: NavItemData;
  active: boolean;
  collapsed?: boolean;
  onSelect?: () => void;
  level?: number;
}) {
  const Icon = item.icon;
  const className = cn(
    'group flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-[13px] font-normal tracking-[-0.006em] transition-all duration-[180ms] select-none',
    collapsed && 'justify-center px-0',
    active
      ? 'bg-[var(--ds-lavender)] font-medium text-[var(--ds-purple)]'
      : 'text-[var(--ds-slate)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-ink)]',
  );
  const inner = (
    <>
      <span className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'justify-center')}>
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors duration-[180ms]',
            active ? 'text-[var(--ds-purple)]' : 'text-[var(--ds-muted)] group-hover:text-[var(--ds-purple)]',
          )}
          strokeWidth={1.5}
        />
        {collapsed ? <span className="sr-only">{item.title}</span> : <span className="truncate">{item.title}</span>}
      </span>
      {collapsed ? null : (
        <span className="flex items-center gap-2">
          {item.shortcut ? (
            <kbd className="hidden h-5 items-center justify-center rounded-[4px] border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/60 shadow-xs group-hover:inline-flex">
              {item.shortcut}
            </kbd>
          ) : null}
          {item.badge != null ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
              {item.badge}
            </span>
          ) : null}
        </span>
      )}
    </>
  );

  const control = item.href ? (
    <Link to={item.href} onClick={onSelect} className={className} style={collapsed ? undefined : { paddingLeft: `${level * 12 + 10}px` }}>
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onSelect?.();
      }}
      className={className}
      style={collapsed ? undefined : { paddingLeft: `${level * 12 + 10}px` }}
    >
      {inner}
    </button>
  );

  if (!collapsed) return control;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{control}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarBrand({
  name,
  accent,
  href,
  collapsed,
  onNavigate,
}: {
  name: string;
  accent?: string;
  href: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const label = accent ? `${name} ${accent}` : name;
  return (
    <Link
      to={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center rounded-[12px] px-2 py-2 transition-colors duration-[180ms] select-none hover:bg-[var(--ds-surface)]',
        collapsed && 'justify-center px-0',
      )}
    >
      <img src="/marca-unica.png" alt="" className="h-8 w-8 shrink-0 rounded-[6px] object-cover shadow-sm" />
      {collapsed ? <span className="sr-only">{label}</span> : (
        <span className="ml-3 flex min-w-0 overflow-hidden">
          <span className="unica-display truncate text-[14px] leading-none text-[var(--ds-ink)]">
            {name}
            {accent ? (
              <>
                {' '}
                <span className="text-[var(--ds-purple)]">{accent}</span>
              </>
            ) : null}
          </span>
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({
  groups,
  bottomItems,
  collapsed,
  isActive,
  onNavigate,
  header,
  trailing,
  className,
}: {
  groups: NavGroupData[];
  bottomItems?: NavItemData[];
  collapsed?: boolean;
  isActive: (item: NavItemData) => boolean;
  onNavigate?: () => void;
  header?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex h-full w-full flex-col bg-transparent p-3 font-sans', className)}>
      {header}
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <div key={group.heading ?? group.items[0]?.id} className="flex flex-col gap-0.5">
            {group.heading && !collapsed ? (
              <span className="mb-1.5 px-2.5 text-[11px] font-medium tracking-[0.04em] text-[var(--ds-muted)]">
                {group.heading}
              </span>
            ) : null}
            {group.items.map((item) => (
              <NavItem key={item.id} item={item} active={isActive(item)} collapsed={collapsed} onSelect={onNavigate} />
            ))}
          </div>
        ))}
      </div>
      {bottomItems?.length ? (
        <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--ds-divider)] pt-4">
          {bottomItems.map((item) => (
            <NavItem key={item.id} item={item} active={isActive(item)} collapsed={collapsed} onSelect={onNavigate} />
          ))}
        </div>
      ) : null}
      {trailing}
    </div>
  );
}
