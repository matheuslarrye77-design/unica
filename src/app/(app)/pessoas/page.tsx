import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { listPeople } from "@/server/data";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const people = listPeople();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
      <p className="mt-1 text-sm text-mute">Quem faz parte da equipe.</p>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {people.map((person) => (
          <li key={person.id}>
            <Link href={`/perfil/${person.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-unica-mist">
              <Avatar name={person.name} id={person.id} hasAvatar={person.hasAvatar} size={40} />
              <span>
                <span className="block font-medium">{person.name}</span>
                <span className="text-xs text-mute">{person.jobTitle || (person.role === "leadership" ? "Liderança" : "Colaborador")}{person.department ? ` · ${person.department}` : ""}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
