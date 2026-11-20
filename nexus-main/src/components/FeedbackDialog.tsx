import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitFeedback, type FeedbackItem } from '@/lib/institution';
import { MessageSquare } from 'lucide-react';
import { useState, type FC } from 'react';
import { toast } from 'sonner';

const destinations: { id: FeedbackItem['destination']; label: string }[] = [
  { id: 'lideranca', label: 'Gestão' },
  { id: 'plataforma', label: 'Suporte da plataforma' },
];

const types: { id: FeedbackItem['type']; label: string }[] = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'sugestao', label: 'Sugestão de melhoria' },
];

export const FeedbackDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({ open, onOpenChange }) => {
  const [destination, setDestination] = useState<FeedbackItem['destination']>('lideranca');
  const [type, setType] = useState<FeedbackItem['type']>('feedback');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  function close(next: boolean) {
    if (!next) setSending(false);
    onOpenChange(next);
  }

  async function send() {
    setSending(true);
    try {
      await submitFeedback({ destination, type, title: title.trim(), message: message.trim(), anonymous });
      toast.success('Sugestão enviada.');
      setTitle('');
      setMessage('');
      setAnonymous(false);
      setDestination('lideranca');
      setType('feedback');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível enviar a sugestão.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Nova sugestão
          </DialogTitle>
        </DialogHeader>
          <div className="space-y-3.5">
            <fieldset>
              <legend className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Destino</legend>
              <div className="flex items-center gap-1.5">
                {destinations.map((item) => (
                  <button key={item.id} type="button" aria-pressed={destination === item.id} onClick={() => setDestination(item.id)} className={`choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium outline-none ${destination === item.id ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${destination === item.id ? 'bg-white' : 'bg-[#9b82ff]'}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Tipo</legend>
              <div className="flex items-center gap-1.5">
                {types.map((item) => (
                  <button key={item.id} type="button" aria-pressed={type === item.id} onClick={() => setType(item.id)} className={`choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium outline-none ${type === item.id ? 'bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${type === item.id ? 'bg-white' : 'bg-[#9b82ff]'}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="feedback-titulo" className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Título</Label>
              <input id="feedback-titulo" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Título da sugestão" className="h-[42px] w-full rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 text-sm outline-none focus:border-[#9b82ff] focus:bg-white" />
            </div>
            <div>
              <Label htmlFor="feedback-mensagem" className="mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Mensagem</Label>
              <Textarea id="feedback-mensagem" value={message} maxLength={10000} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva sua mensagem" className="max-h-64 min-h-24 overflow-y-auto rounded-[11px] border-[1.5px] border-transparent bg-[#f6f5fa] focus:border-[#9b82ff] focus:bg-white" />
              <p className="mt-1 text-right text-[11.5px] text-[#8a85a0]">{message.length}/1000</p>
            </div>
            <label className="flex w-fit items-center gap-2 text-[13px] text-[#4a4560]">
              <Checkbox checked={anonymous} onCheckedChange={(value) => setAnonymous(value === true)} />
              Enviar anonimamente
            </label>
            <div className="flex justify-end gap-2 border-t border-[#e8e4f4] pt-3.5">
              <Button type="button" variant="ghost" className="outline-none" onClick={() => close(false)}>Cancelar</Button>
              <Button type="button" className="rounded-[11px] bg-[#6644e0] shadow-[0_8px_18px_-8px_rgba(102,68,224,0.8)] outline-none hover:bg-[#4f33b8] focus-visible:ring-0" disabled={!title.trim() || !message.trim() || sending} onClick={() => void send()}>Enviar</Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
};
