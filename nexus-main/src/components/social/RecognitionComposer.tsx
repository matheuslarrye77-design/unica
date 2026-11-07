import { AttachPhotos } from '@/components/social/AttachPhotos';
import { Button } from '@/components/ui/button';
import { teamRoster } from '@/data/team';
import { createFeedPost } from '@/lib/feed';
import { recognitionHeadline } from '@/lib/recognitionText';
import { actor } from '@/lib/session';
import { Loader2 } from 'lucide-react';
import { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

const tags = ['Colaboração', 'Atendimento', 'Entrega', 'Cultura'];

export type RecognitionDraft = {
  name: string;
  fromName: string;
  message: string;
  tag: string;
  caption: string;
  comment: string;
  photos: string[];
  received: boolean;
};

export const RecognitionComposer: FC<{
  onCreated: (created?: RecognitionDraft) => void;
  publishToFeed?: boolean;
  onCancel?: () => void;
}> = ({ onCreated, publishToFeed = true, onCancel }) => {
  const user = actor();
  const [mode, setMode] = useState<'give' | 'received'>('give');
  const [personId, setPersonId] = useState('');
  const [tag, setTag] = useState(tags[0]);
  const [message, setMessage] = useState('');
  const [caption, setCaption] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const others = teamRoster.filter((person) => person.id !== user.id);
  const headline = (() => {
    const person = teamRoster.find((item) => item.id === personId);
    if (!person) return mode === 'received' ? `${user.name.split(' ')[0]} recebeu um reconhecimento especial!` : '';
    if (mode === 'received') return recognitionHeadline(person.name, user.name, true);
    return recognitionHeadline(user.name, person.name, false);
  })();

  function reset() {
    setPersonId('');
    setMessage('');
    setCaption('');
    setComment('');
    setPhotos([]);
    setMode('give');
    setTag(tags[0]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    const person = teamRoster.find((item) => item.id === personId);
    const text = message.trim();
    if (!person || !text) return;
    const received = mode === 'received';
    const recognizedName = received ? user.name : person.name;
    const fromName = received ? person.name : user.name;
    setSending(true);
    try {
      if (publishToFeed) {
        await createFeedPost({
          body: text,
          kind: 'recognition',
          recognizedName,
          recognizedBy: fromName,
          receivedRecognition: received,
          tag,
          caption: caption.trim() || undefined,
          comment: comment.trim() || undefined,
          images: photos,
          bannerTitle: recognitionHeadline(fromName, recognizedName, received),
          nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        });
      }
      const draft: RecognitionDraft = {
        name: recognizedName,
        fromName,
        message: text,
        tag,
        caption: caption.trim(),
        comment: comment.trim(),
        photos,
        received,
      };
      reset();
      onCreated(draft);
      toast.success(publishToFeed ? 'Reconhecimento publicado no mural.' : 'Reconhecimento publicado.');
    } catch (error) {
      toast.error(error instanceof Error && (error.message === '403' || /permissão/i.test(error.message)) ? 'Você não tem permissão para reconhecer.' : (error instanceof Error && error.message && !/^\d+$/.test(error.message) ? error.message : 'Não foi possível publicar o reconhecimento.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3">
      <div className="flex gap-3">
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{mode === 'received' ? 'Compartilhe um reconhecimento que você recebeu' : 'Reconheça alguém da equipe'}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-[#F3E4FA] p-1">
        <button type="button" onClick={() => setMode('give')} className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${mode === 'give' ? 'bg-[#8E35B8] text-white' : 'text-[#6A228C]'}`}>Reconhecer alguém</button>
        <button type="button" onClick={() => setMode('received')} className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${mode === 'received' ? 'bg-[#8E35B8] text-white' : 'text-[#6A228C]'}`}>Reconhecimento recebido</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          {mode === 'received' ? 'Quem reconheceu você' : 'Pessoa reconhecida'}
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={personId} onChange={(event) => setPersonId(event.target.value)} required>
            <option value="">Selecione</option>
            {others.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Etiqueta
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={tag} onChange={(event) => setTag(event.target.value)}>
            {tags.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      {headline ? <p className="rounded-xl bg-[#F8EAFB] px-3 py-2 text-[13px] font-medium text-[#6A228C]">{headline}</p> : null}
      <label className="grid gap-1 text-sm">
        Mensagem principal
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} required placeholder="Escreva o agradecimento" className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-[15px] leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-primary" />
      </label>
      <label className="grid gap-1 text-sm">
        Legenda
        <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={2} placeholder="Opcional" className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-2 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-primary" />
      </label>
      <label className="grid gap-1 text-sm">
        Comentário complementar
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Opcional" className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-2 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-primary" />
      </label>
      <AttachPhotos urls={photos} onChange={setPhotos} />
      <div className="mt-1 flex justify-end gap-2">
        {onCancel ? <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={onCancel}>Cancelar</Button> : null}
        <Button type="submit" size="sm" disabled={sending || !personId || !message.trim()}>
          {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Publicar
        </Button>
      </div>
    </form>
  );
};
