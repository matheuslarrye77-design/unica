"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MOODS, VISIBILITY_LABEL } from "@/lib/constants";
import { setMood } from "@/server/actions";
import type { MoodSnapshot, MoodType, MoodVisibility } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, toast } from "./ui";

export function QuickMood({ current, labeled = false }: { current: MoodSnapshot | null; labeled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function choose(mood: MoodType) {
    setPending(true);
    const result = await setMood(mood, current?.visibility ?? "public");
    setPending(false);
    if (!result.ok) toast(result.error, "error");
    router.refresh();
  }

  return (
    <div className={cn("flex items-start", labeled ? "justify-between gap-1" : "items-center gap-0.5")} role="group" aria-label="Como você está hoje?">
      {MOODS.map((mood) => (
        <button
          key={mood.id}
          type="button"
          disabled={pending}
          aria-pressed={current?.mood === mood.id}
          aria-label={mood.label}
          title={mood.label}
          onClick={() => choose(mood.id)}
          className={cn("grid place-items-center", labeled ? "min-w-0 flex-1" : "h-6 w-6 rounded-full", current?.mood === mood.id && !labeled ? "bg-[#E7D8FB]" : "", !labeled && "hover:bg-[#F7F4FB]")}
        >
          <span className={cn("grid place-items-center rounded-full leading-none", labeled ? "h-7 w-7 text-[15px]" : "h-5 w-5 text-[13px]", labeled && (current?.mood === mood.id ? "bg-[#E7D8FB]" : "bg-[#F7F4FB]"))}>{mood.emoji}</span>
          {labeled ? <span className="mt-0.5 line-clamp-2 block text-center text-[9px] leading-3 text-mute">{mood.label}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TeamMoodStrip({ people }: { people: { userId: number; name: string; hasAvatar: boolean; mood: MoodType }[] }) {
  const [page, setPage] = useState(0);
  const size = 5;
  const pages = Math.max(1, Math.ceil(people.length / size));
  const slice = people.slice(page * size, page * size + size);
  return (
    <div>
      <div className="flex items-start gap-1">
        <button type="button" className="mt-1.5 grid h-5 w-4 shrink-0 place-items-center text-mute disabled:opacity-30" aria-label="Anteriores" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
          <ChevronLeft size={14} />
        </button>
        <div className="flex min-w-0 flex-1 justify-start gap-1">
          {slice.map((person) => {
            const mood = MOODS.find((item) => item.id === person.mood);
            return (
              <Link key={person.userId} href={`/humor?pessoa=${person.userId}`} className="w-12 shrink-0 text-center">
                <span className="relative mx-auto block w-fit">
                  <Avatar name={person.name} id={person.userId} hasAvatar={person.hasAvatar} size={28} />
                  <span className="absolute -bottom-0.5 -right-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-white text-[9px] leading-none">{mood?.emoji}</span>
                </span>
                <span className="mt-1 block truncate text-[10px] leading-3">{person.name.split(" ")[0]}</span>
                <span className="block truncate text-[9px] leading-3 text-mute">{mood?.label}</span>
              </Link>
            );
          })}
        </div>
        <button type="button" className="mt-1.5 grid h-5 w-4 shrink-0 place-items-center text-mute disabled:opacity-30" aria-label="Próximos" disabled={page >= pages - 1} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}>
          <ChevronRight size={14} />
        </button>
      </div>
      {pages > 1 ? (
        <div className="mt-1 flex justify-center gap-1" aria-hidden>
          {Array.from({ length: pages }, (_, index) => (
            <span key={index} className={index === page ? "h-1 w-1 rounded-full bg-unica" : "h-1 w-1 rounded-full bg-[#DDD7E6]"} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MoodPicker({ current }: { current: MoodSnapshot | null }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<MoodVisibility>(current?.visibility ?? "public");
  const [pending, setPending] = useState(false);

  async function choose(mood: MoodType, nextVisibility = visibility) {
    setPending(true);
    const result = await setMood(mood, nextVisibility);
    setPending(false);
    if (!result.ok) toast(result.error, "error");
    else toast(result.message || "Humor registrado.");
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-2xl bg-[#F3F1FF] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Como você está hoje?</h2>
        <div className="flex rounded-lg bg-white p-1" role="group" aria-label="Visibilidade do humor">
          {(["public", "private"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={visibility === value}
              className={cn("h-9 rounded-md px-3 text-sm", visibility === value ? "bg-unica-wash font-medium text-unica" : "text-mute")}
              onClick={() => {
                setVisibility(value);
                if (current) void choose(current.mood, value);
              }}
            >
              {VISIBILITY_LABEL[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {MOODS.map((mood) => {
          const selected = current?.mood === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              disabled={pending}
              aria-pressed={selected}
              onClick={() => choose(mood.id)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm transition",
                selected ? "border-[#E4D4F8] bg-[#E7D8FB] font-medium text-unica" : "border-white bg-white hover:border-[#E4D4F8]",
              )}
            >
              <span aria-hidden>{mood.emoji}</span>
              {mood.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-mute">
        {visibility === "private" ? "Somente você e a liderança veem este registro." : "Os colegas veem o humor de hoje. O histórico continua restrito."}
      </p>
    </section>
  );
}
