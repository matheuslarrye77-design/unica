export function pad(value) {
  return String(value).padStart(2, '0');
}

export function isoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addMonths(iso, months) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

export function birthdayWindow(month, day, year, viewMonths = 2) {
  const celebration = isoDate(year, month, day);
  return {
    year,
    celebration,
    prepareFrom: isoDate(year, month, 1),
    messageUntil: celebration,
    openAt: celebration,
    viewUntil: addMonths(celebration, viewMonths),
  };
}

export function activeBirthdayYear(month, day, today, viewMonths = 2) {
  const year = Number(today.slice(0, 4));
  for (const candidate of [year - 1, year, year + 1]) {
    const window = birthdayWindow(month, day, candidate, viewMonths);
    if (today >= window.prepareFrom && today <= window.viewUntil) return candidate;
  }
  const anniversary = `${pad(month)}-${pad(day)}`;
  return today.slice(5) > anniversary ? year + 1 : year;
}

export function phase(today, window) {
  if (today > window.viewUntil) return 'expired';
  if (today < window.prepareFrom) return 'upcoming';
  if (today < window.openAt) return 'preparing';
  return 'open';
}

export function canWrite(today, window) {
  return today >= window.prepareFrom && today <= window.messageUntil && today <= window.viewUntil;
}

export function canReadMessage(today, window, { leader, author, recipient }) {
  if (today > window.viewUntil || today < window.prepareFrom) return false;
  if (leader || author) return true;
  if (recipient) return today >= window.openAt;
  return today >= window.openAt;
}

export function expiredIds(editions, today) {
  return editions.filter((edition) => today > edition.viewUntil).map((edition) => edition.id);
}
