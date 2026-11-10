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
      <section className="unica-surface mt-6 px-6 py-6">
        <h2 className="text-[15px] font-medium text-[var(--ds-ink)]">Conta</h2>
        <dl className="unica-bento mt-5 text-sm">
          <div className="rounded-[14px] bg-[var(--ds-surface)] px-4 py-3.5"><dt className="unica-meta">Nome</dt><dd className="mt-1 font-medium text-[var(--ds-ink)]">{user.name}</dd></div>
          <div className="rounded-[14px] bg-[var(--ds-surface)] px-4 py-3.5"><dt className="unica-meta">E-mail</dt><dd className="mt-1 font-medium text-[var(--ds-ink)]">{user.email}</dd></div>
          <div className="rounded-[14px] bg-[var(--ds-surface)] px-4 py-3.5"><dt className="unica-meta">Cargo</dt><dd className="mt-1 font-medium text-[var(--ds-ink)]">{user.role}</dd></div>
          <div className="rounded-[14px] bg-[var(--ds-surface)] px-4 py-3.5"><dt className="unica-meta">Área</dt><dd className="mt-1 font-medium text-[var(--ds-ink)]">{user.department}</dd></div>
        </dl>
      </section>
      {isLeader(user) ? <div className="mt-4"><ManagementSettingsPage embedded /></div> : null}
    </PageFrame>
  );
};
