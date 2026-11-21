import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { submitFeedback, type FeedbackItem } from '@/lib/institution';
import { MessageSquare } from 'lucide-react';
import { useState, type FC } from 'react';
import { toast } from 'sonner';

const MESSAGE_LIMIT = 10000;

const destinations: { id: FeedbackItem['destination']; label: string }[] = [
  { id: 'lideranca', label: 'Gestão' },
  { id: 'plataforma', label: 'Suporte da plataforma' },
];

const types: { id: FeedbackItem['type']; label: string }[] = [
  { id: 'feedback', label: 'Feedback' },
  { id: 'sugestao', label: 'Sugestão de melhoria' },
];

const field = 'w-full rounded-[14px] border-[1.5px] border-transparent bg-[#f6f5fa] px-3 text-sm outline-none transition focus:border-[#9b82ff] focus:bg-white';

export const FeedbackDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({ open, onOpenChange }) => {
  const [destination, setDestination] = useState<FeedbackItem['destination']>('lideranca');
  const [type, setType] = useState<FeedbackItem['type']>('feedback');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const ready = Boolean(title.trim() && message.trim());

  function close(next: boolean) {
    if (!next) {
      setSending(false);
      setPreview(false);
    }
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
      setPreview(false);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível enviar a sugestão.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(31,27,46,0.38)] backdrop-blur-none"
        className="!flex max-h-[min(92vh,760px)] w-[min(520px,calc(100%-2rem))] !max-w-none !flex-col !gap-0 !overflow-hidden !rounded-[22px] !border-0 !bg-white !p-0 shadow-[0_30px_80px_-20px_rgba(79,51,184,0.45)]"
      >
        <div className="flex items-center justify-between px-[26px] pt-[22px] pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-[#1f1b2e]">
            <MessageSquare className="h-5 w-5 text-[#6644e0]" />
            Nova sugestão
          </DialogTitle>
          <button type="button" aria-label="Fechar" onClick={() => close(false)} className="grid h-[30px] w-[30px] place-items-center rounded-full text-lg leading-none text-[#8a85a0] hover:bg-[#f6f3ff] hover:text-[#6644e0]">×</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[26px]">
          {preview ? (
            <div className="mb-3.5 rounded-[22px] bg-white p-4 shadow-[10px_10px_24px_#d8d2ee,-6px_-6px_18px_#fff,0_0_0_1px_#e8e4f4]">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f33b8] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]">{destinations.find((item) => item.id === destination)?.label}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f33b8] shadow-[3px_3px_7px_#d8d2ee,-3px_-3px_7px_#fff]">{types.find((item) => item.id === type)?.label}</span>
              </div>
              <h3 className="mb-1.5 text-base font-semibold break-words text-[#1f1b2e]">{title.trim()}</h3>
              <p className="text-[13.5px] leading-normal break-words whitespace-pre-wrap text-[#4a4560]">{message.trim()}</p>
              <small className="mt-3 block text-xs text-[#8a85a0]">{anonymous ? 'Será enviado anonimamente' : 'Será enviado com o seu nome'}</small>
            </div>
          ) : (
            <div className="space-y-3.5 pb-1">
              <fieldset>
                <legend className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Destino</legend>
                <div className="flex items-center gap-1.5">
                  {destinations.map((item) => (
                    <button key={item.id} type="button" aria-pressed={destination === item.id} onClick={() => setDestination(item.id)} className={`choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium outline-none ${destination === item.id ? 'border border-[#6644e0] bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${destination === item.id ? 'bg-white' : 'bg-[#9b82ff]'}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Tipo</legend>
                <div className="flex items-center gap-1.5">
                  {types.map((item) => (
                    <button key={item.id} type="button" aria-pressed={type === item.id} onClick={() => setType(item.id)} className={`choice-chip flex items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-medium outline-none ${type === item.id ? 'border border-[#6644e0] bg-[#6644e0] text-white shadow-[0_6px_14px_-6px_rgba(102,68,224,0.7)]' : 'border border-[#e8e4f4] bg-white text-[#4a4560]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${type === item.id ? 'bg-white' : 'bg-[#9b82ff]'}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="feedback-titulo" className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Título</label>
                <input id="feedback-titulo" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="Título da sugestão" className={`h-[42px] ${field}`} />
              </div>
              <div>
                <label htmlFor="feedback-mensagem" className="mb-2 block text-[11px] font-semibold tracking-[0.08em] text-[#8a85a0] uppercase">Mensagem</label>
                <textarea id="feedback-mensagem" value={message} maxLength={MESSAGE_LIMIT} onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_LIMIT))} placeholder="Escreva sua mensagem" className={`grow-note short overflow-y-auto py-[11px] leading-normal ${field}`} />
                <p className="mt-1 text-right text-[11.5px] text-[#8a85a0]">{message.length}/{MESSAGE_LIMIT}</p>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-[#4a4560] select-none">
                <input type="checkbox" className="peer sr-only" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
                <span className="relative h-5 w-[34px] shrink-0 rounded-full bg-[#d9d5e8] transition peer-checked:bg-[#7c5cf5] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.2)] after:transition peer-checked:after:translate-x-3.5" />
                Enviar anonimamente
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e8e4f4] px-[26px] py-3.5">
          <Button type="button" variant="ghost" onClick={() => (preview ? setPreview(false) : close(false))}>{preview ? 'Editar' : 'Cancelar'}</Button>
          {preview ? (
            <Button type="button" disabled={sending} onClick={() => void send()}>{sending ? 'Enviando...' : 'Enviar'}</Button>
          ) : (
            <Button type="button" disabled={!ready} onClick={() => setPreview(true)}>Visualizar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
