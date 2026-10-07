import Link from "next/link";
import { redirect } from "next/navigation";
import { BirthdayForm } from "@/components/forms";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { formatBirthday, formatWhen, todayInSaoPaulo } from "@/lib/dates";
import { firstParam } from "@/lib/utils";
import { birthdayMessages, listBirthdays, listPeople, myBirthdayMessages } from "@/server/data";

export default async function BirthdaysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const selectedId = Number(firstParam(params.pessoa));
  const { today, upcoming } = listBirthdays();
  const people = listPeople();
  const selected = people.find((person) => person.id === selectedId && person.birthday);
  const year = Number(todayInSaoPaulo().slice(0, 4));
  const messages = selected ? birthdayMessages(selected.id, year) : [];
  const mine = myBirthdayMessages(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Aniversários</h1>
      <p className="mt-1 text-sm text-mute">As datas vêm do cadastro de cada pessoa.</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="mb-3 text-base font-semibold">Hoje</h2>
          {today.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Nenhum aniversário hoje.</p> : null}
          <ul className="space-y-2">
            {today.map((person) => (
              <li key={person.id}>
                <Link href={`/aniversarios?pessoa=${person.id}`} className="block rounded-xl border border-line bg-white px-4 py-3 hover:bg-unica-mist">
                  <span className="font-medium">{person.name}</span>
                  <span className="mt-1 block text-sm text-mute">Hoje é aniversário.</span>
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-3 mt-8 text-base font-semibold">Próximos</h2>
          {upcoming.length === 0 ? <p className="text-sm text-mute">Nenhum aniversário nos próximos 60 dias.</p> : null}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {upcoming.map((person) => (
              <li key={person.id}>
                <Link href={`/aniversarios?pessoa=${person.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-unica-mist">
                  <span>
                    <span className="block font-medium">{person.name}</span>
                    <span className="text-sm text-mute">{person.department}</span>
                  </span>
                  <span className="text-sm text-mute">{person.nextDate.slice(8, 10)}/{person.nextDate.slice(5, 7)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold">Mensagens de aniversário</h2>
            {mine.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Você ainda não recebeu recados este ano.</p> : null}
            <ul className="space-y-2">
              {mine.map((message) => (
                <li key={message.id} className="rounded-xl border border-line bg-white px-4 py-3">
                  <p className="text-sm font-medium">{message.authorName}</p>
                  <p className="mt-1 text-sm">{message.body}</p>
                  <p className="mt-1 text-xs text-mute">{formatWhen(message.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="rounded-xl border border-line bg-white p-5">
          {selected ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} id={selected.id} hasAvatar={selected.hasAvatar} size={48} />
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-mute">{formatBirthday(selected.birthday)} · {[selected.jobTitle, selected.department].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
              {selected.id !== user.id ? <BirthdayForm recipientId={selected.id} /> : <p className="mt-4 text-sm text-mute">Os recados recebidos aparecem ao lado.</p>}
              <h3 className="mb-2 mt-6 text-sm font-semibold">Mensagens</h3>
              {messages.length === 0 ? <p className="text-sm text-mute">Nenhuma mensagem ainda.</p> : null}
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id}>
                    <p className="text-sm font-medium">{message.authorName}</p>
                    <p className="text-sm">{message.body}</p>
                  </li>
                ))}
              </ul>
              {user.role === "leadership" ? (
                <p className="mt-6 text-sm text-mute">
                  Para alterar a data, use <Link href="/configuracoes" className="font-medium text-unica">Configurações</Link>.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-mute">Escolha uma pessoa para deixar uma mensagem.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
