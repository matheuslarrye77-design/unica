"use client";

import Link from "next/link";
import { useState } from "react";
import { setupAccount, login } from "@/server/actions";
import { Button, Field, TextInput } from "./ui";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await login(new FormData(event.currentTarget));
        if (result && !result.ok) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <Field label="E-mail">
        <TextInput name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Senha">
        <TextInput name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
      <Link href="/esqueci" className="text-center text-sm text-unica">Esqueci minha senha</Link>
    </form>
  );
}

export function SetupForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await setupAccount(new FormData(event.currentTarget));
        if (result && !result.ok) {
          setError(result.error);
          setPending(false);
        }
      }}
    >
      <Field label="Nome">
        <TextInput name="name" required autoComplete="name" />
      </Field>
      <Field label="E-mail">
        <TextInput name="email" type="email" required autoComplete="username" />
      </Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres.">
        <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo">
          <TextInput name="jobTitle" />
        </Field>
        <Field label="Setor">
          <TextInput name="department" />
        </Field>
      </div>
      <Field label="Aniversário" hint="Opcional. Usado no calendário interno.">
        <TextInput name="birthday" type="date" />
      </Field>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar acesso"}</Button>
    </form>
  );
}

export function AuthFrame({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <span aria-hidden className="login-bee" />
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 shadow-card">
        <img src="/brand/wordmark.png" alt="Centro Universitário Única" className="mx-auto mb-8 h-auto w-full max-w-[320px]" />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-mute">{text}</p>
        {children}
      </div>
    </main>
  );
}
