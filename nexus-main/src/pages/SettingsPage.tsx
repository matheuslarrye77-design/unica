import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { actor } from '@/lib/session';
import { isLeader } from '@/lib/institution';
import { ManagementSettingsPage } from '@/pages/ManagementSettingsPage';
import { Settings } from 'lucide-react';
import { type FC } from 'react';

export const SettingsPage: FC = () => {
  const user = actor();
  return (
    <PageFrame>
      <PageHero
        icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
        title="Configurações"
        subtitle="Preferências da conta na Única Conecta."
      />
      <section className="mt-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(70,0,243,0.05)]">
        <h2 className="text-sm font-semibold">Conta</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Nome</dt><dd>{user.name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">E-mail</dt><dd>{user.email}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Cargo</dt><dd>{user.role}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Área</dt><dd>{user.department}</dd></div>
        </dl>
      </section>
      {isLeader(user) ? <div className="mt-4"><ManagementSettingsPage embedded /></div> : null}
    </PageFrame>
  );
};
