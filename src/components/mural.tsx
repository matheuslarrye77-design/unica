"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pin } from "lucide-react";
import { ANNOUNCEMENT_LABEL, ANNOUNCEMENT_TYPES, REACTIONS } from "@/lib/constants";
import { formatWhen } from "@/lib/dates";
import { addAnnouncementComment, deleteAnnouncement, saveAnnouncement, togglePin, toggleReaction } from "@/server/actions";
import type { AnnouncementCard, AnnouncementType, ReactionType, SessionUser } from "@/lib/types";
import { Avatar, Button, EmptyState, Field, Modal, SelectInput, TextArea, TextInput, toast } from "./ui";

export function MuralList({
  items,
  me,
  page,
  total,
  pageSize,
  type,
}: {
  items: AnnouncementCard[];
  me: SessionUser;
  page: number;
  total: number;
  pageSize: number;
  type?: string;
}) {
  const [open, setOpen] = useState(false);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mural</h1>
          <p className="mt-1 text-sm text-mute">Comunicados e notícias da Única.</p>
        </div>
        {me.role === "leadership" ? <Button onClick={() => setOpen(true)}>Publicar</Button> : null}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {[
          ["", "Todos"],
          ["comunicado", "Comunicados"],
          ["aviso", "Avisos"],
          ["noticia", "Notícias"],
          ["evento", "Eventos"],
        ].map(([value, label]) => {
          const href = value ? `/mural?tipo=${value}` : "/mural";
          const current = (type ?? "") === value;
          return (
            <Link key={label} href={href} aria-current={current ? "page" : undefined} className={current ? "rounded-full bg-unica-wash px-3 py-2 text-sm font-medium text-unica" : "rounded-full px-3 py-2 text-sm text-mute hover:bg-white"}>
              {label}
            </Link>
          );
        })}
      </div>
      {items.length === 0 ? <EmptyState title="Nenhum comunicado publicado." /> : null}
      <div className="space-y-4">
        {items.map((item) => (
          <Post key={item.id} item={item} me={me} />
        ))}
      </div>
      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-mute">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? <Link className="rounded-lg border border-line bg-white px-3 py-2" href={pageHref(type, page - 1)}>Anterior</Link> : null}
            {page < pages ? <Link className="rounded-lg border border-line bg-white px-3 py-2" href={pageHref(type, page + 1)}>Próxima</Link> : null}
          </div>
        </div>
      ) : null}
      {open ? <AnnouncementForm onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function pageHref(type: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (type) params.set("tipo", type);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/mural?${query}` : "/mural";
}

export function Post({ item, me, detailed = false }: { item: AnnouncementCard; me: SessionUser; detailed?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const leadership = me.role === "leadership";

  async function react(reaction: ReactionType) {
    const result = await toggleReaction(item.id, reaction);
    if (!result.ok) toast(result.error, "error");
    router.refresh();
  }

  return (
    <article className={item.pinned ? "rounded-xl border border-line border-l-[3px] border-l-unica bg-white p-5" : "rounded-xl border border-line bg-white p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-mute">
            {item.pinned ? (
              <span className="inline-flex items-center gap-1 font-medium text-unica">
                <Pin size={12} aria-hidden /> Fixado
              </span>
            ) : null}
            <span>{ANNOUNCEMENT_LABEL[item.type]}</span>
            <span>{formatWhen(item.createdAt)}</span>
          </div>
          {detailed ? <h1 className="mt-2 text-2xl font-semibold tracking-tight">{item.title}</h1> : <h2 className="mt-2 text-lg font-semibold"><Link href={`/mural/${item.id}`} className="hover:text-unica">{item.title}</Link></h2>}
        </div>
        {leadership ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={async () => {
              const result = await togglePin(item.id);
              if (!result.ok) toast(result.error, "error");
              else toast(result.message || "Atualizado.");
              router.refresh();
            }}>{item.pinned ? "Desafixar" : "Fixar"}</Button>
            {detailed ? <Button variant="secondary" onClick={() => setEditing(true)}>Editar</Button> : null}
            {detailed ? (
              <Button
                variant="danger"
                onClick={async () => {
                  if (!window.confirm("Excluir este comunicado?")) return;
                  const result = await deleteAnnouncement(item.id);
                  if (!result.ok) toast(result.error, "error");
                  else {
                    toast(result.message || "Comunicado excluído.");
                    router.push("/mural");
                  }
                }}
              >
                Excluir
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-mute">
        <Avatar name={item.authorName} id={item.authorId} hasAvatar={item.authorHasAvatar} size={28} />
        {item.authorName}
      </div>
      <p className={detailed ? "mt-4 whitespace-pre-wrap text-sm leading-6" : "mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6"}>{item.content}</p>
      {item.hasImage ? <img src={`/api/media/announcement/${item.id}`} alt="" className="mt-4 max-h-80 w-full rounded-lg object-contain" /> : null}
      {!detailed && item.content.length > 280 ? (
        <Link href={`/mural/${item.id}`} className="mt-3 inline-block text-sm font-medium text-unica">
          Ler comunicado
        </Link>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {REACTIONS.map((reaction) => {
          const count = item.reactions.find((entry) => entry.type === reaction.id);
          return (
            <button key={reaction.id} type="button" aria-pressed={Boolean(count?.mine)} aria-label={reaction.label} onClick={() => react(reaction.id)} className={count?.mine ? "inline-flex min-h-10 items-center gap-1 rounded-full bg-unica-wash px-3 text-sm text-unica" : "inline-flex min-h-10 items-center gap-1 rounded-full border border-line px-3 text-sm text-mute hover:bg-[#F7F5F8]"}>
              <span aria-hidden>{reaction.emoji}</span>
              {count?.count ? count.count : null}
            </button>
          );
        })}
        <span className="inline-flex min-h-10 items-center text-sm text-mute">{item.commentCount} comentário{item.commentCount === 1 ? "" : "s"}</span>
      </div>
      {detailed && "comments" in item ? null : null}
      {editing ? <AnnouncementForm item={item} onClose={() => setEditing(false)} /> : null}
      {detailed ? (
        <CommentBox
          allow={item.allowComments}
          comment={comment}
          setComment={setComment}
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await addAnnouncementComment(item.id, comment);
            if (!result.ok) toast(result.error, "error");
            else {
              setComment("");
              toast(result.message || "Comentário publicado.");
              router.refresh();
            }
          }}
        />
      ) : null}
    </article>
  );
}

function CommentBox({
  allow,
  comment,
  setComment,
  onSubmit,
}: {
  allow: boolean;
  comment: string;
  setComment: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  if (!allow) return <p className="mt-4 text-sm text-mute">Os comentários estão fechados.</p>;
  return (
    <form onSubmit={onSubmit} className="mt-4">
      <label htmlFor="comentario-mural" className="sr-only">
        Comentário
      </label>
      <textarea id="comentario-mural" value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-24 w-full rounded-xl border border-line px-3 py-2 text-sm" placeholder="Comentar" />
      <Button type="submit" className="mt-2">
        Comentar
      </Button>
    </form>
  );
}

export function AnnouncementComments({ comments }: { comments: { id: number; body: string; createdAt: string; userName: string; userId: number; hasAvatar: boolean }[] }) {
  if (comments.length === 0) return <div className="mt-4"><EmptyState title="Nenhum comentário ainda." /></div>;
  return (
    <ul className="mt-4 space-y-3">
      {comments.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <Avatar name={entry.userName} id={entry.userId} hasAvatar={entry.hasAvatar} size={32} />
          <div>
            <p className="text-sm">
              <span className="font-semibold">{entry.userName}</span> <span className="text-mute">{formatWhen(entry.createdAt)}</span>
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AnnouncementForm({ item, onClose }: { item?: AnnouncementCard; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await saveAnnouncement(new FormData(event.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(result.message || "Comunicado publicado.");
    onClose();
    router.refresh();
    if (!item && result.id) router.push(`/mural/${result.id}`);
  }

  return (
    <Modal title={item ? "Editar publicação" : "Nova publicação"} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="grid gap-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <Field label="Título">
          <TextInput name="title" required defaultValue={item?.title} maxLength={140} />
        </Field>
        <Field label="Conteúdo">
          <TextArea name="content" required defaultValue={item?.content} maxLength={8000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <SelectInput name="type" defaultValue={item?.type ?? "comunicado"}>
              {ANNOUNCEMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ANNOUNCEMENT_LABEL[type as AnnouncementType]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Data no calendário" hint="Opcional.">
            <TextInput name="eventDate" type="date" defaultValue={item?.eventDate ?? ""} />
          </Field>
        </div>
        <Field label="Imagem" hint="Opcional. PNG, JPG ou WebP.">
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
        </Field>
        {item?.hasImage ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeImage" value="1" /> Remover imagem atual
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowComments" value="1" defaultChecked={item?.allowComments ?? true} /> Permitir comentários
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pinned" value="1" defaultChecked={item?.pinned ?? false} /> Fixar no topo
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Publicando…" : item ? "Salvar" : "Publicar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
