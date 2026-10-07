"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, FileText, Heart, ImageIcon, MessageCircle, MoreHorizontal, Repeat2, Send, Video } from "lucide-react";
import { addPostComment, createPost, deletePost, deletePostComment, togglePostLike, toggleRepost } from "@/server/actions";
import type { FeedPost, SessionUser } from "@/lib/types";
import { formatWhen } from "@/lib/dates";
import { Avatar } from "./ui";
import { toast } from "./ui";

export function Composer({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <form
      className="rounded-[14px] border border-[#EFEAF5] bg-white px-3 py-2 shadow-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setPending(true);
        const result = await createPost(new FormData(form));
        setPending(false);
        if (!result.ok) toast(result.error, "error");
        else {
          form.reset();
          toast(result.message || "Publicação enviada.");
          router.refresh();
        }
      }}
    >
      <div className="flex gap-2">
        <Avatar name={user.name} id={user.id} hasAvatar={user.hasAvatar} size={28} />
        <label className="sr-only" htmlFor="post-body">Publicação</label>
        <textarea id="post-body" name="body" rows={1} maxLength={2000} placeholder="Compartilhe algo com a equipe..." className="min-h-8 w-full resize-none bg-transparent py-1 text-[12px] leading-4 outline-none" />
      </div>
      <div className="mt-1.5 flex items-center gap-0.5 border-t border-line pt-1.5">
        <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-1.5 text-[11px] text-[#5E5868] hover:bg-unica-wash">
          <ImageIcon size={13} aria-hidden /> Foto
          <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" />
        </label>
        <button type="button" className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] text-[#5E5868] hover:bg-unica-wash" onClick={() => toast("O feed publica fotos. O vídeo fica para uma próxima etapa.")}>
          <Video size={13} aria-hidden /> Vídeo
        </button>
        <Link href="/documentos" className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] text-[#5E5868] hover:bg-unica-wash">
          <FileText size={13} aria-hidden /> Documento
        </Link>
        <Link href="/enquetes" className="inline-flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] text-[#5E5868] hover:bg-unica-wash">
          <BarChart3 size={13} aria-hidden /> Enquete
        </Link>
        <button type="submit" disabled={pending} className="ml-auto h-7 rounded-lg bg-unica px-3 text-[12px] font-semibold text-white hover:bg-unica-hover disabled:opacity-60">
          {pending ? "..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}

export function FeedList({ posts, me }: { posts: FeedPost[]; me: SessionUser }) {
  if (posts.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Nenhuma publicação ainda. Comece compartilhando algo com a equipe.</p>;
  }
  return (
    <div className="grid gap-2">
      {posts.map((post) => (
        <article key={`${post.id}-${post.repostedByName ?? "original"}-${post.createdAt}`} className="rounded-[14px] border border-[#EFEAF5] bg-white px-3 py-2.5 shadow-card">
          {post.repostedByName ? <p className="mb-1 text-[11px] text-mute">{post.repostedByName} republicou</p> : null}
          <header className="flex items-start gap-2">
            <Avatar name={post.authorName} id={post.authorId} hasAvatar={post.hasAvatar} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-4">{post.authorName}</p>
              <p className="text-[11px] leading-4 text-mute">@{post.username} · {formatWhen(post.createdAt)}</p>
            </div>
            {me.role === "leadership" || me.id === post.authorId ? (
              <button type="button" className="grid h-6 w-6 place-items-center rounded-md text-mute hover:bg-[#F7F5F8] hover:text-danger" aria-label="Remover publicação" onClick={async () => {
                const result = await deletePost(post.id);
                if (!result.ok) toast(result.error, "error");
                else toast(result.message || "Publicação removida.");
              }}><MoreHorizontal size={14} /></button>
            ) : null}
          </header>
          {post.body ? <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-4">{post.body}</p> : null}
          {post.hasImage ? <img src={`/api/media/post/${post.id}`} alt="" className="mt-1.5 h-[136px] w-full rounded-lg object-cover" /> : null}
          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-mute">
            <button type="button" className={post.liked ? "inline-flex items-center gap-1 font-medium text-unica" : "inline-flex items-center gap-1"} onClick={() => togglePostLike(post.id)} aria-pressed={post.liked} aria-label="Curtir">
              <Heart size={14} fill={post.liked ? "currentColor" : "none"} /> {post.likeCount}
            </button>
            <span className="inline-flex items-center gap-1"><MessageCircle size={14} /> {post.commentCount}</span>
            <button type="button" className="inline-flex items-center gap-1" onClick={async () => {
              const result = await toggleRepost(post.id);
              if (!result.ok) toast(result.error, "error");
              else if (result.message) toast(result.message);
            }} aria-label="Republicar">
              <Repeat2 size={14} /> {post.repostCount}
            </button>
          </div>
          {post.commentCount > 1 ? <p className="mt-1.5 text-[11px] text-mute">Ver todos os {post.commentCount} comentários</p> : null}
          {post.comments.length > 0 ? (
            <ul className="mt-1.5 grid gap-1.5">
              {post.comments.slice(-1).map((comment) => (
                <li key={comment.id} className="flex gap-2 text-[12px] leading-4">
                  <Avatar name={comment.userName} id={comment.userId} hasAvatar={comment.hasAvatar} size={22} />
                  <span className="min-w-0">
                    <span className="font-semibold">{comment.userName}</span>{" "}
                    <span>{comment.body}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[10px] text-mute">
                      <span>{formatWhen(comment.createdAt)}</span>
                      <button type="button" className="hover:text-ink" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}>Responder</button>
                      {me.role === "leadership" || me.id === comment.userId ? (
                        <button type="button" className="hover:text-danger" onClick={() => deletePostComment(comment.id)}>Excluir</button>
                      ) : null}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <form className="mt-1.5 flex items-center gap-1.5" action={async (formData) => {
            const result = await addPostComment(formData);
            if (!result.ok) toast(result.error, "error");
          }}>
            <input type="hidden" name="postId" value={post.id} />
            <Avatar name={me.name} id={me.id} hasAvatar={me.hasAvatar} size={22} />
            <label className="sr-only" htmlFor={`comment-${post.id}`}>Comentar</label>
            <input id={`comment-${post.id}`} name="body" placeholder="Escreva um comentário..." className="h-7 min-w-0 flex-1 rounded-full border border-line bg-[#FBFBFD] px-3 text-[12px] outline-none focus-visible:border-unica" />
            <button type="submit" className="grid h-7 w-7 place-items-center text-unica" aria-label="Enviar comentário"><Send size={13} /></button>
          </form>
        </article>
      ))}
    </div>
  );
}
