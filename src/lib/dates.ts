const TZ = "America/Sao_Paulo";

export function nowISO() {
  return new Date().toISOString();
}

export function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function hourInSaoPaulo() {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  return Number(hour);
}

export function greetingForHour(hour = hourInSaoPaulo()) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "Sem prazo";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} d`;
  return formatDateTime(iso);
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatBirthday(iso: string | null) {
  if (!iso) return "Não informado";
  const [, month, day] = iso.split("-");
  return `${Number(day)} de ${MONTHS[Number(month) - 1]}`;
}

export function longDate(iso = todayInSaoPaulo()) {
  const date = parseISODate(iso);
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthTitle(iso: string) {
  const date = parseISODate(iso);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function weekBounds(anchor = todayInSaoPaulo()) {
  const date = parseISODate(anchor);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: formatISODate(monday), end: formatISODate(sunday) };
}

export function monthBounds(anchor: string) {
  const date = parseISODate(anchor);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: formatISODate(start), end: formatISODate(end) };
}

export function calendarGrid(anchor: string, weekStartsOn: "monday" | "sunday" = "monday") {
  const { start, end } = monthBounds(anchor);
  const first = parseISODate(start);
  const lead = weekStartsOn === "sunday" ? first.getUTCDay() : first.getUTCDay() === 0 ? 6 : first.getUTCDay() - 1;
  const gridStart = addDays(start, -lead);
  const days: string[] = [];
  for (let index = 0; index < 42; index += 1) days.push(addDays(gridStart, index));
  return { start, end, days, gridStart: days[0], gridEnd: days[41] };
}

export function nextBirthdayDate(birthday: string, today = todayInSaoPaulo()) {
  const monthDay = birthday.slice(5, 10);
  const year = Number(today.slice(0, 4));
  let next = `${year}-${monthDay}`;
  if (monthDay === "02-29" && !isLeap(year)) next = `${year}-02-28`;
  if (next < today) {
    const following = year + 1;
    next = `${following}-${monthDay}`;
    if (monthDay === "02-29" && !isLeap(following)) next = `${following}-02-28`;
  }
  return next;
}

function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isOverdue(dueDate: string | null, status: string, today = todayInSaoPaulo()) {
  return Boolean(dueDate && status !== "done" && dueDate < today);
}
