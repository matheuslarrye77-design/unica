import { type FC, type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ACTIVITY_ASSIGNEES, CHANNEL_LABEL, PRIORITY_LABEL, missionChannel, type Activity, type ActivityDraft, type ActivityPriority, type ActivityStatus, type MissionChannel } from '@/data/activities';

const priorities: ActivityPriority[] = ['high', 'medium', 'low'];

export const ActivityDialog: FC<{
  open: boolean;
  mode: 'create' | 'edit';
  activity: Activity | null;
  status: ActivityStatus;
  categories: string[];
  leadership?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: ActivityDraft) => void;
}> = ({ open, mode, activity, status, categories, leadership = false, onOpenChange, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(ACTIVITY_ASSIGNEES[0]);
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [category, setCategory] = useState(categories[0] ?? 'Geral');
  const [customCategory, setCustomCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [channel, setChannel] = useState<MissionChannel>('chat');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(activity?.title ?? '');
    setDescription(activity?.description ?? '');
    setAssignee(activity?.assignee ?? ACTIVITY_ASSIGNEES[0]);
    setPriority(activity?.priority ?? 'medium');
    setCategory(activity?.category ?? categories[0] ?? 'Geral');
    setCustomCategory('');
    setDueDate(activity?.dueDate ?? '');
    setChannel(activity ? (missionChannel(activity) ?? 'chat') : 'chat');
    setError('');
  }, [open, activity, categories]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Informe o título da atividade.');
      return;
    }
    const nextCategory = leadership ? CHANNEL_LABEL[channel] : (customCategory.trim() || category || 'Pessoal');
    onSubmit({
      title,
      description,
      assignee,
      priority,
      category: nextCategory,
      channel: leadership ? channel : null,
      dueDate: dueDate || null,
      status: activity?.status ?? status,
    });
  }

  const field = '!h-11 w-full rounded-2xl border-gray-100 bg-white text-base';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-slate-900/25 backdrop-blur-md" className="rounded-2xl border border-gray-100 shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-gray-800">{mode === 'create' ? 'Nova atividade' : 'Editar atividade'}</DialogTitle>
          <DialogDescription className="text-base text-gray-500">
            {mode === 'create' ? 'A atividade entra na coluna escolhida.' : 'Atualize os dados desta atividade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="atividade-titulo" className="text-sm font-medium text-gray-600">Título</Label>
            <Input id="atividade-titulo" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome da atividade" className={field} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="atividade-descricao" className="text-sm font-medium text-gray-600">Descrição</Label>
            <Textarea id="atividade-descricao" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Descreva o que precisa ser feito" className="rounded-2xl border-gray-100 bg-white text-base" />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-gray-600">Responsável</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className={`${field} w-full`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_ASSIGNEES.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Prioridade</Label>
            <div className="flex gap-1.5">
              {priorities.map((item) => {
                const dot = item === 'high' ? '#e5484d' : item === 'medium' ? '#f5a524' : '#4cb782';
                const on = priority === item;
                return (
                  <button key={item} type="button" aria-pressed={on} onClick={() => setPriority(item)} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] text-[13px] outline-none ${on ? 'h-[46px] bg-[#6644e0] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? '#fff' : dot }} />
                    {PRIORITY_LABEL[item]}
                  </button>
                );
              })}
            </div>
          </div>
          {leadership ? (
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-gray-600">Quem vê a missão</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_LABEL) as MissionChannel[]).map((item) => (
                  <button key={item} type="button" aria-pressed={channel === item} onClick={() => setChannel(item)} className={`h-11 rounded-2xl px-4 text-base font-semibold ${channel === item ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'}`}>
                    {CHANNEL_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="atividade-prazo" className="text-sm font-medium text-gray-600">Prazo</Label>
            <Input id="atividade-prazo" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={field} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 rounded-2xl px-4 text-base" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="h-11 rounded-2xl px-4 text-base">{mode === 'create' ? 'Criar atividade' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
