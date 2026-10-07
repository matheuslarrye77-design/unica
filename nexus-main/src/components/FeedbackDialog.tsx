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
  { id: 'lideranca', label: 'Liderança' },
  { id: 'plataforma', label: 'Plataforma' },
];

const types: { id: FeedbackItem['type']; label: string }[] = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'sugestao', label: 'Sugestão de melhoria' },
];

export const FeedbackDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({ open, onOpenChange }) => {
  const [destination, setDestination] = useState<FeedbackItem['destination']>('lideranca');
  const [type, setType] = useState<FeedbackItem['type']>('feedback');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [review, setReview] = useState(false);
  const [sending, setSending] = useState(false);

  function close(next: boolean) {
    if (!next) {
      setReview(false);
      setSending(false);
    }
    onOpenChange(next);
  }

  async function send() {
    setSending(true);
    try {
      await submitFeedback({ destination, type, message: message.trim(), anonymous });
      toast.success('Feedback enviado.');
      setMessage('');
      setAnonymous(false);
      setReview(false);
      setDestination('lideranca');
      setType('feedback');
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível enviar o feedback.');
    } finally {
      setSending(false);
    }
  }

  const destinationLabel = destinations.find((item) => item.id === destination)?.label;
  const typeLabel = types.find((item) => item.id === type)?.label;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </DialogTitle>
        </DialogHeader>
        {review ? (
          <div className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Destino: </span>{destinationLabel}</p>
            <p><span className="text-muted-foreground">Tipo: </span>{typeLabel}</p>
            <p><span className="text-muted-foreground">Anonimato: </span>{anonymous ? 'Anônimo' : 'Identificado'}</p>
            <p className="rounded-xl border bg-muted/40 p-3 leading-6 whitespace-pre-wrap">{message.trim()}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReview(false)}>Voltar</Button>
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button disabled={sending} onClick={() => void send()}>Enviar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Destino</legend>
              {destinations.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="destino" checked={destination === item.id} onChange={() => setDestination(item.id)} />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tipo</legend>
              {types.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="tipo" checked={type === item.id} onChange={() => setType(item.id)} />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="feedback-mensagem">Mensagem</Label>
              <Textarea id="feedback-mensagem" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva sua mensagem" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={anonymous} onCheckedChange={(value) => setAnonymous(value === true)} />
              Enviar anonimamente
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>Cancelar</Button>
              <Button disabled={!message.trim()} onClick={() => setReview(true)}>Visualizar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
