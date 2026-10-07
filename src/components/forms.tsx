"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RECOGNITION_CATEGORIES } from "@/lib/constants";
import { leaveBirthdayMessage, saveEvent, sendRecognition, updateProfile, adminSaveUser } from "@/server/actions";
import type { CompanyEvent, PersonOption, SessionUser } from "@/lib/types";
import { Button, Field, Modal, SelectInput, TextArea, TextInput, toast } from "./ui";

export function RecognitionForm({ people, me }: { people: PersonOption[]; me: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const options = people.filter((person) => person.id !== me.id);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await sendRecognition(new FormData(event.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast(result.message || "Reconhecimento enviado.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Reconhecer alguém</Button>
      {open ? (
        <Modal title="Reconhecer alguém" onClose={() => setOpen(false)}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <Field label="Pessoa">
              <SelectInput name="toId" required defaultValue="">
                <option value="">Selecionar</option>
                {options.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Categoria">
              <SelectInput name="category" required defaultValue="equipe">
                {RECOGNITION_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Mensagem">
              <TextArea name="message" required maxLength={500} placeholder="Quero agradecer pela ajuda de hoje." />
            </Field>
            {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

export function BirthdayForm({ recipientId }: { recipientId: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await leaveBirthdayMessage(recipientId, body);
        setPending(false);
        if (!result.ok) toast(result.error, "error");
        else {
          setBody("");
          toast(result.message || "Mensagem enviada.");
          router.refresh();
        }
      }}
    >
      <label htmlFor="recado" className="mb-1.5 block text-sm font-medium">
        Deixar mensagem
      </label>
      <textarea id="recado" value={body} onChange={(event) => setBody(event.target.value)} className="min-h-24 w-full rounded-xl border border-line px-3 py-2 text-sm" placeholder="Feliz aniversário. Que seu dia seja excelente." />
      <Button type="submit" className="mt-2" disabled={pending}>
        {pending ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}

export function EventForm({ event, onClose }: { event?: CompanyEvent; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal title={event ? "Editar evento" : "Novo evento"} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={async (formEvent) => {
          formEvent.preventDefault();
          setPending(true);
          const result = await saveEvent(new FormData(formEvent.currentTarget));
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast(result.message || "Evento criado.");
          onClose();
          router.refresh();
        }}
      >
        {event ? <input type="hidden" name="id" value={event.id} /> : null}
        <Field label="Título">
          <TextInput name="title" required defaultValue={event?.title} maxLength={140} />
        </Field>
        <Field label="Descrição">
          <TextArea name="description" defaultValue={event?.description} className="min-h-20" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <SelectInput name="type" defaultValue={event?.type ?? "evento"}>
              <option value="evento">Evento</option>
              <option value="reuniao">Reunião</option>
            </SelectInput>
          </Field>
          <Field label="Horário" hint="Opcional.">
            <TextInput name="time" type="time" defaultValue={event?.time ?? ""} />
          </Field>
        </div>
        <Field label="Data">
          <TextInput name="date" type="date" required defaultValue={event?.date} />
        </Field>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateProfile(new FormData(event.currentTarget));
        setPending(false);
        if (!result.ok) setError(result.error);
        else {
          setError("");
          toast(result.message || "Perfil atualizado.");
          router.refresh();
        }
      }}
    >
      <Field label="Nome">
        <TextInput name="name" required defaultValue={user.name} maxLength={80} />
      </Field>
      <Field label="Sobre você">
        <TextArea name="bio" defaultValue={user.bio} maxLength={280} className="min-h-20" />
      </Field>
      <Field label="Foto" hint="PNG, JPG ou WebP.">
        <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha atual" hint="Só para trocar a senha.">
          <TextInput name="currentPassword" type="password" autoComplete="current-password" />
        </Field>
        <Field label="Nova senha">
          <TextInput name="newPassword" type="password" autoComplete="new-password" minLength={8} />
        </Field>
      </div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar perfil"}</Button>
    </form>
  );
}

export function UserAdminForm({ person, onClose }: { person?: PersonOption; onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal title={person ? "Editar colaborador" : "Novo colaborador"} onClose={onClose} wide>
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const result = await adminSaveUser(new FormData(event.currentTarget));
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast(result.message || "Cadastro atualizado.");
          onClose();
          router.refresh();
        }}
      >
        {person ? <input type="hidden" name="id" value={person.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <TextInput name="name" required defaultValue={person?.name} />
          </Field>
          <Field label="E-mail">
            <TextInput name="email" type="email" required defaultValue={person?.email} />
          </Field>
          <Field label="Cargo">
            <TextInput name="jobTitle" defaultValue={person?.jobTitle} />
          </Field>
          <Field label="Setor">
            <TextInput name="department" defaultValue={person?.department} />
          </Field>
          <Field label="Aniversário">
            <TextInput name="birthday" type="date" defaultValue={person?.birthday ?? ""} />
          </Field>
          <Field label="Perfil">
            <SelectInput name="role" defaultValue={person?.role ?? "collaborator"}>
              <option value="collaborator">Colaborador</option>
              <option value="leadership">Liderança</option>
            </SelectInput>
          </Field>
        </div>
        <Field label={person ? "Nova senha" : "Senha inicial"} hint={person ? "Deixe em branco para manter." : "Mínimo de 8 caracteres."}>
          <TextInput name="password" type="password" autoComplete="new-password" required={!person} minLength={person ? undefined : 8} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" value="1" defaultChecked={person?.active ?? true} /> Acesso ativo
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function SettingsActions({ people }: { people: PersonOption[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PersonOption | null>(null);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Novo colaborador</Button>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-mute">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Setor</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Acesso</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{person.name}</p>
                  <p className="text-xs text-mute">{person.email}</p>
                </td>
                <td className="px-4 py-3">{person.department || "—"}</td>
                <td className="px-4 py-3">{person.role === "leadership" ? "Liderança" : "Colaborador"}</td>
                <td className="px-4 py-3">{person.active ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="font-medium text-unica" onClick={() => setEditing(person)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? <UserAdminForm onClose={() => setOpen(false)} /> : null}
      {editing ? <UserAdminForm person={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
