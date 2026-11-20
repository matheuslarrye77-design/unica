import { type FC, type FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

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
    setAssigneeOpen(false);
  }, [open, activity, categories]);

  useEffect(() => {
    if (!assigneeOpen) return;
    function close(event: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) setAssigneeOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [assigneeOpen]);

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

  const field = 'h-[42px] w-full rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 text-sm shadow-none outline-none focus:border-[#9b82ff] focus:bg-white';
  const legend = 'mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase';
  const initials = assignee.split(' ').map((part) => part[0]).slice(0, 2).join('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-slate-900/25 backdrop-blur-md" className="rounded-[22px] border-0 p-[22px] shadow-[0_30px_80px_-20px_rgba(79,51,184,0.35),0_2px_6px_rgba(31,27,46,0.06)] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">{mode === 'create' ? 'Nova atividade' : 'Editar atividade'}</DialogTitle>
          <DialogDescription className="text-[13px] text-[#8a85a0]">
            {mode === 'create' ? 'A atividade entra na coluna escolhida.' : 'Atualize os dados desta atividade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3.5">
          <div>
            <Label htmlFor="atividade-titulo" className={legend}>Título</Label>
            <Input id="atividade-titulo" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Nome da atividade" className={field} />
            {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
          </div>
          <div>
            <Label htmlFor="atividade-descricao" className={legend}>Descrição</Label>
            <Textarea id="atividade-descricao" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o que precisa ser feito" className="grow-note short rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] text-sm focus:border-[#9b82ff] focus:bg-white" />
          </div>
          <div ref={assigneeRef} className="relative">
            <span className={legend}>Responsável</span>
            <button type="button" aria-haspopup="listbox" aria-expanded={assigneeOpen} onClick={() => setAssigneeOpen((value) => !value)} className={`${field} flex items-center gap-2.5 text-left`}>
              <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[10px] font-bold text-[#4f33b8]">{initials}</span>
              <span className="min-w-0 flex-1 truncate">{assignee}</span>
              <ChevronDown className={`h-4 w-4 text-[#8a85a0] transition-transform ${assigneeOpen ? 'rotate-180' : ''}`} />
            </button>
            {assigneeOpen ? (
              <div role="listbox" className="absolute right-0 left-0 z-20 mt-1 max-h-[184px] overflow-y-auto rounded-[22px] bg-white p-1.5 shadow-[14px_14px_30px_#d8d2ee,-8px_-8px_22px_#fff,0_0_0_1px_#e8e4f4]">
                {ACTIVITY_ASSIGNEES.map((person) => {
                  const mark = person.split(' ').map((part) => part[0]).slice(0, 2).join('');
                  const on = person === assignee;
                  return (
                    <button key={person} type="button" role="option" aria-selected={on} onClick={() => { setAssignee(person); setAssigneeOpen(false); }} className={`flex w-full items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-left text-[13.5px] ${on ? 'font-semibold text-[#4f33b8] shadow-[3px_3px_8px_#d8d2ee,-3px_-3px_8px_#fff]' : 'hover:shadow-[3px_3px_8px_#d8d2ee,-3px_-3px_8px_#fff]'}`}>
                      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#ece6ff] text-[10px] font-bold text-[#4f33b8]">{mark}</span>
                      {person}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div>
            <span className={legend}>Prioridade</span>
            <div className="flex items-center gap-1.5">
              {priorities.map((item) => {
                const dot = item === 'high' ? '#e5484d' : item === 'medium' ? '#f5a524' : '#4cb782';
                const on = priority === item;
                return (
                  <button key={item} type="button" aria-pressed={on} onClick={() => setPriority(item)} className={`choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[13px] outline-none ${on ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? '#fff' : dot }} />
                    {PRIORITY_LABEL[item]}
                  </button>
                );
              })}
            </div>
          </div>
          {leadership ? (
            <div>
              <span className={legend}>Quem vê a missão</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CHANNEL_LABEL) as MissionChannel[]).map((item) => (
                  <button key={item} type="button" aria-pressed={channel === item} onClick={() => setChannel(item)} className={`h-11 rounded-2xl px-4 text-base font-semibold ${channel === item ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white text-gray-600 shadow-[0_8px_24px_rgba(15,23,42,0.06)]'}`}>
                    {CHANNEL_LABEL[item]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <Label htmlFor="atividade-prazo" className={legend}>Prazo</Label>
            <Input id="atividade-prazo" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={field} />
          </div>
          <div className="mt-1 flex justify-end gap-2 border-t border-[#e8e4f4] pt-3.5">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-[11px] px-5 py-2.5 text-sm font-semibold text-[#4a4560] hover:bg-[#f6f3ff]">Cancelar</button>
            <button type="submit" className="rounded-[11px] bg-[#6644e0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] hover:bg-[#4f33b8]">{mode === 'create' ? 'Criar atividade' : 'Salvar'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
