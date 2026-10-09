import { authHeaders } from '@/lib/session';
import { useEffect, useState } from 'react';

export type AgendaType = 'reuniao' | 'evento' | 'aniversario' | 'outro';

export type AgendaEvent = {
  id: string;
  title: string;
  type: AgendaType;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  description: string;
  participantIds: string[];
  everyone: boolean;
  personId: string;
  personName: string;
  avatar: string;
};

export type AgendaDraft = Partial<AgendaEvent> & { title: string; type: AgendaType; date: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export function loadEvents() {
  return request<{ events: AgendaEvent[] }>('/api/events');
}

export function createEvent(draft: AgendaDraft) {
  return request<{ event: AgendaEvent }>('/api/events', { method: 'POST', body: JSON.stringify(draft) });
}

export function updateEvent(id: string, draft: AgendaDraft) {
  return request<{ event: AgendaEvent }>(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(draft) });
}

export function deleteEvent(id: string) {
  return request<{ ok: boolean }>(`/api/events/${id}`, { method: 'DELETE' });
}

export function notifyEvents() {
  window.dispatchEvent(new Event('unica-events'));
}

export function useAgendaEvents() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  useEffect(() => {
    const refresh = () => {
      void loadEvents().then((result) => setEvents(result.events)).catch(() => setEvents([]));
    };
    refresh();
    window.addEventListener('unica-events', refresh);
    return () => window.removeEventListener('unica-events', refresh);
  }, []);
  return events;
}

export function parseAgendaDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function nextOccurrence(event: AgendaEvent, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (event.type !== 'aniversario') return parseAgendaDate(event.date);
  const birth = parseAgendaDate(event.date);
  const thisYear = new Date(start.getFullYear(), birth.getMonth(), birth.getDate());
  return thisYear >= start ? thisYear : new Date(start.getFullYear() + 1, birth.getMonth(), birth.getDate());
}
