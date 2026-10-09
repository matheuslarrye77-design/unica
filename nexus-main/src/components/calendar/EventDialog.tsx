import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { directoryPeople, saveBirthDate } from '@/lib/institution';
import { createEvent, notifyEvents, updateEvent, type AgendaEvent, type AgendaType } from '@/lib/events';
import { useEffect, useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';

const types: { id: AgendaType; label: string }[] = [
  { id: 'reuniao', label: 'Reunião' },
  { id: 'evento', label: 'Evento' },
  { id: 'aniversario', label: 'Aniversário' },
  { id: 'outro', label: 'Outro' },
];

const empty = {
  title: '',
  type: 'reuniao' as AgendaType,
  date: '',
  startTime: '',
  endTime: '',
  place: '',
  description: '',
  participantIds: [] as string[],
  personId: '',
  personName: '',
  avatar: '',
};

export const EventDialog: FC<{
  open: boolean;
  event: AgendaEvent | null;
  birthDates: Record<string, string | undefined>;
  onOpenChange: (open: boolean) => void;
}> = ({ open, event, birthDates, onOpenChange }) => {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setForm(event ? {
      title: event.title,
      type: event.type,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      place: event.place,
      description: event.description,
      participantIds: event.participantIds,
      personId: event.personId,
      personName: event.personName,
      avatar: event.avatar,
    } : empty);
  }, [open, event]);

  function choosePerson(id: string) {
    const person = directoryPeople.find((item) => item.id === id);
    if (!person) return;
    const known = birthDates[id];
    setForm((current) => ({
      ...current,
      personId: person.id,
      personName: person.name,
      avatar: person.avatar,
      title: `Aniversário de ${person.name}`,
      date: known || current.date,
    }));
  }

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    try {
      const saved = event
        ? await updateEvent(event.id, form)
        : await createEvent(form);
      if (saved.event.type === 'aniversario' && saved.event.personId && saved.event.date) {
        await saveBirthDate(saved.event.personId, saved.event.date).catch(() => undefined);
      }
      notifyEvents();
      toast.success(event ? 'Evento atualizado.' : 'Evento salvo.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error && error.message === '403' ? 'Somente a liderança pode alterar o calendário.' : 'Não foi possível salvar o evento.');
    }
  }

  const birthday = form.type === 'aniversario';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar evento' : 'Novo evento'}</DialogTitle>
        </DialogHeader>
        <form id="evento" className="grid gap-3" onSubmit={(submitEvent) => void submit(submitEvent)}>
          <div className="grid gap-1">
            <Label htmlFor="evento-tipo">Tipo</Label>
            <select id="evento-tipo" className="h-9 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(change) => setForm({ ...form, type: change.target.value as AgendaType })}>
              {types.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          {birthday ? (
            <div className="grid gap-1">
              <Label htmlFor="evento-pessoa">Colaborador</Label>
              <select id="evento-pessoa" className="h-9 rounded-md border bg-background px-3 text-sm" value={form.personId} onChange={(change) => choosePerson(change.target.value)} required>
                <option value="">Selecione</option>
                {directoryPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid gap-1">
              <Label htmlFor="evento-titulo">Título</Label>
              <Input id="evento-titulo" value={form.title} onChange={(change) => setForm({ ...form, title: change.target.value })} required />
            </div>
          )}
          <div className="grid gap-1">
            <Label htmlFor="evento-data">{birthday ? 'Data de nascimento' : 'Data'}</Label>
            <Input id="evento-data" type="date" value={form.date} onChange={(change) => setForm({ ...form, date: change.target.value })} required />
          </div>
          {birthday ? null : (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="evento-inicio">Início</Label>
                <Input id="evento-inicio" type="time" value={form.startTime} onChange={(change) => setForm({ ...form, startTime: change.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="evento-fim">Término</Label>
                <Input id="evento-fim" type="time" value={form.endTime} onChange={(change) => setForm({ ...form, endTime: change.target.value })} />
              </div>
            </div>
          )}
          {birthday ? null : (
            <div className="grid gap-1">
              <Label htmlFor="evento-local">Local</Label>
              <Input id="evento-local" value={form.place} onChange={(change) => setForm({ ...form, place: change.target.value })} />
            </div>
          )}
          <div className="grid gap-1">
            <Label htmlFor="evento-desc">Descrição</Label>
            <Textarea id="evento-desc" value={form.description} onChange={(change) => setForm({ ...form, description: change.target.value })} />
          </div>
          {birthday ? null : (
            <fieldset className="grid max-h-32 gap-1 overflow-y-auto rounded-lg border p-2">
              <legend className="px-1 text-sm font-medium">Participantes</legend>
              {directoryPeople.map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.participantIds.includes(person.id)}
                    onChange={() => setForm((current) => ({
                      ...current,
                      participantIds: current.participantIds.includes(person.id)
                        ? current.participantIds.filter((id) => id !== person.id)
                        : [...current.participantIds, person.id],
                    }))}
                  />
                  {person.name}
                </label>
              ))}
            </fieldset>
          )}
        </form>
        <DialogFooter>
          <Button type="submit" form="evento">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
