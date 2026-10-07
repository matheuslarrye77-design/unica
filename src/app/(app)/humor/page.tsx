import Link from "next/link";
import { redirect } from "next/navigation";
import { MoodPicker } from "@/components/mood";
import { Avatar } from "@/components/ui";
import { MOODS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { listPeople, moodHistory, moodsToday, todayMood } from "@/server/data";

export default async function MoodPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const requested = Number(firstParam(params.pessoa));
  const focusId = user.role === "leadership" && Number.isInteger(requested) && requested > 0 ? requested : user.id;
  const today = moodsToday(user);
  const history = moodHistory(user, focusId);
  const people = user.role === "leadership" ? listPeople() : [];
  const counts = MOODS.map((mood) => ({ ...mood, total: today.filter((item) => item.mood === mood.id && (user.role === "leadership" || item.visibility === "public" || item.userId === user.id)).length }));
  const max = Math.max(1, ...counts.map((item) => item.total));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Humor</h1>
      <p className="mt-1 text-sm text-mute">Um registro simples do clima. O histórico não é público.</p>
      <MoodPicker current={todayMood(user.id)} />
      {user.role === "leadership" ? (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Humor da equipe</h2>
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            {counts.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="w-36 text-sm">{item.emoji} {item.label}</span>
                <div className="h-2 flex-1 rounded-full bg-[#F1EEF4]">
                  <div className="h-2 rounded-full bg-unica" style={{ width: `${(item.total / max) * 100}%` }} />
                </div>
                <span className="w-6 text-sm tabular-nums">{item.total}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Hoje</h2>
        {today.length === 0 ? <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-mute">Ninguém registrou o humor hoje.</p> : null}
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {today.map((item) => {
            const mood = MOODS.find((entry) => entry.id === item.mood);
            return (
              <li key={item.userId}>
                {user.role === "leadership" ? (
                  <Link href={`/humor?pessoa=${item.userId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-unica-mist">
                    <Avatar name={item.name} id={item.userId} hasAvatar={item.hasAvatar} />
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-sm">{mood?.emoji} {mood?.label}</span>
                    {item.visibility === "private" ? <span className="text-xs text-mute">Privado</span> : null}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={item.name} id={item.userId} hasAvatar={item.hasAvatar} />
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-sm">{mood?.emoji} {mood?.label}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">{focusId === user.id ? "Seu histórico" : `Histórico de ${people.find((person) => person.id === focusId)?.name ?? "colaborador"}`}</h2>
        {user.role === "leadership" ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {people.map((person) => (
              <Link key={person.id} href={person.id === user.id ? "/humor" : `/humor?pessoa=${person.id}`} className={person.id === focusId ? "rounded-full bg-unica-wash px-3 py-1.5 text-sm font-medium text-unica" : "rounded-full px-3 py-1.5 text-sm text-mute"}>
                {person.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        ) : null}
        {history.length === 0 ? <p className="text-sm text-mute">Sem registros nos últimos 30 dias.</p> : null}
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {history.map((entry) => {
            const mood = MOODS.find((item) => item.id === entry.mood);
            return (
              <li key={entry.date} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{formatDate(entry.date)}</span>
                <span>
                  {mood?.emoji} {mood?.label}
                  {user.role === "leadership" && entry.visibility === "private" ? <span className="ml-2 text-xs text-mute">Privado</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
