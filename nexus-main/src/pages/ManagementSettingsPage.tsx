import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { currentUser } from '@/data/mockData';
import {
  clearWallpaper,
  directoryPeople,
  isLeader,
  saveSettings,
  saveWallpaper,
  useInstitution,
  type CalendarTheme,
  type PolicyMode,
} from '@/lib/institution';
import { useState, type FC } from 'react';
import { toast } from 'sonner';

const themes: { id: CalendarTheme; label: string }[] = [
  { id: 'padrao', label: 'Padrão' },
  { id: 'halloween', label: 'Halloween' },
  { id: 'natal', label: 'Natal' },
  { id: 'junina', label: 'Festa Junina' },
  { id: 'anonovo', label: 'Ano Novo' },
];

const modes: { id: PolicyMode; label: string }[] = [
  { id: 'leadership', label: 'Somente liderança' },
  { id: 'selected', label: 'Colaboradores selecionados' },
  { id: 'everyone', label: 'Todos os colaboradores' },
];

export const ManagementSettingsPage: FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const institution = useInstitution();
  const [saving, setSaving] = useState(false);
  const allowed = isLeader(currentUser);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <p className="px-6 py-10 text-sm text-muted-foreground">Esta área é restrita à liderança.</p>
      </div>
    );
  }

  const settings = institution.settings;

  async function persist(next: typeof settings) {
    setSaving(true);
    try {
      await saveSettings(next);
      toast.success('Configuração salva.');
    } catch {
      toast.error('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  function togglePerson(kind: 'recognition' | 'documents', id: string) {
    const policy = settings[kind];
    const userIds = policy.userIds.includes(id) ? policy.userIds.filter((item) => item !== id) : [...policy.userIds, id];
    void persist({ ...settings, [kind]: { ...policy, userIds } });
  }

  async function onWallpaper(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1_500_000) {
      toast.error('Use uma imagem de até 1,5 MB.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(file);
    });
    try {
      await saveWallpaper(dataUrl);
      toast.success('Papel de parede atualizado.');
    } catch {
      toast.error('Não foi possível salvar a imagem.');
    }
  }

  const content = (
      <div className={embedded ? 'flex flex-col gap-4' : 'mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6'}>
        {embedded ? null : <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>}
        <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Mural</h2>
              <p className="mt-1 text-sm text-muted-foreground">{settings.muralEnabled ? 'Visível para a equipe.' : 'Oculto para quem não é da liderança.'}</p>
            </div>
            <Button variant={settings.muralEnabled ? 'default' : 'outline'} size="sm" disabled={saving} onClick={() => void persist({ ...settings, muralEnabled: !settings.muralEnabled })}>
              {settings.muralEnabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>
        </section>
        <PolicyCard
          title="Reconhecimentos"
          description="Quem pode publicar um reconhecimento."
          name="reconhecimento"
          mode={settings.recognition.mode}
          userIds={settings.recognition.userIds}
          onMode={(mode) => void persist({ ...settings, recognition: { ...settings.recognition, mode } })}
          onToggle={(id) => togglePerson('recognition', id)}
        />
        <PolicyCard
          title="Documentos"
          description="Quem pode enviar arquivos para a central."
          name="documentos"
          mode={settings.documents.mode}
          userIds={settings.documents.userIds}
          onMode={(mode) => void persist({ ...settings, documents: { ...settings.documents, mode } })}
          onToggle={(id) => togglePerson('documents', id)}
        />
        <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
          <h2 className="text-sm font-semibold">Calendário</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tema e papel de parede da grade.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((theme) => (
              <label key={theme.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', settings.calendar.theme === theme.id ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground')}>
                <input type="radio" name="tema" className="accent-primary" checked={settings.calendar.theme === theme.id} onChange={() => void persist({ ...settings, calendar: { ...settings.calendar, theme: theme.id } })} />
                {theme.label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Papel de parede</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={(event) => void onWallpaper(event.target.files?.[0] ?? null)} />
            </label>
            <Button variant="outline" size="sm" onClick={() => void clearWallpaper().then(() => toast.success('Padrão restaurado.')).catch(() => toast.error('Não foi possível restaurar.'))}>Remover papel de parede</Button>
          </div>
        </section>
      </div>
  );

  if (embedded) return content;
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {content}
    </div>
  );
};

const PolicyCard: FC<{
  title: string;
  description: string;
  name: string;
  mode: PolicyMode;
  userIds: string[];
  onMode: (mode: PolicyMode) => void;
  onToggle: (id: string) => void;
}> = ({ title, description, name, mode, userIds, onMode, onToggle }) => (
  <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
    <h2 className="text-sm font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    <div className="mt-3 flex flex-col gap-2">
      {modes.map((item) => (
        <label key={item.id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm', mode === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
          <input type="radio" name={name} className="accent-primary" checked={mode === item.id} onChange={() => onMode(item.id)} />
          {item.label}
        </label>
      ))}
    </div>
    {mode === 'selected' ? (
      <div className="mt-3 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
        {directoryPeople.map((person) => (
          <label key={person.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={userIds.includes(person.id)} onChange={() => onToggle(person.id)} />
            {person.name}
          </label>
        ))}
      </div>
    ) : null}
  </section>
);
