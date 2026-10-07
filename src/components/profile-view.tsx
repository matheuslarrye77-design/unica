import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileForm } from "@/components/forms";
import { Avatar, PriorityBadge } from "@/components/ui";
import { PRIORITY_LABEL, RECOGNITION_CATEGORIES, STATUS_LABEL } from "@/lib/constants";
import { formatBirthday, formatDate, formatWhen } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/server/data";

export async function ProfileView({ id }: { id: number }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = getProfile(user, id);
  if (!profile) notFound();
  const mine = profile.id === user.id;
  const canSeeTasks = mine || user.role === "leadership";
  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border border-line bg-white p-5">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} id={profile.id} hasAvatar={profile.hasAvatar} size={64} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.name}</h1>
            <p className="text-xs text-mute">@{profile.username}</p>
            <p className="text-sm text-mute">{profile.role === "leadership" ? "Liderança" : "Colaborador"}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-mute">Cargo</dt>
            <dd>{profile.jobTitle || "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-mute">Setor</dt>
            <dd>{profile.department || "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-mute">Aniversário</dt>
            <dd>{formatBirthday(profile.birthday)}</dd>
          </div>
          {profile.email ? (
            <div>
              <dt className="text-mute">E-mail</dt>
              <dd>{profile.email}</dd>
            </div>
          ) : null}
          {profile.bio ? (
            <div>
              <dt className="text-mute">Sobre</dt>
              <dd className="whitespace-pre-wrap">{profile.bio}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <div>
        {mine ? (
          <section>
            <h2 className="mb-3 text-base font-semibold">Editar perfil</h2>
            <div className="rounded-xl border border-line bg-white p-5">
              <ProfileForm user={{ ...user, name: profile.name, bio: profile.bio, hasAvatar: profile.hasAvatar }} />
            </div>
          </section>
        ) : null}
        <section className={mine ? "mt-8" : ""}>
          <h2 className="mb-3 text-base font-semibold">Atividades</h2>
          {!canSeeTasks ? <p className="text-sm text-mute">As atividades detalhadas ficam com a pessoa e a liderança.</p> : null}
          {canSeeTasks && profile.tasks.length === 0 ? <p className="text-sm text-mute">Nenhuma atividade por aqui.</p> : null}
          {canSeeTasks ? (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {profile.tasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/tarefas/${task.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-unica-mist">
                    <span>
                      <span className="block font-medium">{task.title}</span>
                      <span className="text-xs text-mute">
                        {formatDate(task.dueDate)} · {STATUS_LABEL[task.status]}
                      </span>
                    </span>
                    <PriorityBadge priority={task.priority} label={PRIORITY_LABEL[task.priority]} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Publicações</h2>
          {profile.posts.length === 0 ? <p className="text-sm text-mute">Nenhuma publicação.</p> : null}
          <ul className="space-y-2">
            {profile.posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap">{post.body || "Publicação com imagem"}</p>
                <p className="mt-1 text-xs text-mute">{formatWhen(post.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
        {profile.reposts.length > 0 || mine || user.role === "leadership" ? (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold">Republicações</h2>
            {profile.reposts.length === 0 ? <p className="text-sm text-mute">{profile.repostsVisible ? "Nenhuma republicação." : "As republicações estão ocultas para a equipe."}</p> : null}
            <ul className="space-y-2">
              {profile.reposts.map((post) => (
                <li key={`${post.id}-${post.createdAt}`} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
                  <p className="whitespace-pre-wrap">{post.body || "Publicação com imagem"}</p>
                  <p className="mt-1 text-xs text-mute">{formatWhen(post.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Reconhecimentos</h2>
          {profile.recognitions.length === 0 ? <p className="text-sm text-mute">Ainda não há reconhecimentos.</p> : null}
          <ul className="space-y-2">
            {profile.recognitions.map((item) => {
              const category = RECOGNITION_CATEGORIES.find((entry) => entry.id === item.category);
              return (
                <li key={item.id} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
                  <p>
                    <span className="font-medium">{item.fromName}</span> · {category?.label}
                  </p>
                  <p className="mt-1">{item.message}</p>
                  <p className="mt-1 text-xs text-mute">{formatWhen(item.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
