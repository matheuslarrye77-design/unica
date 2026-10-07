import Link from "next/link";
import { CalendarDays, Gift, GraduationCap, Star, Users } from "lucide-react";
import { RailCalendar } from "@/components/rail-calendar";
import { QuickMood, TeamMoodStrip } from "@/components/mood";
import { appSetting, moodsToday, listBirthdays, listUpcomingEvents, todayMood } from "@/server/data";
import type { MoodType, SessionUser } from "@/lib/types";
import { calendarGrid, monthTitle, todayInSaoPaulo } from "@/lib/dates";
import { Avatar } from "./ui";

const MOOD_RANK: Record<MoodType, number> = {
  sobrecarregado: 0,
  cansado: 1,
  normal: 2,
  bem: 3,
  motivado: 4,
};

export function RightRail({ user }: { user: SessionUser }) {
  const today = todayInSaoPaulo();
  const grid = calendarGrid(today, "sunday");
  const moods = moodsToday(user).sort((a, b) => MOOD_RANK[a.mood] - MOOD_RANK[b.mood] || a.name.localeCompare(b.name));
  const birthdayList = listBirthdays();
  const birthdays = [...birthdayList.today, ...birthdayList.upcoming];
  const todayEvents = listUpcomingEvents().filter((event) => event.date === today);
  const showPhoto = appSetting("birthday_style", "name") === "photo";
  const marks: Record<string, "birthday" | "event"> = {};
  for (const person of [...birthdayList.today, ...birthdayList.upcoming]) marks[person.nextDate] = "birthday";
  for (const event of listUpcomingEvents()) {
    if (event.date.slice(0, 7) === today.slice(0, 7)) marks[event.date] = marks[event.date] ?? "event";
  }
  const company = [
    ...birthdayList.today.map((person) => ({ id: `b-${person.id}`, title: person.name, meta: "Aniversário hoje", href: `/aniversarios?pessoa=${person.id}` })),
    ...todayEvents.map((event) => ({ id: `e-${event.id}`, title: event.title, meta: event.time ? event.time.slice(0, 5) : "Evento", href: "/calendario" })),
  ];
  const agenda = [
    ...todayEvents.map((event) => ({
      id: `e-${event.id}`,
      href: "/calendario",
      title: event.title,
      meta: event.time ? `Hoje · ${event.time.slice(0, 5)}` : "Hoje",
      mark: "event" as const,
    })),
    ...birthdays.map((person) => ({
      id: `b-${person.id}`,
      href: `/aniversarios?pessoa=${person.id}`,
      title: person.isToday ? `Aniversário · ${person.name}` : person.name,
      meta: person.isToday ? "Hoje" : `${person.nextDate.slice(8, 10)}/${person.nextDate.slice(5, 7)}`,
      mark: "birthday" as const,
      person,
    })),
  ].slice(0, 3);
  return (
    <div className="grid gap-2">
      <RailCalendar title={monthTitle(today)} today={today} month={today.slice(0, 7)} days={grid.days} marks={marks}>
        <ul className="mt-1.5 grid gap-1 border-t border-line pt-1.5">
          {agenda.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-2 text-[12px] leading-4">
                {item.mark === "birthday" && showPhoto && item.person ? <Avatar name={item.person.name} id={item.person.id} hasAvatar={item.person.hasAvatar} size={22} /> : <RailIcon kind={item.mark === "birthday" ? "birthday" : item.title.toLowerCase().includes("trein") ? "training" : "event"} />}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="text-[10px] text-mute">{item.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </RailCalendar>
      <section className="rounded-[14px] border border-[#EFEAF5] bg-white px-2.5 py-2 shadow-card">
        <h2 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold"><Users size={14} className="text-unica" aria-hidden /> Como está a equipe hoje?</h2>
        {moods.length === 0 ? <p className="text-[12px] text-mute">Ninguém registrou o humor hoje.</p> : <TeamMoodStrip people={moods} />}
      </section>
      <section className="rounded-[14px] border border-[#EFEAF5] bg-white px-2.5 py-2 shadow-card">
        <h2 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><Star size={14} className="text-unica" aria-hidden /> Reações rápidas</h2>
        <QuickMood current={todayMood(user.id)} labeled />
      </section>
      <section className="rounded-[14px] border border-[#EFEAF5] bg-white px-2.5 py-2 shadow-card">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><CalendarDays size={14} className="text-unica" aria-hidden /> Hoje na empresa</h2>
          <Link href="/calendario" className="text-[11px] font-medium text-unica">Ver todos</Link>
        </div>
        {company.length === 0 ? <p className="text-[12px] text-mute">Nada marcado para hoje.</p> : null}
        <ul className="grid gap-1.5">
          {company.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-2 text-[12px] leading-4">
                <RailIcon kind={item.id.startsWith("b-") ? "birthday" : item.title.toLowerCase().includes("trein") ? "training" : "event"} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="block text-[10px] text-mute">{item.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RailIcon({ kind }: { kind: "birthday" | "event" | "training" }) {
  const Icon = kind === "birthday" ? Gift : kind === "training" ? GraduationCap : CalendarDays;
  const tone = kind === "birthday" ? "bg-[#FDECEC] text-[#D4536A]" : kind === "training" ? "bg-[#EEF3FF] text-[#3D6CB5]" : "bg-[#F3EEF8] text-unica";
  return (
    <span aria-hidden className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md ${tone}`}>
      <Icon size={12} />
    </span>
  );
}
