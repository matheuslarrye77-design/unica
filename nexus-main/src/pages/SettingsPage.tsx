import { ImageCrop } from '@/components/journal/ImageCrop';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { profilePhoto, setPlatformColor, setProfilePhoto, storedColor } from '@/lib/appearance';
import { actor, getDemoId } from '@/lib/session';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { isLeader } from '@/lib/institution';
import { ManagementSettingsPage } from '@/pages/ManagementSettingsPage';
import { Camera, Settings } from 'lucide-react';
import { forgetSticker, listStickers, saveSticker, type SavedSticker } from '@/lib/stickers';
import { useEffect, useState, type FC, type FormEvent } from 'react';
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

  const card = 'rounded-[22px] bg-white p-6 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]';
  const row = 'grid grid-cols-[108px_1fr] items-center gap-3 border-t border-[#e8e4f4] first:border-t-0';
  const field = 'h-[54px] w-full border-0 bg-transparent px-0 text-sm font-medium text-[#1f1b2e] outline-none focus:shadow-[inset_0_-2px_0_#7c5cf5]';

  return (
    <PageFrame>
      <PageHero
        icon={<Settings className="h-5 w-5" strokeWidth={1.75} />}
        title="Configurações"
        subtitle="Gerencie seu perfil, a cor da plataforma, as notificações e a galeria de figurinhas."
      />
      <section className={`mt-6 flex flex-col items-center px-6 py-8 text-center ${card}`}>
        <div className="relative mb-4 h-[150px] w-[150px]">
          <img src={photo} alt="" className="h-[150px] w-[150px] rounded-full bg-[#ece6ff] object-cover shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_4px_#fff,0_0_0_5px_#d9ccff]" />
          <label className="absolute right-1 bottom-1 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-[3px] border-white bg-[#6644e0] text-white shadow-[0_8px_16px_-6px_rgba(102,68,224,0.8)]">
            <Camera className="h-[18px] w-[18px]" />
            <input id="foto-perfil" type="file" accept="image/*" aria-label="Alterar foto de perfil" disabled={savingPhoto} className="absolute inset-0 cursor-pointer opacity-0" onChange={(event) => { const nextFile = event.target.files?.[0]; event.target.value = ''; if (nextFile) setCropFile(nextFile); }} />
          </label>
        </div>
        <div className="text-xl font-bold tracking-tight text-[#1f1b2e]">{user.name}</div>
        <div className="mt-0.5 text-[13px] text-[#8a85a0]">{user.role} · {user.department}</div>
        <button type="button" className="mt-2 rounded-lg px-3 py-2 text-sm font-bold text-[#6644e0] hover:bg-[#f6f3ff]" onClick={() => document.getElementById('foto-perfil')?.click()}>{savingPhoto ? 'Enviando foto...' : 'Alterar foto de perfil'}</button>
        {photo.startsWith('data:image/') ? <button type="button" className="text-[13px] font-semibold text-[#8a85a0] hover:text-[#e5484d]" onClick={() => { setProfilePhoto(''); setPhoto(user.avatar); toast.success('Foto removida'); }}>Remover foto</button> : null}
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-base font-bold text-[#1f1b2e]">Dados pessoais</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">Nome, e-mail, cargo e área vêm da empresa e não mudam por aqui.</p>
        <div className="mt-4">
          <div className={row}><span className="text-[13.5px] font-semibold">Nome</span><input className={field} value={user.name} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">E-mail</span><input className={field} value={user.email} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">Cargo</span><input className={field} value={user.role} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">Área</span><input className={field} value={user.department} readOnly /></div>
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-base font-bold text-[#1f1b2e]">Cor da plataforma</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">A cor escolhida passa a valer nos botões e na barra lateral.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {COLORS.map((item) => (
            <button key={item} type="button" aria-label={`Usar a cor ${item}`} aria-pressed={color.toLowerCase() === item.toLowerCase()} onClick={() => paint(item)} className="h-11 w-11 rounded-full" style={{ background: item, boxShadow: color.toLowerCase() === item.toLowerCase() ? `0 0 0 2px #fff, 0 0 0 4px ${item}` : '0 0 0 1px rgba(0,0,0,.07)' }} />
          ))}
          <label className="relative inline-flex h-11 items-center rounded-[11px] bg-white px-4 text-sm font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4]">
            Outra cor
            <input type="color" aria-label="Escolher outra cor" value={HEX(color)} onChange={(event) => paint(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-base font-bold text-[#1f1b2e]">Trocar senha</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">Use pelo menos 8 caracteres.</p>
        <form className="mt-2" onSubmit={(event) => void onPassword(event)}>
          <label className={row}><span className="text-[13.5px] font-semibold">Senha atual</span><input type="password" autoComplete="current-password" placeholder="Senha atual" value={current} onChange={(event) => setCurrent(event.target.value)} className={field} /></label>
          <label className={row}><span className="text-[13.5px] font-semibold">Nova senha</span><input type="password" autoComplete="new-password" placeholder="Nova senha" value={next} onChange={(event) => setNext(event.target.value)} className={field} /></label>
          <label className={row}><span className="text-[13.5px] font-semibold">Confirmar</span><input type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={field} /></label>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={savingPassword} className="inline-flex h-11 items-center rounded-[11px] bg-[#6644e0] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] disabled:opacity-40">
              {savingPassword ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>
      <SettingsExtras />
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

const NOTIFS = [
  { id: 'mencoes', title: 'Menções', detail: 'Quando alguém mencionar você.' },
  { id: 'comentarios', title: 'Comentários nas suas publicações', detail: 'Quando alguém comentar em algo que você publicou.' },
  { id: 'reacoes', title: 'Reações nas suas publicações', detail: 'Quando alguém reagir a algo que você publicou.' },
  { id: 'respostas', title: 'Respostas às suas sugestões', detail: 'Quando a gestão ou o suporte responder uma sugestão sua.' },
];

const SettingsExtras: FC = () => {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('unica-notif-prefs') ?? '{}') as Record<string, boolean>;
      return Object.fromEntries(NOTIFS.map((item) => [item.id, saved[item.id] !== false]));
    } catch {
      return Object.fromEntries(NOTIFS.map((item) => [item.id, true]));
    }
  });
  const [stickers, setStickers] = useState<SavedSticker[]>([]);
  useEffect(() => {
    void listStickers().then(setStickers).catch(() => setStickers([]));
  }, []);

  function toggle(id: string) {
    setPrefs((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem('unica-notif-prefs', JSON.stringify(next));
      return next;
    });
  }

  return (
    <>
      <section className="mt-4 rounded-[22px] bg-white p-6 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
        <h2 className="text-base font-bold text-[#1f1b2e]">Notificações</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">Escolha sobre o que você quer ser avisado. A escolha fica salva neste navegador.</p>
        <div className="mt-2">
          {NOTIFS.map((item) => (
            <label key={item.id} className="flex items-center gap-3 border-t border-[#e8e4f4] py-3.5 first:border-t-0">
              <span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{item.title}</b><span className="text-[12.5px] text-[#8a85a0]">{item.detail}</span></span>
              <input type="checkbox" className="peer sr-only" checked={prefs[item.id] !== false} onChange={() => toggle(item.id)} />
              <span className="relative h-5 w-[34px] shrink-0 rounded-full bg-[#d9d5e8] transition peer-checked:bg-[#7c5cf5] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-3.5" />
              <span className="w-7 text-[12.5px] font-semibold text-[#8a85a0] peer-checked:text-[#4f33b8]">{prefs[item.id] !== false ? 'Sim' : 'Não'}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="mt-4 rounded-[22px] bg-white p-6 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
        <h2 className="text-base font-bold text-[#1f1b2e]">Galeria de figurinhas</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">{stickers.length ? `${stickers.length} ${stickers.length === 1 ? 'figurinha' : 'figurinhas'} na sua galeria.` : 'Adicione figurinhas para usar nos comentários e no mural.'}</p>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3.5">
          {stickers.map((item) => (
            <div key={item.id} className="group relative grid aspect-square place-items-center overflow-hidden rounded-[22px] bg-white shadow-[5px_5px_12px_#d8d2ee,-4px_-4px_10px_#fff,0_0_0_1px_#e8e4f4]">
              <img src={item.url} alt="" className="h-full w-full object-contain p-2.5" />
              <button type="button" aria-label="Remover figurinha" className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[#8a85a0] opacity-0 shadow group-hover:opacity-100 hover:text-[#e5484d]" onClick={() => { void forgetSticker(item.url).then(() => setStickers((current) => current.filter((sticker) => sticker.id !== item.id))); }}>×</button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[22px] border-[1.5px] border-dashed border-[#d9ccff] bg-[#f6f3ff] text-[12.5px] font-semibold text-[#6644e0] hover:bg-[#ece6ff]">
            Adicionar
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = '';
              void Promise.all(files.map((file) => saveSticker(file))).then((saved) => {
                setStickers((current) => [...saved, ...current.filter((item) => !saved.some((next) => next.url === item.url))]);
                toast.success(saved.length > 1 ? 'Figurinhas adicionadas' : 'Figurinha adicionada');
              }).catch(() => toast.error('Não foi possível guardar a figurinha.'));
            }} />
          </label>
        </div>
      </section>
    </>
  );
};

function HEX(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#2563EB';
}
