import { type FC, type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ACTIVITY_ASSIGNEES, PRIORITY_LABEL, type Activity, type ActivityDraft, type ActivityPriority, type ActivityStatus } from '@/data/activities';

const priorities: ActivityPriority[] = ['high', 'medium', 'low'];

export const ActivityDialog: FC<{
  open: boolean;
  mode: 'create' | 'edit';
  activity: Activity | null;
  status: ActivityStatus;
  categories: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: ActivityDraft) => void;
}> = ({ open, mode, activity, status, categories, onOpenChange, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(ACTIVITY_ASSIGNEES[0]);
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [category, setCategory] = useState(categories[0] ?? 'Geral');
  const [customCategory, setCustomCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
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
    setError('');
  }, [open, activity, categories]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Informe o título da atividade.');
      return;
    }
    const nextCategory = customCategory.trim() || category;
    onSubmit({
      title,
      description,
      assignee,
      priority,
      category: nextCategory,
      dueDate: dueDate || null,
      status: activity?.status ?? status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova atividade' : 'Editar atividade'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'A atividade entra na coluna escolhida.' : 'Atualize os dados desta atividade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="atividade-titulo">Título</Label>
            <Input id="atividade-titulo" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nome da atividade" />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="atividade-descricao">Descrição</Label>
            <Textarea id="atividade-descricao" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Descreva o que precisa ser feito" />
          </div>
          <div className="grid gap-2">
            <Label>Responsável</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_ASSIGNEES.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as ActivityPriority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((item) => <SelectItem key={item} value={item}>{PRIORITY_LABEL[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="atividade-categoria">Nova categoria</Label>
            <Input id="atividade-categoria" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Opcional. Substitui a categoria selecionada" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="atividade-prazo">Prazo</Label>
            <Input id="atividade-prazo" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{mode === 'create' ? 'Criar atividade' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
