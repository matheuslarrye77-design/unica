"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { calendarGrid, monthTitle } from "@/lib/dates";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

export function RailCalendar({
  title,
  today,
  month,
  days,
  marks,
  children,
}: {
  title: string;
  today: string;
  month: string;
  days: string[];
  marks: Record<string, "birthday" | "event">;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(month);
  const viewing = cursor === month;
  const daysView = viewing ? days : calendarGrid(`${cursor}-01`, "sunday").days;
  const titleView = viewing ? title : monthTitle(`${cursor}-01`);
  const shift = (delta: number) => setCursor((current) => shiftMonth(current, delta));
  return (
    <section className="rounded-[14px] border border-[#EFEAF5] bg-white px-2.5 py-2 shadow-card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><CalendarDays size={14} className="text-unica" aria-hidden /> Calendário</h2>
        <Link href="/calendario" className="text-[11px] font-medium text-unica">Ver completo</Link>
      </div>
      <MonthGrid title={titleView} today={today} month={cursor} days={daysView} marks={viewing ? marks : {}} onShift={shift} />
      {children}
      <button type="button" className="mt-1.5 h-7 w-full rounded-lg border border-line text-[12px] font-medium text-[#3F3A46] hover:bg-unica-wash" onClick={() => setOpen(true)}>
        Ampliar calendário
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E1A24]/35 p-4">
          <div className="calendar-pop w-full max-w-lg rounded-2xl border border-line bg-white p-5">
            <MonthGrid title={titleView} today={today} month={cursor} days={daysView} marks={viewing ? marks : {}} onShift={shift} />
            <div className="mt-4 flex justify-between">
              <Link href="/calendario" className="text-sm font-medium text-unica">Abrir calendário completo</Link>
              <button type="button" className="text-sm" onClick={() => setOpen(false)}>Minimizar</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function shiftMonth(ym: string, delta: number) {
  const [year, mon] = ym.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function MonthGrid({ title, today, month, days, marks, onShift }: { title: string; today: string; month: string; days: string[]; marks: Record<string, "birthday" | "event">; onShift: (delta: number) => void }) {
  const weeks: string[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  const visible = weeks.filter((week) => week.some((day) => day.slice(0, 7) === month));
  return (
    <div>
      <div className="flex items-center justify-center gap-1">
        <button type="button" className="grid h-5 w-5 place-items-center rounded text-mute hover:bg-unica-wash" aria-label="Mês anterior" onClick={() => onShift(-1)}>
          <ChevronLeft size={14} />
        </button>
        <p className="min-w-[7.5rem] text-center text-[12px] font-medium">{title}</p>
        <button type="button" className="grid h-5 w-5 place-items-center rounded text-mute hover:bg-unica-wash" aria-label="Próximo mês" onClick={() => onShift(1)}>
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7 text-center text-[10px] text-mute">
        {WEEK.map((day, index) => <span key={`${day}-${index}`} className="grid h-4 place-items-center">{day}</span>)}
        {visible.flat().map((day) => {
          const inMonth = day.slice(0, 7) === month;
          const mark = marks[day];
          return (
            <span key={day} className="relative grid h-[22px] place-items-center text-[11px]">
              <span className={day === today ? "grid h-[22px] w-[22px] place-items-center rounded-full bg-unica text-white" : inMonth ? "text-ink" : "text-[#C8C2CE]"}>
                {Number(day.slice(8, 10))}
              </span>
              {mark && day !== today ? <span className={mark === "birthday" ? "absolute bottom-0 h-1 w-1 rounded-full bg-[#C4A6E4]" : "absolute bottom-0 h-1 w-1 rounded-full bg-[#8FB4E8]"} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
