import { redirect } from "next/navigation";
import { RecognitionForm } from "@/components/forms";
import { RECOGNITION_CATEGORIES } from "@/lib/constants";
import { formatWhen } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { listPeople, listRecognitions } from "@/server/data";

export default async function RecognitionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const mine = params.meus === "1";
  const items = listRecognitions().filter((item) => !mine || item.fromId === user.id || item.toId === user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reconhecimentos</h1>
          <p className="mt-1 text-sm text-mute">Um agradecimento direto, sem ranking.</p>
        </div>
        <RecognitionForm people={listPeople()} me={user} />
      </div>
      {items.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Ainda não há reconhecimentos.</p> : null}
      <ul className="mt-6 space-y-3">
        {items.map((item) => {
          const category = RECOGNITION_CATEGORIES.find((entry) => entry.id === item.category);
          return (
            <li key={item.id} className="rounded-xl border border-line bg-white px-4 py-4">
              <p className="text-sm">
                <span className="font-semibold">{item.fromName}</span> para <span className="font-semibold">{item.toName}</span>
              </p>
              <p className="mt-2 text-sm leading-6">{item.message}</p>
              <p className="mt-2 text-xs text-mute">{category ? `${category.emoji} ${category.label} · ` : ""}{formatWhen(item.createdAt)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
