import { redirect } from "next/navigation";
import { SettingsActions } from "@/components/forms";
import { Restricted } from "@/components/team";
import { formatDateTime } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { listAudit, listPeople } from "@/server/data";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "leadership") return <Restricted />;
  const people = listPeople(false);
  const audit = listAudit();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-1 text-sm text-mute">Cadastro das pessoas, aniversários e acessos.</p>
      <div className="mt-6">
        <SettingsActions people={people} />
      </div>
      <section className="mt-10">
        <h2 className="mb-3 text-base font-semibold">Auditoria recente</h2>
        {audit.length === 0 ? <p className="text-sm text-mute">Nenhuma ação registrada.</p> : null}
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {audit.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <p>
                <span className="font-medium">{item.userName ?? "Sistema"}</span> · {item.action}
              </p>
              <p className="text-mute">{item.details || item.entity} · {formatDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
      <img src="/brand/wordmark.png" alt="Centro Universitário Única" className="mt-12 h-auto w-full max-w-[220px] opacity-80" />
    </div>
  );
}
