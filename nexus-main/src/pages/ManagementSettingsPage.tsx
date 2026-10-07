import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export const ManagementSettingsPage: FC = () => {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Mural</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between gap-3 text-sm">
            <span>{settings.muralEnabled ? 'Ativado' : 'Desativado'}</span>
            <Button variant="outline" disabled={saving} onClick={() => void persist({ ...settings, muralEnabled: !settings.muralEnabled })}>
              {settings.muralEnabled ? 'Desativar' : 'Ativar'}
            </Button>
          </CardContent>
        </Card>
        <PolicyCard
          title="Quem pode realizar reconhecimentos?"
          mode={settings.recognition.mode}
          userIds={settings.recognition.userIds}
          onMode={(mode) => void persist({ ...settings, recognition: { ...settings.recognition, mode } })}
          onToggle={(id) => togglePerson('recognition', id)}
        />
        <PolicyCard
          title="Quem pode enviar documentos?"
          mode={settings.documents.mode}
          userIds={settings.documents.userIds}
          onMode={(mode) => void persist({ ...settings, documents: { ...settings.documents, mode } })}
          onToggle={(id) => togglePerson('documents', id)}
        />
        <Card>
          <CardHeader><CardTitle className="text-base">Personalização do calendário</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {themes.map((theme) => (
              <label key={theme.id} className="flex items-center gap-2">
                <input type="radio" name="tema" checked={settings.calendar.theme === theme.id} onChange={() => void persist({ ...settings, calendar: { ...settings.calendar, theme: theme.id } })} />
                {theme.label}
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-muted-foreground">Papel de parede</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void onWallpaper(event.target.files?.[0] ?? null)} />
            </label>
            <Button variant="outline" onClick={() => void clearWallpaper().then(() => toast.success('Padrão restaurado.')).catch(() => toast.error('Não foi possível restaurar.'))}>Remover papel de parede</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PolicyCard: FC<{
  title: string;
  mode: PolicyMode;
  userIds: string[];
  onMode: (mode: PolicyMode) => void;
  onToggle: (id: string) => void;
}> = ({ title, mode, userIds, onMode, onToggle }) => (
  <Card>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-2 text-sm">
      {modes.map((item) => (
        <label key={item.id} className="flex items-center gap-2">
          <input type="radio" name={title} checked={mode === item.id} onChange={() => onMode(item.id)} />
          {item.label}
        </label>
      ))}
      {mode === 'selected' ? (
        <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">
          {directoryPeople.map((person) => (
            <label key={person.id} className="flex items-center gap-2">
              <input type="checkbox" checked={userIds.includes(person.id)} onChange={() => onToggle(person.id)} />
              {person.name}
            </label>
          ))}
        </div>
      ) : null}
    </CardContent>
  </Card>
);
