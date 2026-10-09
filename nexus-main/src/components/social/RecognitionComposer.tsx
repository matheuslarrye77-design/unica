import { Button } from '@/components/ui/button';
import { directoryPeople, assertPermission } from '@/lib/institution';
import { actor } from '@/lib/session';
import { createFeedPost } from '@/lib/feed';
import { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';

const tags = ['Colaboração', 'Atendimento', 'Entrega', 'Cultura'];

export const RecognitionComposer: FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const user = actor();
  const [personId, setPersonId] = useState('');
  const [tag, setTag] = useState(tags[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const person = directoryPeople.find((item) => item.id === personId);
    const text = message.trim();
    if (!person || !text) return;
    setSending(true);
    try {
      await assertPermission('recognition');
      await createFeedPost({ body: text, kind: 'recognition', recognizedName: person.name, tag });
      setMessage('');
      setPersonId('');
      onCreated();
      toast.success('Reconhecimento publicado.');
    } catch (error) {
      toast.error(error instanceof Error && error.message === '403' ? 'Você não tem permissão para reconhecer.' : 'Não foi possível publicar o reconhecimento.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(40,20,70,0.05)]">
      <div className="flex gap-3">
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">Reconheça alguém da equipe</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Pessoa reconhecida
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={personId} onChange={(event) => setPersonId(event.target.value)} required>
            <option value="">Selecione</option>
            {directoryPeople.filter((person) => person.id !== user.id).map((person) => (
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
      <label className="mt-3 grid gap-1 text-sm">
        Mensagem
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} required placeholder="Escreva o agradecimento" className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-[15px] leading-6 outline-none placeholder:text-muted-foreground focus-visible:border-primary" />
      </label>
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" disabled={sending || !personId || !message.trim()}>Publicar</Button>
      </div>
    </form>
  );
};
