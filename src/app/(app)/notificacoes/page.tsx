import Link from "next/link";
import { redirect } from "next/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions";
import { formatWhen } from "@/lib/dates";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/server/data";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const items = listNotifications(user.id);
  const unread = items.some((item) => !item.read);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="mt-1 text-sm text-mute">Atividades, prazos, comunicados e recados.</p>
        </div>
        {unread ? (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="min-h-11 rounded-lg px-3 text-sm font-semibold text-unica">
              Marcar todas como lidas
            </button>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-mute">Nenhuma notificação.</p> : null}
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {items.map((item) => (
          <li key={item.id} className={item.read ? "px-4 py-3" : "bg-unica-mist px-4 py-3"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {item.link ? (
                  <Link href={item.link} className="font-medium hover:text-unica">
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-medium">{item.title}</p>
                )}
                {item.body ? <p className="mt-1 text-sm text-mute">{item.body}</p> : null}
                <p className="mt-1 text-xs text-mute">{formatWhen(item.createdAt)}</p>
              </div>
              {!item.read ? (
                <form action={markNotificationRead.bind(null, item.id)}>
                  <button type="submit" className="text-sm font-medium text-unica">
                    Marcar como lida
                  </button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
