import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Composer, FeedList } from "@/components/feed";
import { QuickMood } from "@/components/mood";
import { PollCard } from "@/components/spaces";
import { RECOGNITION_CATEGORIES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { greetingForHour, longDate } from "@/lib/dates";
import { firstName, firstParam } from "@/lib/utils";
import { listFeed, listOpenPolls, listRecognitions, pinnedAnnouncement, todayMood } from "@/server/data";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const page = Math.max(1, Number(firstParam((await searchParams).page) || 1));
  const feed = listFeed(user, page);
  const pinned = pinnedAnnouncement();
  const polls = listOpenPolls(user);
  const recognitions = listRecognitions(3);
  const mood = todayMood(user.id);
  return (
    <div className="w-full">
      <section className="flex items-center justify-between gap-3 rounded-[14px] border border-[#EFEAF5] bg-white px-3 py-2 shadow-card">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[18px] leading-none" aria-hidden>☀️</span>
          <div className="min-w-0">
            <p className="sr-only">{longDate()}</p>
            <h1 className="truncate text-[14px] font-semibold leading-4">{greetingForHour()}, {firstName(user.name)}!</h1>
            <p className="truncate text-[11px] leading-4 text-mute">Que hoje seja um dia incrível!</p>
          </div>
        </div>
        <div className="shrink-0">
          <p className="mb-0.5 text-right text-[10px] leading-3 text-mute">Como você está hoje?</p>
          <QuickMood current={mood} />
        </div>
      </section>
      <div className="mt-2 grid gap-2">
        <Composer user={user} />
        {pinned ? (
          <Link href={`/mural/${pinned.id}`} className="flex items-center gap-2.5 rounded-[14px] bg-[#F4EEFB] px-3 py-2">
            {pinned.hasImage ? (
              <img src={`/api/media/announcement/${pinned.id}`} alt="" className="h-12 w-[68px] shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid h-12 w-[68px] shrink-0 place-items-center overflow-hidden rounded-lg bg-unica px-1 text-center text-[9px] font-semibold leading-3 text-white">{pinned.title}</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-medium leading-4 text-unica">Comunicado fixado pela liderança</span>
              <span className="block truncate text-[13px] font-semibold leading-4">{pinned.title}</span>
              <span className="line-clamp-2 block text-[11px] leading-4 text-mute">{pinned.content}</span>
            </span>
            <ChevronRight size={14} className="shrink-0 text-mute" />
          </Link>
        ) : null}
        <FeedList posts={feed.posts} me={user} />
        {polls[0] ? <PollCard poll={polls[0]} /> : null}
        {recognitions.length > 0 ? (
          <section className="rounded-[14px] border border-[#EFEAF5] bg-white p-3 shadow-card">
            <h2 className="text-[13px] font-semibold">Reconhecimentos recentes</h2>
            <ul className="mt-2 grid gap-1.5">
              {recognitions.map((item) => {
                const category = RECOGNITION_CATEGORIES.find((entry) => entry.id === item.category);
                return (
                  <li key={item.id} className="rounded-lg bg-unica-wash px-2.5 py-1.5 text-[12px] leading-4">
                    <p><span className="font-semibold">{item.fromName}</span> reconheceu <span className="font-semibold">{item.toName}</span></p>
                    <p className="text-[11px] text-mute">{category?.label ?? ""}</p>
                    <p className="mt-1">{item.message}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        <div className="flex justify-center gap-4 text-sm font-medium">
          {page > 1 ? <Link href={page === 2 ? "/inicio" : `/inicio?page=${page - 1}`} className="text-unica">Anterior</Link> : null}
          {feed.hasMore ? <Link href={`/inicio?page=${page + 1}`} className="text-unica">Próximas</Link> : null}
        </div>
      </div>
    </div>
  );
}
