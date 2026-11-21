import { ImageCrop } from '@/components/journal/ImageCrop';
import { PageHero } from '@/components/social/LilacWash';
import { PageFrame } from '@/components/shell/PageFrame';
import { profilePhoto, setPlatformColor, setProfilePhoto, storedColor } from '@/lib/appearance';
import { actor, getDemoId } from '@/lib/session';
import { LOGIN_REQUIRED } from '@/lib/loginGate';
import { isLeader, saveRamal, useInstitution } from '@/lib/institution';
import { ManagementSettingsPage } from '@/pages/ManagementSettingsPage';
import { AtSign, Camera, Mail, MessageSquare, Plus, Reply, Settings, Smile } from 'lucide-react';
import { forgetSticker, listStickers, saveSticker, type SavedSticker } from '@/lib/stickers';
import { useEffect, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const COLORS = ['#2563EB', '#6B33F6', '#0F766E', '#DB2777', '#C2410C', '#111827'];
const SUBSETORES = ['Chat', 'E-mail', 'Ligação'] as const;
type Subsetor = (typeof SUBSETORES)[number];

function readSubsetor(): Subsetor {
  const saved = localStorage.getItem('unica-subsetor');
  return SUBSETORES.includes(saved as Subsetor) ? saved as Subsetor : 'Chat';
}

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
  const [pwMessage, setPwMessage] = useState('');
  const [pwBad, setPwBad] = useState<'current' | 'next' | 'confirm' | ''>('');
  const institution = useInstitution();
  const [ramal, setRamal] = useState('');
  const [ramalReady, setRamalReady] = useState(false);
  const [ramalError, setRamalError] = useState(false);
  const [subsetor, setSubsetor] = useState<Subsetor>(readSubsetor);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!institution.ready || ramalReady) return;
    setRamal(institution.people[user.id]?.ramal ?? '');
    setRamalReady(true);
  }, [institution.ready, institution.people, ramalReady, user.id]);

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

  async function saveProfile() {
    const value = ramal.trim();
    if (!/^\d{3,6}$/.test(value)) {
      setRamalError(true);
      return;
    }
    setSavingProfile(true);
    try {
      await saveRamal(user.id, value);
      localStorage.setItem('unica-subsetor', subsetor);
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o ramal.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    if (savingPassword) return;
    setPwMessage('');
    setPwBad('');
    if (!current) {
      setPwBad('current');
      setPwMessage('Informe a senha atual.');
      return;
    }
    if (next.length < 8) {
      setPwBad('next');
      setPwMessage('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (next === current) {
      setPwBad('next');
      setPwMessage('A nova senha deve ser diferente da atual.');
      return;
    }
    if (next !== confirm) {
      setPwBad('confirm');
      setPwMessage('A confirmação não confere com a nova senha.');
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
        if (body.error === 'invalid') {
          setPwBad('current');
          setPwMessage('A senha atual não confere.');
        } else if (body.error === 'same') {
          setPwBad('next');
          setPwMessage('A nova senha deve ser diferente da atual.');
        } else {
          setPwMessage('Não foi possível redefinir a senha.');
        }
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
        subtitle="Gerencie seu perfil, suas notificações e sua galeria de figurinhas."
      />
      <section className={`mt-6 flex flex-col items-center px-6 py-8 text-center ${card}`}>
        <div className="relative mb-4 h-[150px] w-[150px]">
          <button type="button" aria-label="Alterar foto de perfil" className="h-[150px] w-[150px] overflow-hidden rounded-full bg-[#ece6ff] shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_4px_#fff,0_0_0_5px_#d9ccff]" onClick={() => document.getElementById('foto-perfil')?.click()}>
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </button>
          <label className="absolute right-1 bottom-1 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-[3px] border-white bg-[#6644e0] text-white shadow-[0_8px_16px_-6px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8]">
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
        <p className="mt-1 text-[13px] text-[#5f5a78]">Nome e e-mail são definidos pela empresa e não podem ser alterados aqui.</p>
        <div className="mt-4">
          <div className={row}><span className="text-[13.5px] font-semibold">Nome</span><input className={`${field} cursor-not-allowed text-[#6b6682]`} value={user.name} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">E-mail</span><input className={`${field} cursor-not-allowed text-[#6b6682]`} value={user.email} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">Cargo</span><input className={`${field} cursor-not-allowed text-[#6b6682]`} value={user.role} readOnly /></div>
          <div className={row}><span className="text-[13.5px] font-semibold">Área</span><input className={`${field} cursor-not-allowed text-[#6b6682]`} value={user.department} readOnly /></div>
          <label className={row}>
            <span className="text-[13.5px] font-semibold">Ramal</span>
            <input inputMode="numeric" maxLength={6} placeholder="Ex.: 2045" value={ramal} onChange={(event) => { setRamal(event.target.value.replace(/\D/g, '')); setRamalError(false); }} className={`${field} ${ramalError ? 'shadow-[inset_0_-2px_0_#e5484d]' : ''}`} />
          </label>
          <label className={row}>
            <span className="text-[13.5px] font-semibold">Subsetor</span>
            <select value={subsetor} onChange={(event) => setSubsetor(event.target.value as Subsetor)} className={`${field} cursor-pointer`}>
              {SUBSETORES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={savingProfile} onClick={() => void saveProfile()} className="inline-flex h-11 items-center rounded-[11px] bg-[#6644e0] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8] disabled:bg-[#d9ccff] disabled:shadow-none">
            {savingProfile ? 'Salvando...' : 'Salvar alterações'}
          </button>
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
          <label className={row}><span className="text-[13.5px] font-semibold">Senha atual</span><input type="password" autoComplete="current-password" placeholder="Senha atual" value={current} onChange={(event) => { setCurrent(event.target.value); setPwBad(''); setPwMessage(''); }} className={`${field} ${pwBad === 'current' ? 'shadow-[inset_0_-2px_0_#e5484d]' : ''}`} /></label>
          <label className={row}><span className="text-[13.5px] font-semibold">Nova senha</span><input type="password" autoComplete="new-password" placeholder="Nova senha" value={next} onChange={(event) => { setNext(event.target.value); setPwBad(''); setPwMessage(''); }} className={`${field} ${pwBad === 'next' ? 'shadow-[inset_0_-2px_0_#e5484d]' : ''}`} /></label>
          <label className={row}><span className="text-[13.5px] font-semibold">Confirmar</span><input type="password" autoComplete="new-password" placeholder="Repita a nova senha" value={confirm} onChange={(event) => { setConfirm(event.target.value); setPwBad(''); setPwMessage(''); }} className={`${field} ${pwBad === 'confirm' ? 'shadow-[inset_0_-2px_0_#e5484d]' : ''}`} /></label>
          {pwMessage ? <p className="mt-2 text-xs text-[#e5484d]">{pwMessage}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-[11px] bg-white px-5 text-sm font-semibold text-[#4a4560] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff,0_0_0_1px_#e8e4f4] hover:bg-[#f6f3ff] hover:text-[#4f33b8]" onClick={() => toast.message('O site ainda não envia e-mail. Altere a senha neste formulário.')}>
              <Mail className="h-4 w-4" />
              Enviar e-mail de redefinição
            </button>
            <button type="submit" disabled={savingPassword} className="ml-auto inline-flex h-11 items-center rounded-[11px] bg-[#6644e0] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8] disabled:bg-[#d9ccff] disabled:shadow-none">
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
  { id: 'mencoes', title: 'Menções', detail: 'Quando alguém mencionar você.', icon: AtSign },
  { id: 'comentarios', title: 'Comentários nas suas publicações', detail: 'Quando alguém comentar em algo que você publicou.', icon: MessageSquare },
  { id: 'reacoes', title: 'Reações nas suas publicações', detail: 'Quando alguém reagir a algo que você publicou.', icon: Smile },
  { id: 'respostas', title: 'Respostas às suas sugestões', detail: 'Quando a gestão ou o suporte responder uma sugestão sua.', icon: Reply },
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
      const enabled = current[id] === false;
      const next = { ...current, [id]: enabled };
      localStorage.setItem('unica-notif-prefs', JSON.stringify(next));
      toast.success(enabled ? 'Notificação ativada' : 'Notificação desativada');
      return next;
    });
  }

  return (
    <>
      <section className="mt-4 rounded-[22px] bg-white p-6 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
        <h2 className="text-base font-bold text-[#1f1b2e]">Notificações</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">Escolha sobre o que você quer ser avisado. As alterações são salvas na hora.</p>
        <div className="mt-2">
          {NOTIFS.map((item) => {
            const Icon = item.icon;
            return (
            <label key={item.id} className="flex items-center gap-3.5 border-t border-[#e8e4f4] py-3.5 first:border-t-0">
              <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[#4f33b8]"><Icon className="h-[18px] w-[18px]" /></span>
              <span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{item.title}</b><span className="text-[12.5px] text-[#8a85a0]">{item.detail}</span></span>
              <input type="checkbox" className="peer sr-only" checked={prefs[item.id] !== false} onChange={() => toggle(item.id)} />
              <span className="relative h-5 w-[34px] shrink-0 rounded-full bg-[#d9d5e8] transition peer-checked:bg-[#7c5cf5] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-3.5" />
              <span className="w-7 text-[12.5px] font-semibold text-[#8a85a0] peer-checked:text-[#4f33b8]">{prefs[item.id] !== false ? 'Sim' : 'Não'}</span>
            </label>
            );
          })}
        </div>
      </section>
      <section className="mt-4 rounded-[22px] bg-white p-6 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
        <h2 className="text-base font-bold text-[#1f1b2e]">Galeria de figurinhas</h2>
        <p className="mt-1 text-[13px] text-[#5f5a78]">{stickers.length ? `${stickers.length} ${stickers.length === 1 ? 'figurinha' : 'figurinhas'} na sua galeria. Passe o mouse para remover.` : 'Adicione figurinhas para usar nos comentários e no chat.'}</p>
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-3.5">
          {stickers.map((item) => (
            <div key={item.id} className="group relative grid aspect-square place-items-center overflow-hidden rounded-[22px] bg-white shadow-[5px_5px_12px_#d8d2ee,-4px_-4px_10px_#fff,0_0_0_1px_#e8e4f4] transition hover:-translate-y-0.5">
              <img src={item.url} alt="Figurinha" className="h-full w-full object-contain p-2.5" />
              <button type="button" aria-label="Remover figurinha" className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-[#8a85a0] opacity-0 shadow group-hover:opacity-100 focus-visible:opacity-100 hover:text-[#e5484d]" onClick={() => { void forgetSticker(item.url).then(() => { setStickers((current) => current.filter((sticker) => sticker.id !== item.id)); toast.success('Figurinha removida'); }); }}>×</button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[22px] border-[1.5px] border-dashed border-[#d9ccff] bg-[#f6f3ff] text-[12.5px] font-semibold text-[#6644e0] hover:border-[#9b82ff] hover:bg-[#ece6ff]">
            <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
            Adicionar
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = '';
              if (!files.length) return;
              void Promise.all(files.map((file) => saveSticker(file))).then((saved) => {
                setStickers((current) => [...saved, ...current.filter((item) => !saved.some((next) => next.url === item.url))]);
                toast.success(saved.length > 1 ? 'Figurinhas adicionadas' : 'Figurinha adicionada');
              }).catch((error: unknown) => toast.error(error instanceof Error && error.message === 'limit' ? 'A galeria aceita até 40 figurinhas.' : 'Não foi possível guardar a figurinha.'));
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
