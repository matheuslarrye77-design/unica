import { FileText, Heart, Mic, Paperclip, Send, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState, useRef, type ClipboardEvent, type FC, type FormEvent, type KeyboardEvent } from 'react';
import { actor } from '@/lib/session';
import { forgetSticker, keepSticker, stickerIsSaved } from '@/lib/stickers';
import { ZoomImage } from './PhotoGallery';
import { ComposerExtras } from './ComposerExtras';
import { ReadMore, useExpand } from './ReadMore';
import { commentMediaList, type CommentMedia, type SocialComment } from './types';

export const Comments: FC<{
  inputId: string;
  comments: SocialComment[];
  draft: string;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  onLike: (commentId: string) => void;
  canDelete?: (commentId: string) => boolean;
  onDelete?: (commentId: string) => void;
  pendingMedia?: CommentMedia[];
  onMedia?: (media: CommentMedia[]) => void;
  onFile?: (file: File) => void;
  onGifFile?: (file: File) => void;
  onPasteFile?: (file: File) => void;
  onAudioFile?: (file: File) => void;
}> = ({ inputId, comments, draft, onDraft, onSubmit, onLike, canDelete, onDelete, pendingMedia = [], onMedia, onPasteFile, onAudioFile, onFile }) => {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const expand = useExpand();
  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }
  function insertEmoji(emoji: string) {
    const field = fieldRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    onDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => field?.focus());
  }
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const data = event.clipboardData;
    const direct = [...data.files].find((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    const file = direct ?? [...data.items].map((item) => (item.kind === 'file' ? item.getAsFile() : null)).find((item) => item && (item.type.startsWith('image/') || item.type.startsWith('video/')));
    if (!file) return;
    event.preventDefault();
    onPasteFile?.(file);
  }
  async function toggleRecord() {
    if (recorder.current && recorder.current.state === 'recording') {
      recorder.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const media = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      media.ondataavailable = (event) => { if (event.data.size > 0) chunks.current.push(event.data); };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        recorder.current = null;
        const blob = new Blob(chunks.current, { type: media.mimeType || 'audio/webm' });
        if (blob.size < 1) return;
        onAudioFile?.(new File([blob], 'gravacao.webm', { type: blob.type || 'audio/webm' }));
      };
      recorder.current = media;
      media.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }
    const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    const empty = event.currentTarget.value === '';
    if (pendingMedia.length && atStart && (event.key === 'Backspace' || (event.key === 'Delete' && empty))) {
      event.preventDefault();
      onMedia?.(pendingMedia.slice(0, -1));
    }
  }
  function addPiece(media: CommentMedia) {
    onMedia?.([...pendingMedia, media].slice(0, 8));
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {comments.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p> : null}
      <ul className="space-y-3">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-2.5">
            <img src={comment.avatar} alt="" className="h-8 w-8 rounded-full bg-muted" />
            <div className="min-w-0 flex-1">
              <div onClick={() => expand?.setId(expand.id === `comentario-${comment.id}` ? null : `comentario-${comment.id}`)}>
                <p className="text-sm font-semibold leading-5">{comment.author}</p>
                {comment.body ? <ReadMore id={`comentario-${comment.id}`} text={comment.body} className="text-sm leading-5" /> : null}
              </div>
              {commentMediaList(comment.media).length ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {commentMediaList(comment.media).map((media) => (
                    <div key={media.url} className="relative inline-block">
                      {media.kind === 'video' ? (
                        <video src={media.url} controls className="max-h-48 max-w-full rounded-xl bg-black" />
                      ) : media.kind === 'audio' ? (
                        <audio src={media.url} controls className="h-10 max-w-full" />
                      ) : media.kind === 'document' ? (
                        <a href={media.url} download={media.name} className="inline-flex items-center gap-2 rounded-xl bg-[#F5F7FC] px-3 py-2 text-sm text-gray-800"><FileText className="h-4 w-4 text-[#6D32F5]" />{media.name || 'Arquivo'}</a>
                      ) : (
                        <ZoomImage src={media.url} alt={media.kind === 'gif' ? 'GIF' : media.kind === 'sticker' ? 'Figurinha' : 'Foto'} className={`${media.kind === 'image' ? 'max-h-60 max-w-full' : 'h-28 w-28'} rounded-xl bg-[#F5F1FF] object-contain`} />
                      )}
                      {media.kind === 'sticker' && comment.authorId !== actor().id ? <SaveSticker url={media.url} /> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{comment.time}</span>
                <button type="button" onClick={() => onLike(comment.id)} className={comment.liked ? 'inline-flex items-center gap-1 font-medium text-primary' : 'inline-flex items-center gap-1 hover:text-foreground'}>
                  <Heart className="h-3.5 w-3.5" fill={comment.liked ? 'currentColor' : 'none'} />
                  {comment.likes}
                </button>
                {canDelete?.(comment.id) ? (
                  <button type="button" onClick={() => onDelete?.(comment.id)} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        {pendingMedia.length ? (
          <div className="flex flex-wrap gap-2">
            {pendingMedia.map((media) => (
              <div key={media.url} className="relative inline-block">
                {media.kind === 'video' ? <video src={media.url} className="h-16 rounded-xl" /> : media.kind === 'audio' ? <audio src={media.url} controls className="h-10" /> : media.kind === 'document' ? <span className="inline-flex items-center gap-1 rounded-xl bg-[#F5F7FC] px-2 py-1 text-xs"><FileText className="h-3.5 w-3.5" />{media.name || 'Arquivo'}</span> : <img src={media.url} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                <button type="button" aria-label="Remover anexo" className="absolute -right-1 -top-1 rounded-full bg-card p-0.5" onClick={() => onMedia?.(pendingMedia.filter((item) => item.url !== media.url))}><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor={inputId}>Comentário</label>
          <input type="file" className="hidden" id={`${inputId}-arquivo`} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile?.(file); }} />
          <button type="button" aria-label="Anexar arquivo" onClick={() => document.getElementById(`${inputId}-arquivo`)?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-gray-600 shadow-[0_4px_14px_rgba(60,40,140,0.12)]"><Paperclip className="h-4 w-4" /></button>
          <textarea
            ref={fieldRef}
            id={inputId}
            value={draft}
            rows={1}
            onChange={(event) => onDraft(event.target.value)}
            onPaste={onPaste}
            onKeyDown={onKey}
            placeholder="Escreva um comentário..."
            className="min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2 text-sm outline-none focus-visible:border-primary"
          />
          <button type="button" aria-label={recording ? 'Parar gravação' : 'Gravar áudio'} aria-pressed={recording} onClick={() => void toggleRecord()} className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl outline-none ${recording ? 'bg-[#DB2777] text-white' : 'bg-white text-gray-600 shadow-[0_4px_14px_rgba(60,40,140,0.12)]'}`}>
            <Mic className="h-4 w-4" />
          </button>
          <button type="submit" aria-label={pendingMedia.some((item) => item.url.startsWith('blob:')) ? 'Enviando' : 'Publicar'} disabled={(!draft.trim() && pendingMedia.length === 0) || pendingMedia.some((item) => item.url.startsWith('blob:'))} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 outline-none hover:bg-blue-500 focus-visible:ring-0 disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <ComposerExtras onEmoji={insertEmoji} onSticker={(url) => addPiece({ kind: 'sticker', url })} onGif={(url) => addPiece({ kind: 'gif', url })} />
      </form>
    </div>
  );
};

const SaveSticker: FC<{ url: string }> = ({ url }) => {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    void stickerIsSaved(url).then((value) => { if (current) setSaved(value); }).catch(() => undefined);
    return () => { current = false; };
  }, [url]);
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={busy}
      aria-label={saved ? 'Remover figurinha salva' : 'Salvar figurinha'}
      className={`absolute right-0.5 top-0.5 grid h-6 w-6 place-items-center text-[#4600F3] drop-shadow-[0_0_1px_rgba(255,255,255,0.9)] ${saved ? 'opacity-100' : 'opacity-80'}`}
      onClick={() => {
        if (busy) return;
        const next = !saved;
        setBusy(true);
        const action = next ? keepSticker(url) : forgetSticker(url);
        void action.then(() => setSaved(next)).catch(() => undefined).finally(() => setBusy(false));
      }}
    >
      <Star className="h-3.5 w-3.5" strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
};
