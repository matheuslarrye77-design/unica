import { ImageCrop } from '@/components/journal/ImageCrop';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { profilePhoto, setPlatformColor, setProfilePhoto, storedColor } from '@/lib/appearance';
import { actor, getDemoId } from '@/lib/session';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { isLeader } from '@/lib/institution';
import { ManagementSettingsPage } from '@/pages/ManagementSettingsPage';
import { Settings } from 'lucide-react';
import { useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const COLORS = ['#2563EB', '#6B33F6', '#0F766E', '#DB2777', '#C2410C', '#111827'];

export const SettingsPage: FC = () => {
  const user = actor();
  const [color, setColor] = useState(storedColor() || '#2563EB');
  const [photo, setPhoto] = useState(profilePhoto() || user.avatar);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  function paint(value: string) {
    setColor(value);
    setPlatformColor(value);
  }

  async function onPhoto(file: File | undefined) {
    if (!file || savingPhoto) return;
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)) {
      toast.error('Escolha uma imagem para o perfil.');
      return;
    }
    setSavingPhoto(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('file'));
        reader.readAsDataURL(file);
      });
      setProfilePhoto(data);
      setPhoto(data);
      toast.success('Foto de perfil atualizada.');
    } catch {
      toast.error('Não foi possível usar essa foto.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    if (savingPassword) return;
    if (next.length < 4) {
      toast.error('A nova senha precisa ter pelo menos 4 caracteres.');
      return;
    }
    if (next !== confirm) {
      toast.error('A confirmação não é igual à nova senha.');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(LOGIN_REQUIRED ? {} : { 'x-unica-demo': getDemoId() }),
        },
        body: JSON.stringify({ current, next, email: user.email }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        toast.error(body.error === 'invalid' ? 'A senha atual não confere.' : body.error === 'same' ? 'Escolha uma senha diferente da atual.' : 'Não foi possível redefinir a senha.');
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Senha redefinida.');
    } catch {
      toast.error('Não foi possível redefinir a senha.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <PageFrame>
      <PageHero
        icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
        title="Configurações"
        subtitle="Preferências da conta na Única Conecta."
      />
      <section className="mt-6 rounded-[28px] border border-gray-100 bg-white px-6 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-bold text-gray-800">Conta</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3.5"><dt className="text-sm text-gray-500">Nome</dt><dd className="mt-1 font-semibold text-gray-800">{user.name}</dd></div>
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3.5"><dt className="text-sm text-gray-500">E-mail</dt><dd className="mt-1 font-semibold text-gray-800">{user.email}</dd></div>
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3.5"><dt className="text-sm text-gray-500">Cargo</dt><dd className="mt-1 font-semibold text-gray-800">{user.role}</dd></div>
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-3.5"><dt className="text-sm text-gray-500">Área</dt><dd className="mt-1 font-semibold text-gray-800">{user.department}</dd></div>
        </dl>
      </section>

      <section className="mt-4 rounded-[28px] border border-gray-100 bg-white px-6 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-bold text-gray-800">Cor da plataforma</h2>
        <p className="mt-1 text-sm text-gray-500">A cor escolhida passa a valer nos botões e na barra lateral.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {COLORS.map((item) => (
            <button key={item} type="button" aria-label={`Usar a cor ${item}`} aria-pressed={color.toLowerCase() === item.toLowerCase()} onClick={() => paint(item)} className="h-11 w-11 rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]" style={{ background: item, boxShadow: color.toLowerCase() === item.toLowerCase() ? `0 0 0 3px #fff, 0 0 0 5px ${item}` : undefined }} />
          ))}
          <label className="relative inline-flex h-11 items-center rounded-2xl bg-white px-4 text-base font-semibold text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            Outra cor
            <input type="color" aria-label="Escolher outra cor" value={HEX(color)} onChange={(event) => paint(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-gray-100 bg-white px-6 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-bold text-gray-800">Foto de perfil</h2>
        <div className="mt-4 flex items-center gap-4">
          <img src={photo} alt="" className="h-16 w-16 rounded-full bg-[#F8FAFC] object-cover" />
          <label className="relative inline-flex h-11 cursor-pointer items-center rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25">
            {savingPhoto ? 'Enviando...' : 'Escolher foto'}
            <input type="file" accept="image/*" aria-label="Escolher foto de perfil" disabled={savingPhoto} className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => { const next = event.target.files?.[0]; event.target.value = ''; if (next) setCropFile(next); }} />
          </label>
        </div>
      </section>

      <section className="mt-4 rounded-[28px] border border-gray-100 bg-white px-6 py-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h2 className="text-lg font-bold text-gray-800">Redefinir senha</h2>
        <form className="mt-4 grid max-w-md gap-3" onSubmit={(event) => void onPassword(event)}>
          <label className="grid gap-1 text-sm font-semibold text-gray-600">
            Senha atual
            <input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} className="h-11 rounded-2xl border border-gray-100 bg-[#F8FAFC] px-3 text-base font-medium text-gray-800 outline-none" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-gray-600">
            Nova senha
            <input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} className="h-11 rounded-2xl border border-gray-100 bg-[#F8FAFC] px-3 text-base font-medium text-gray-800 outline-none" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-gray-600">
            Confirmar nova senha
            <input type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} className="h-11 rounded-2xl border border-gray-100 bg-[#F8FAFC] px-3 text-base font-medium text-gray-800 outline-none" />
          </label>
          <button type="submit" disabled={savingPassword} className="mt-1 inline-flex h-11 w-fit items-center rounded-2xl bg-blue-600 px-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 disabled:opacity-40">
            {savingPassword ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </section>
      {isLeader(user) ? <div className="mt-4"><ManagementSettingsPage embedded /></div> : null}
      {cropFile ? (
        <ImageCrop
          file={cropFile}
          lock="circular"
          onCancel={() => setCropFile(null)}
          onConfirm={(ready) => { setCropFile(null); void onPhoto(ready); }}
        />
      ) : null}
    </PageFrame>
  );
};

function HEX(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#2563EB';
}
