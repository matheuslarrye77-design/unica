"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPoll, requestPasswordReset, resetPassword, reviewDocument, saveAccount, saveDocumentPolicy, sendFeedback, uploadDocument, votePoll } from "@/server/actions";
import type { DocumentView, FeedbackView, PersonOption, PollView, SessionUser } from "@/lib/types";
import { formatWhen } from "@/lib/dates";
import { Button, Field, SelectInput, TextArea, TextInput, toast } from "./ui";

const FEEDBACK_LABEL = {
  sugestao: "Sugestão",
  critica: "Crítica",
  melhoria: "Melhoria",
  observacao: "Observação",
} as const;

export function PollBoard({ polls, leadership }: { polls: PollView[]; leadership: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enquetes</h1>
          <p className="mt-1 text-sm text-mute">Uma pergunta, um prazo e a resposta da equipe.</p>
        </div>
        {leadership ? <Button onClick={() => setCreating((value) => !value)}>Nova enquete</Button> : null}
      </div>
      {creating ? (
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const result = await createPoll(new FormData(form));
            if (!result.ok) toast(result.error, "error");
            else {
              toast(result.message || "Enquete publicada.");
              form.reset();
              setCreating(false);
              router.refresh();
            }
          }}
        >
          <Field label="Pergunta">
            <TextInput name="question" required placeholder="Qual horário é melhor para a reunião?" />
          </Field>
          <Field label="Opções" hint="Uma opção por linha.">
            <TextArea name="options" required placeholder={"09h\n14h\n16h"} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Início">
              <TextInput name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Encerramento">
              <TextInput name="endsAt" type="datetime-local" required />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input name="singleVote" type="checkbox" defaultChecked /> Voto único</label>
          <label className="flex items-center gap-2 text-sm"><input name="hideResults" type="checkbox" defaultChecked /> Ocultar resultados até o encerramento</label>
          <Button type="submit">Publicar enquete</Button>
        </form>
      ) : null}
      <div className="mt-6 grid gap-3">
        {polls.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Nenhuma enquete por aqui.</p> : null}
        {polls.map((poll) => <PollCard key={poll.id} poll={poll} />)}
      </div>
    </div>
  );
}

export function PollCard({ poll }: { poll: PollView }) {
  const router = useRouter();
  const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
  const ends = new Date(poll.endsAt);
  const remaining = ends.getTime() - Date.now();
  const label = poll.closed && poll.endsAt < new Date().toISOString()
    ? "Enquete encerrada."
    : remaining > 0
      ? `Encerra em ${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}min`
      : "Enquete encerrada.";
  return (
    <article className="rounded-xl border border-line bg-white p-3 shadow-card">
      <p className="text-[11px] font-semibold tracking-wide text-unica">Enquete</p>
      <h2 className="mt-0.5 text-[14px] font-semibold leading-5">{poll.question}</h2>
      <ul className="mt-2 grid gap-1.5">
        {poll.options.map((option) => {
          const percent = poll.canSeeResults && total > 0 ? Math.round((option.votes / total) * 100) : 0;
          return (
            <li key={option.id}>
              {poll.canSeeResults ? (
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{option.label}</span>
                    <span className="text-mute">{percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-unica-wash">
                    <div className="h-full rounded-full bg-unica" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={poll.closed || (poll.singleVote && poll.voted)}
                  className="flex h-8 w-full items-center gap-2 rounded-lg border border-line px-2.5 text-left text-[13px] hover:border-unica disabled:opacity-60"
                  onClick={async () => {
                    const result = await votePoll(poll.id, option.id);
                    if (!result.ok) toast(result.error, "error");
                    else {
                      toast(result.message || "Voto registrado.");
                      router.refresh();
                    }
                  }}
                >
                  <span className="grid h-4 w-4 place-items-center rounded-full border border-line">{option.selected ? "●" : ""}</span>
                  {option.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-mute">{label} · {poll.authorName}</p>
    </article>
  );
}

export function FeedbackBoard({ mine, incoming, leadership }: { mine: FeedbackView[]; incoming: FeedbackView[]; leadership: boolean }) {
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Feedbacks</h1>
        <p className="mt-1 text-sm text-mute">Sugestão, crítica, melhoria ou observação.</p>
        <form
          className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const result = await sendFeedback(new FormData(form));
            if (!result.ok) toast(result.error, "error");
            else {
              toast(result.message || "Feedback enviado.");
              form.reset();
              router.refresh();
            }
          }}
        >
          <Field label="Tipo">
            <SelectInput name="kind" defaultValue="sugestao">
              <option value="sugestao">Sugestão</option>
              <option value="critica">Crítica</option>
              <option value="melhoria">Melhoria</option>
              <option value="observacao">Observação</option>
            </SelectInput>
          </Field>
          <Field label="Mensagem">
            <TextArea name="body" required minLength={8} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input name="anonymous" type="checkbox" /> Enviar anonimamente</label>
          <Button type="submit">Enviar</Button>
        </form>
        <h2 className="mb-2 mt-6 text-sm font-semibold">Meus envios</h2>
        <FeedbackList items={mine} own />
      </section>
      {leadership ? (
        <section>
          <h2 className="text-base font-semibold">Recebidos</h2>
          <p className="mt-1 text-sm text-mute">Feedback anônimo chega sem o nome de quem enviou.</p>
          <div className="mt-4">
            <FeedbackList items={incoming} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FeedbackList({ items, own = false }: { items: FeedbackView[]; own?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-mute">Nenhum feedback.</p>;
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-line bg-white px-4 py-3">
          <p className="text-xs font-medium text-unica">{FEEDBACK_LABEL[item.kind]}{item.anonymous ? " · Anônimo" : ""}{!item.anonymous && item.authorName ? ` · ${item.authorName}` : ""}</p>
          <p className="mt-1 text-sm leading-6">{item.body}</p>
          <p className="mt-1 text-xs text-mute">{own && item.anonymous ? "A liderança recebe sem a sua identificação. " : ""}{formatWhen(item.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}

export function DocumentBoard({
  documents,
  people,
  publishers,
  mode,
  birthdayStyle,
  leadership,
  me,
}: {
  documents: DocumentView[];
  people: PersonOption[];
  publishers: number[];
  mode: string;
  birthdayStyle: string;
  leadership: boolean;
  me: SessionUser;
}) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Documentos de suporte</h1>
      <p className="mt-1 text-sm text-mute">Instruções em PDF para o Portal do Pincel e o Portal do ProMinas.</p>
      <form className="mt-4 flex flex-wrap gap-2" action="/documentos">
        <TextInput name="q" placeholder="Pesquisar documento..." className="max-w-xs" />
        <Button type="submit" variant="secondary">Pesquisar</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Filter href="/documentos" label="Todos" />
        <Filter href="/documentos?plataforma=pincel" label="Pincel" />
        <Filter href="/documentos?plataforma=prominas" label="ProMinas" />
        <Filter href="/documentos?ordem=za" label="Z → A" />
        <Filter href="/documentos?ordem=az" label="A → Z" />
      </div>
      <form
        className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const result = await uploadDocument(new FormData(form));
          if (!result.ok) toast(result.error, "error");
          else {
            toast(result.message || "Documento enviado.");
            form.reset();
            router.refresh();
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome"><TextInput name="title" required /></Field>
          <Field label="Categoria"><TextInput name="category" /></Field>
        </div>
        <Field label="Descrição"><TextArea name="description" className="min-h-20" /></Field>
        <Field label="Plataforma">
          <SelectInput name="platform" defaultValue="pincel">
            <option value="pincel">Pincel</option>
            <option value="prominas">ProMinas</option>
          </SelectInput>
        </Field>
        <Field label="PDF"><TextInput name="file" type="file" accept="application/pdf" required /></Field>
        <Button type="submit">Enviar PDF</Button>
      </form>
      <ul className="mt-6 grid gap-3">
        {documents.length === 0 ? <li className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Nenhum documento encontrado.</li> : null}
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4">
            <img src={doc.platform === "pincel" ? "/brand/pincel.png" : "/brand/prominas.png"} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{doc.title}</p>
              <p className="text-sm text-mute">{doc.description || doc.category || doc.originalName}</p>
              <p className="text-xs text-mute">{doc.platform === "pincel" ? "Pincel" : "ProMinas"} · {doc.authorName} · {statusLabel(doc.status)}</p>
            </div>
            {doc.status === "approved" || doc.authorId === me.id || leadership ? (
              <a className="text-sm font-medium text-unica" href={`/api/media/document/${doc.id}`}>Abrir</a>
            ) : null}
            {leadership ? (
              <div className="flex gap-2">
                {doc.status !== "approved" ? <Button onClick={() => changeDoc(doc.id, "approved")}>Aprovar</Button> : null}
                {doc.status !== "rejected" ? <Button variant="secondary" onClick={() => changeDoc(doc.id, "rejected")}>Rejeitar</Button> : null}
                {doc.status !== "archived" ? <Button variant="ghost" onClick={() => changeDoc(doc.id, "archived")}>Arquivar</Button> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {leadership ? (
        <form
          className="mt-8 grid gap-3 rounded-2xl border border-line bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await saveDocumentPolicy(new FormData(event.currentTarget));
            if (!result.ok) toast(result.error, "error");
            else {
              toast(result.message || "Regras atualizadas.");
              router.refresh();
            }
          }}
        >
          <h2 className="text-base font-semibold">Quem pode publicar</h2>
          <SelectInput name="mode" defaultValue={mode}>
            <option value="approval">Aprovação da liderança</option>
            <option value="authorized">Público para colaboradores autorizados</option>
            <option value="restricted">Restrito às pessoas selecionadas</option>
          </SelectInput>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Pessoas autorizadas</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {people.filter((person) => person.role !== "leadership").map((person) => (
                <label key={person.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="publisher" value={person.id} defaultChecked={publishers.includes(person.id)} />
                  {person.name}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Aniversários na lateral">
            <SelectInput name="birthdayStyle" defaultValue={birthdayStyle}>
              <option value="name">Mostrar nome</option>
              <option value="photo">Mostrar foto</option>
            </SelectInput>
          </Field>
          <Button type="submit">Salvar regras</Button>
        </form>
      ) : null}
    </div>
  );

  async function changeDoc(id: number, status: DocumentView["status"]) {
    const result = await reviewDocument(id, status);
    if (!result.ok) toast(result.error, "error");
    else {
      toast(result.message || "Documento atualizado.");
      router.refresh();
    }
  }
}

function Filter({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-full border border-line bg-white px-3 py-1.5 hover:border-unica">{label}</Link>;
}

function statusLabel(status: DocumentView["status"]) {
  return { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado", archived: "Arquivado" }[status];
}

const NOTIFY_KEYS = [
  ["task", "Tarefas"],
  ["comment", "Comentários"],
  ["like", "Curtidas"],
  ["recognition", "Reconhecimentos"],
  ["birthday", "Aniversários"],
  ["announcement", "Comunicados"],
  ["poll", "Enquetes"],
  ["document", "Documentos"],
  ["feedback", "Feedbacks"],
] as const;

export function AccountForm({
  name,
  username,
  theme,
  repostsVisible,
  preferences,
}: {
  name: string;
  username: string;
  theme: "light" | "dark";
  repostsVisible: boolean;
  preferences: Record<string, boolean>;
}) {
  const router = useRouter();
  return (
    <form
      className="grid gap-4 rounded-2xl border border-line bg-white p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await saveAccount(new FormData(event.currentTarget));
        if (!result.ok) toast(result.error, "error");
        else {
          toast(result.message || "Configurações salvas.");
          router.refresh();
        }
      }}
    >
      <Field label="Nome de exibição"><TextInput name="name" defaultValue={name} required /></Field>
      <Field label="Usuário" hint="Aparece como @usuario nas publicações."><TextInput name="username" defaultValue={username} required pattern="[a-z0-9]{3,24}" /></Field>
      <Field label="Aparência">
        <SelectInput name="theme" defaultValue={theme}>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </SelectInput>
      </Field>
      <Field label="Republicações no perfil">
        <SelectInput name="repostsVisible" defaultValue={repostsVisible ? "visible" : "hidden"}>
          <option value="hidden">Oculto</option>
          <option value="visible">Visível</option>
        </SelectInput>
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Notificações</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {NOTIFY_KEYS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`notify_${key}`} defaultChecked={preferences[key] !== false} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Senha atual" hint="Só é necessária para trocar a senha."><TextInput name="currentPassword" type="password" autoComplete="current-password" /></Field>
      <Field label="Nova senha"><TextInput name="newPassword" type="password" autoComplete="new-password" minLength={8} /></Field>
      <Button type="submit">Salvar</Button>
    </form>
  );
}

export function ForgotForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await requestPasswordReset(new FormData(event.currentTarget));
        if (!result.ok) setError(result.error);
        else {
          setError("");
          setMessage(result.message || "Pedido registrado.");
        }
      }}
    >
      <Field label="E-mail"><TextInput name="email" type="email" required autoComplete="username" /></Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-mute">{message}</p> : null}
      <Button type="submit">Pedir redefinição</Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        data.set("token", token);
        const result = await resetPassword(data);
        if (!result.ok) setError(result.error);
        else setMessage(result.message || "Senha atualizada.");
      }}
    >
      <Field label="Nova senha"><TextInput name="password" type="password" required minLength={8} autoComplete="new-password" /></Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm">{message}</p> : null}
      <Button type="submit">Salvar senha</Button>
    </form>
  );
}
