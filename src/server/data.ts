import { all, get } from "@/lib/db";
import { notify } from "@/lib/audit";
import {
  addDays,
  calendarGrid,
  greetingForHour,
  isOverdue,
  longDate,
  monthTitle,
  nextBirthdayDate,
  todayInSaoPaulo,
  weekBounds,
} from "@/lib/dates";
import { isLeadership, taskAccessSql } from "@/lib/permissions";
import { firstName } from "@/lib/utils";
import type {
  AnnouncementCard,
  AnnouncementDetail,
  AnnouncementType,
  AuditItem,
  FeedPost,
  BirthdayMessage,
  BirthdayPerson,
  CalendarEntry,
  CompanyEvent,
  DocumentPlatform,
  DocumentStatus,
  DocumentView,
  EventType,
  FeedbackKind,
  FeedbackView,
  PollView,
  HomeData,
  MoodPerson,
  MoodSnapshot,
  MoodType,
  PersonOption,
  Priority,
  ReactionCount,
  ReactionType,
  RecognitionItem,
  SearchResults,
  SessionUser,
  TaskCard,
  TaskDetail,
  TaskStatus,
  TeamMember,
  TeamStats,
  AppNotification,
} from "@/lib/types";

const TASK_SELECT = `
  SELECT
    t.id, t.title, t.description,
    t.assignee_id AS assigneeId,
    ua.name AS assigneeName,
    CASE WHEN ua.avatar_path IS NOT NULL AND ua.avatar_path != '' THEN 1 ELSE 0 END AS assigneeHasAvatar,
    t.creator_id AS creatorId,
    uc.name AS creatorName,
    t.priority, t.status, t.due_date AS dueDate, t.category, t.notes,
    t.created_at AS createdAt, t.updated_at AS updatedAt,
    (SELECT COUNT(*) FROM task_comments c WHERE c.task_id = t.id) AS commentCount,
    (SELECT COUNT(*) FROM task_checklist_items i WHERE i.task_id = t.id) AS checklistTotal,
    (SELECT COUNT(*) FROM task_checklist_items i WHERE i.task_id = t.id AND i.done = 1) AS checklistDone
  FROM tasks t
  JOIN users ua ON ua.id = t.assignee_id
  JOIN users uc ON uc.id = t.creator_id
`;

type TaskRow = Omit<TaskCard, "assigneeHasAvatar" | "overdue" | "priority" | "status"> & {
  assigneeHasAvatar: number;
  priority: Priority;
  status: TaskStatus;
};

function mapTask(row: TaskRow, today = todayInSaoPaulo()): TaskCard {
  return {
    ...row,
    assigneeHasAvatar: row.assigneeHasAvatar === 1,
    priority: row.priority,
    status: row.status,
    overdue: isOverdue(row.dueDate, row.status, today),
  };
}

export function countUsers() {
  return get<{ total: number }>("SELECT COUNT(*) AS total FROM users")?.total ?? 0;
}

export function listPeople(activeOnly = true): PersonOption[] {
  const rows = all<{
    id: number;
    name: string;
    email: string;
    role: PersonOption["role"];
    jobTitle: string;
    department: string;
    birthday: string | null;
    hasAvatar: number;
    active: number;
    bio: string;
  }>(
    `SELECT id, name, email, role, job_title AS jobTitle, department, birthday, bio, active,
            CASE WHEN avatar_path IS NOT NULL AND avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM users
     ${activeOnly ? "WHERE active = 1" : ""}
     ORDER BY name COLLATE NOCASE`,
  );
  return rows.map((row) => ({ ...row, hasAvatar: row.hasAvatar === 1, active: row.active === 1 }));
}

export type TaskFilters = {
  assignee?: number;
  priority?: Priority;
  category?: string;
  status?: TaskStatus;
  due?: "overdue" | "today" | "week" | "none";
};

export function listTasks(user: SessionUser, filters: TaskFilters = {}) {
  const today = todayInSaoPaulo();
  const access = taskAccessSql(user);
  const where = [access.sql];
  const params: (string | number | null)[] = [...access.params];
  if (filters.assignee && isLeadership(user)) {
    where.push("t.assignee_id = ?");
    params.push(filters.assignee);
  }
  if (filters.priority) {
    where.push("t.priority = ?");
    params.push(filters.priority);
  }
  if (filters.category) {
    where.push("t.category = ?");
    params.push(filters.category);
  }
  if (filters.status) {
    where.push("t.status = ?");
    params.push(filters.status);
  }
  if (filters.due === "overdue") {
    where.push("t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?");
    params.push(today);
  } else if (filters.due === "today") {
    where.push("t.due_date = ?");
    params.push(today);
  } else if (filters.due === "week") {
    const week = weekBounds(today);
    where.push("t.due_date >= ? AND t.due_date <= ?");
    params.push(week.start, week.end);
  } else if (filters.due === "none") {
    where.push("t.due_date IS NULL");
  }
  const rows = all<TaskRow>(
    `${TASK_SELECT}
     WHERE ${where.join(" AND ")}
     ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'doing' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
              t.due_date IS NULL, t.due_date ASC, t.updated_at DESC
     LIMIT 300`,
    ...params,
  );
  const total = get<{ total: number }>(
    `SELECT COUNT(*) AS total FROM tasks t WHERE ${where.join(" AND ")}`,
    ...params,
  )?.total ?? 0;
  return { tasks: rows.map((row) => mapTask(row, today)), truncated: total > 300 };
}

export function listCategories(user: SessionUser) {
  const access = taskAccessSql(user);
  return all<{ category: string }>(
    `SELECT DISTINCT t.category AS category FROM tasks t
     WHERE t.category != '' AND ${access.sql}
     ORDER BY t.category COLLATE NOCASE`,
    ...access.params,
  ).map((row) => row.category);
}

export function getTask(user: SessionUser, id: number): TaskDetail | null {
  const access = taskAccessSql(user);
  const row = get<TaskRow>(`${TASK_SELECT} WHERE t.id = ? AND ${access.sql}`, id, ...access.params);
  if (!row) return null;
  const task = mapTask(row);
  const checklist = all<{ id: number; title: string; done: number; position: number }>(
    `SELECT id, title, done, position FROM task_checklist_items WHERE task_id = ? ORDER BY position, id`,
    id,
  ).map((item) => ({ ...item, done: item.done === 1 }));
  const comments = all<{ id: number; body: string; createdAt: string; userId: number; userName: string; hasAvatar: number }>(
    `SELECT c.id, c.body, c.created_at AS createdAt, c.user_id AS userId, u.name AS userName,
            CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM task_comments c JOIN users u ON u.id = c.user_id
     WHERE c.task_id = ? ORDER BY c.created_at ASC`,
    id,
  ).map((item) => ({ ...item, hasAvatar: item.hasAvatar === 1 }));
  const history = all<{ id: number; action: string; details: string; createdAt: string; userName: string }>(
    `SELECT h.id, h.action, h.details, h.created_at AS createdAt, u.name AS userName
     FROM task_history h JOIN users u ON u.id = h.user_id
     WHERE h.task_id = ? ORDER BY h.created_at DESC`,
    id,
  );
  const attachments = all<{ id: number; name: string; mime: string; size: number; createdAt: string }>(
    `SELECT id, original_name AS name, mime, size, created_at AS createdAt
     FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC`,
    id,
  );
  return { ...task, checklist, comments, history, attachments };
}

function reactionMap(ids: number[], userId: number) {
  const map = new Map<number, ReactionCount[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(", ");
  const rows = all<{ announcementId: number; reaction: ReactionType; total: number; mine: number }>(
    `SELECT announcement_id AS announcementId, reaction, COUNT(*) AS total,
            SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
     FROM announcement_reactions
     WHERE announcement_id IN (${placeholders})
     GROUP BY announcement_id, reaction`,
    userId,
    ...ids,
  );
  for (const row of rows) {
    const list = map.get(row.announcementId) ?? [];
    list.push({ type: row.reaction, count: row.total, mine: row.mine > 0 });
    map.set(row.announcementId, list);
  }
  return map;
}

type AnnouncementRow = Omit<AnnouncementCard, "pinned" | "allowComments" | "hasImage" | "authorHasAvatar" | "reactions"> & {
  pinned: number;
  allowComments: number;
  hasImage: number;
  authorHasAvatar: number;
};

function mapAnnouncement(row: AnnouncementRow, reactions: ReactionCount[]): AnnouncementCard {
  return {
    ...row,
    pinned: row.pinned === 1,
    allowComments: row.allowComments === 1,
    hasImage: row.hasImage === 1,
    authorHasAvatar: row.authorHasAvatar === 1,
    reactions,
  };
}

const ANNOUNCEMENT_SELECT = `
  SELECT a.id, a.title, a.content, a.type,
         a.author_id AS authorId, u.name AS authorName,
         CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS authorHasAvatar,
         a.pinned, a.allow_comments AS allowComments, a.event_date AS eventDate,
         CASE WHEN a.image_path IS NOT NULL AND a.image_path != '' THEN 1 ELSE 0 END AS hasImage,
         a.created_at AS createdAt, a.updated_at AS updatedAt,
         (SELECT COUNT(*) FROM announcement_comments c WHERE c.announcement_id = a.id) AS commentCount
  FROM announcements a
  JOIN users u ON u.id = a.author_id
`;

export function listAnnouncements(user: SessionUser, type?: AnnouncementType, page = 1, pageSize = 10) {
  const where = type ? "WHERE a.type = ?" : "";
  const params = type ? [type] : [];
  const total = get<{ total: number }>(`SELECT COUNT(*) AS total FROM announcements a ${where}`, ...params)?.total ?? 0;
  const offset = Math.max(0, page - 1) * pageSize;
  const rows = all<AnnouncementRow>(
    `${ANNOUNCEMENT_SELECT} ${where}
     ORDER BY a.pinned DESC, COALESCE(a.pinned_at, a.created_at) DESC, a.created_at DESC
     LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset,
  );
  const reactions = reactionMap(rows.map((row) => row.id), user.id);
  return {
    items: rows.map((row) => mapAnnouncement(row, reactions.get(row.id) ?? [])),
    total,
    page,
    pageSize,
  };
}

export function getAnnouncement(user: SessionUser, id: number): AnnouncementDetail | null {
  const row = get<AnnouncementRow>(`${ANNOUNCEMENT_SELECT} WHERE a.id = ?`, id);
  if (!row) return null;
  const reactions = reactionMap([id], user.id).get(id) ?? [];
  const comments = all<{ id: number; body: string; createdAt: string; userId: number; userName: string; hasAvatar: number }>(
    `SELECT c.id, c.body, c.created_at AS createdAt, c.user_id AS userId, u.name AS userName,
            CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM announcement_comments c JOIN users u ON u.id = c.user_id
     WHERE c.announcement_id = ? ORDER BY c.created_at ASC`,
    id,
  ).map((item) => ({ ...item, hasAvatar: item.hasAvatar === 1 }));
  return { ...mapAnnouncement(row, reactions), comments };
}

export function getTeamStats(): TeamStats {
  const today = todayInSaoPaulo();
  const row = get<{ open: number; doing: number; overdue: number; done: number; dueToday: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END), 0) AS open,
       COALESCE(SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END), 0) AS doing,
       COALESCE(SUM(CASE WHEN status != 'done' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END), 0) AS overdue,
       COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS done,
       COALESCE(SUM(CASE WHEN status != 'done' AND due_date = ? THEN 1 ELSE 0 END), 0) AS dueToday
     FROM tasks`,
    today,
    today,
  );
  return row ?? { open: 0, doing: 0, overdue: 0, done: 0, dueToday: 0 };
}

export function listTeam(): TeamMember[] {
  const today = todayInSaoPaulo();
  const rows = all<Omit<TeamMember, "hasAvatar"> & { hasAvatar: number }>(
    `SELECT u.id, u.name, u.job_title AS jobTitle, u.department,
            CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar,
            COALESCE(SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END), 0) AS openCount,
            COALESCE(SUM(CASE WHEN t.status = 'doing' THEN 1 ELSE 0 END), 0) AS doingCount,
            COALESCE(SUM(CASE WHEN t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ? THEN 1 ELSE 0 END), 0) AS overdueCount,
            COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS doneCount
     FROM users u
     LEFT JOIN tasks t ON t.assignee_id = u.id
     WHERE u.active = 1
     GROUP BY u.id
     ORDER BY u.name COLLATE NOCASE`,
    today,
  );
  return rows.map((row) => ({ ...row, hasAvatar: row.hasAvatar === 1 }));
}

export type TeamFilter = "todos" | "atrasadas" | "hoje" | "semana" | "concluidas" | "andamento";

export function listTeamTasks(filter: TeamFilter, assigneeId?: number) {
  const today = todayInSaoPaulo();
  const week = weekBounds(today);
  const where = ["1 = 1"];
  const params: (string | number)[] = [];
  if (assigneeId) {
    where.push("t.assignee_id = ?");
    params.push(assigneeId);
  }
  if (filter === "atrasadas") {
    where.push("t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?");
    params.push(today);
  }
  if (filter === "hoje") {
    where.push("t.status != 'done' AND t.due_date = ?");
    params.push(today);
  }
  if (filter === "semana") {
    where.push("t.status != 'done' AND t.due_date >= ? AND t.due_date <= ?");
    params.push(week.start, week.end);
  }
  if (filter === "concluidas") where.push("t.status = 'done'");
  if (filter === "andamento") where.push("t.status = 'doing'");
  const rows = all<TaskRow>(
    `${TASK_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY CASE WHEN t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ? THEN 0 ELSE 1 END,
              t.due_date IS NULL, t.due_date ASC, t.updated_at DESC
     LIMIT 100`,
    ...params,
    today,
  );
  return rows.map((row) => mapTask(row, today));
}

export function getCalendar(user: SessionUser, anchor: string, view: "mes" | "semana" | "agenda", types: string[], scope: "minhas" | "equipe") {
  const today = todayInSaoPaulo();
  let rangeStart = today;
  let rangeEnd = addDays(today, 30);
  if (view === "mes") {
    const grid = calendarGrid(anchor);
    rangeStart = grid.gridStart;
    rangeEnd = grid.gridEnd;
  } else if (view === "semana") {
    const week = weekBounds(anchor);
    rangeStart = week.start;
    rangeEnd = week.end;
  } else {
    rangeStart = anchor;
    rangeEnd = addDays(anchor, 45);
  }
  const entries: CalendarEntry[] = [];
  const show = (type: string) => types.length === 0 || types.includes(type);

  if (show("aniversario")) {
    const people = all<{ id: number; name: string; birthday: string }>(
      `SELECT id, name, birthday FROM users WHERE active = 1 AND birthday IS NOT NULL`,
    );
      for (const person of people) {
      const monthDay = person.birthday.slice(5, 10);
      let date = rangeStart.slice(0, 4) + "-" + monthDay;
      if (monthDay === "02-29") {
        const year = Number(rangeStart.slice(0, 4));
        const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        if (!leap) date = `${year}-02-28`;
      }
      const dates = [date];
      const nextYear = `${Number(date.slice(0, 4)) + 1}-${monthDay === "02-29" ? "02-28" : monthDay}`;
      dates.push(nextYear);
      for (const itemDate of dates) {
        if (itemDate >= rangeStart && itemDate <= rangeEnd) {
          entries.push({
            id: `bday-${person.id}-${itemDate}`,
            type: "aniversario",
            title: person.name,
            date: itemDate,
            href: `/aniversarios?pessoa=${person.id}`,
            meta: "Aniversário",
          });
        }
      }
    }
  }

  if (show("tarefa")) {
    const access =
      scope === "equipe" && isLeadership(user) ? { sql: "1 = 1", params: [] as number[] } : taskAccessSql(user);
    const tasks = all<{ id: number; title: string; dueDate: string; status: string; assigneeName: string }>(
      `SELECT t.id, t.title, t.due_date AS dueDate, t.status, u.name AS assigneeName
       FROM tasks t JOIN users u ON u.id = t.assignee_id
       WHERE t.due_date >= ? AND t.due_date <= ? AND ${access.sql}`,
      rangeStart,
      rangeEnd,
      ...access.params,
    );
    for (const task of tasks) {
      entries.push({
        id: `task-${task.id}`,
        type: "tarefa",
        title: task.title,
        date: task.dueDate,
        href: `/tarefas/${task.id}`,
        meta: task.status === "done" ? "Concluída" : task.assigneeName,
      });
    }
  }

  if (show("reuniao") || show("evento")) {
    const events = all<{ id: number; title: string; type: EventType; eventDate: string; eventTime: string | null }>(
      `SELECT id, title, type, event_date AS eventDate, event_time AS eventTime
       FROM events WHERE event_date >= ? AND event_date <= ?`,
      rangeStart,
      rangeEnd,
    );
    for (const event of events) {
      if (!show(event.type)) continue;
      entries.push({
        id: `event-${event.id}`,
        type: event.type,
        title: event.title,
        date: event.eventDate,
        time: event.eventTime,
        href: `/calendario?visao=${view}&data=${anchor}&evento=${event.id}`,
        meta: event.type === "reuniao" ? "Reunião" : "Evento",
      });
    }
  }

  if (show("comunicado")) {
    const posts = all<{ id: number; title: string; eventDate: string; type: AnnouncementType }>(
      `SELECT id, title, event_date AS eventDate, type FROM announcements
       WHERE event_date IS NOT NULL AND event_date >= ? AND event_date <= ?`,
      rangeStart,
      rangeEnd,
    );
    for (const post of posts) {
      entries.push({
        id: `post-${post.id}`,
        type: "comunicado",
        title: post.title,
        date: post.eventDate,
        href: `/mural/${post.id}`,
        meta: "Comunicado",
      });
    }
  }

  return { entries, rangeStart, rangeEnd, today, title: view === "mes" ? monthTitle(anchor) : "" };
}

export function listUpcomingEvents() {
  const today = todayInSaoPaulo();
  return all<CompanyEvent>(
    `SELECT e.id, e.title, e.description, e.type, e.event_date AS date, e.event_time AS time,
            e.created_by AS createdBy, u.name AS creatorName
     FROM events e JOIN users u ON u.id = e.created_by
     WHERE e.event_date >= ?
     ORDER BY e.event_date ASC, e.event_time ASC
     LIMIT 20`,
    today,
  );
}

export function getEvent(id: number) {
  return get<CompanyEvent>(
    `SELECT e.id, e.title, e.description, e.type, e.event_date AS date, e.event_time AS time,
            e.created_by AS createdBy, u.name AS creatorName
     FROM events e JOIN users u ON u.id = e.created_by
     WHERE e.id = ?`,
    id,
  );
}

function birthdayPeople(): BirthdayPerson[] {
  const today = todayInSaoPaulo();
  const rows = all<{ id: number; name: string; jobTitle: string; department: string; birthday: string; hasAvatar: number }>(
    `SELECT id, name, job_title AS jobTitle, department, birthday,
            CASE WHEN avatar_path IS NOT NULL AND avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM users WHERE active = 1 AND birthday IS NOT NULL`,
  );
  return rows
    .map((row) => {
      const nextDate = nextBirthdayDate(row.birthday, today);
      return {
        id: row.id,
        name: row.name,
        jobTitle: row.jobTitle,
        department: row.department,
        birthday: row.birthday,
        hasAvatar: row.hasAvatar === 1,
        nextDate,
        isToday: nextDate === today,
      };
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name));
}

export function listBirthdays() {
  const people = birthdayPeople();
  const today = people.filter((person) => person.isToday);
  const upcoming = people.filter((person) => !person.isToday && person.nextDate <= addDays(todayInSaoPaulo(), 60));
  return { today, upcoming };
}

export function birthdayMessages(recipientId: number, year: number): BirthdayMessage[] {
  return all<{ id: number; body: string; year: number; createdAt: string; authorId: number; authorName: string; hasAvatar: number }>(
    `SELECT m.id, m.body, m.year, m.created_at AS createdAt, m.author_id AS authorId,
            u.name AS authorName,
            CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM birthday_messages m JOIN users u ON u.id = m.author_id
     WHERE m.recipient_id = ? AND m.year = ?
     ORDER BY m.created_at DESC`,
    recipientId,
    year,
  ).map((row) => ({ ...row, hasAvatar: row.hasAvatar === 1 }));
}

export function myBirthdayMessages(userId: number) {
  const year = Number(todayInSaoPaulo().slice(0, 4));
  return birthdayMessages(userId, year);
}

export function listRecognitions(limit = 30): RecognitionItem[] {
  return all<{
    id: number;
    fromId: number;
    fromName: string;
    fromHasAvatar: number;
    toId: number;
    toName: string;
    toHasAvatar: number;
    category: RecognitionItem["category"];
    message: string;
    createdAt: string;
  }>(
    `SELECT r.id, r.from_user_id AS fromId, fu.name AS fromName,
            CASE WHEN fu.avatar_path IS NOT NULL AND fu.avatar_path != '' THEN 1 ELSE 0 END AS fromHasAvatar,
            r.to_user_id AS toId, tu.name AS toName,
            CASE WHEN tu.avatar_path IS NOT NULL AND tu.avatar_path != '' THEN 1 ELSE 0 END AS toHasAvatar,
            r.category, r.message, r.created_at AS createdAt
     FROM recognitions r
     JOIN users fu ON fu.id = r.from_user_id
     JOIN users tu ON tu.id = r.to_user_id
     ORDER BY r.created_at DESC
     LIMIT ?`,
    limit,
  ).map((row) => ({ ...row, fromHasAvatar: row.fromHasAvatar === 1, toHasAvatar: row.toHasAvatar === 1 }));
}

export function recognitionsFor(userId: number) {
  return listRecognitions(80).filter((item) => item.toId === userId);
}

export function todayMood(userId: number): MoodSnapshot | null {
  const today = todayInSaoPaulo();
  const row = get<{ mood: MoodType; visibility: MoodSnapshot["visibility"]; date: string }>(
    `SELECT mood, visibility, mood_date AS date FROM moods WHERE user_id = ? AND mood_date = ?`,
    userId,
    today,
  );
  return row ?? null;
}

export function moodHistory(viewer: SessionUser, userId: number) {
  if (viewer.id !== userId && !isLeadership(viewer)) return [];
  const from = addDays(todayInSaoPaulo(), -29);
  return all<{ date: string; mood: MoodType; visibility: MoodSnapshot["visibility"] }>(
    `SELECT mood_date AS date, mood, visibility FROM moods
     WHERE user_id = ? AND mood_date >= ? ORDER BY mood_date DESC`,
    userId,
    from,
  );
}

export function moodsToday(viewer: SessionUser): MoodPerson[] {
  const today = todayInSaoPaulo();
  const leadership = isLeadership(viewer) ? 1 : 0;
  return all<{ userId: number; name: string; mood: MoodPerson["mood"]; visibility: MoodPerson["visibility"]; date: string; hasAvatar: number }>(
    `SELECT m.user_id AS userId, u.name, m.mood, m.visibility, m.mood_date AS date,
            CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM moods m JOIN users u ON u.id = m.user_id
     WHERE m.mood_date = ?
       AND (m.visibility = 'public' OR m.user_id = ? OR ? = 1)
     ORDER BY u.name COLLATE NOCASE`,
    today,
    viewer.id,
    leadership,
  ).map((row) => ({ ...row, hasAvatar: row.hasAvatar === 1 }));
}

export function listNotifications(userId: number, limit = 40): AppNotification[] {
  return all<AppNotification & { readAt: string | null }>(
    `SELECT id, type, title, body, link, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    userId,
    limit,
  ).map((row) => ({ ...row, read: Boolean(row.readAt) }));
}

export function unreadCount(userId: number) {
  return get<{ total: number }>(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL",
    userId,
  )?.total ?? 0;
}

export function ensureDailyNotifications(user: SessionUser) {
  const today = todayInSaoPaulo();
  const year = Number(today.slice(0, 4));
  const due = all<{ id: number; title: string }>(
    `SELECT id, title FROM tasks WHERE assignee_id = ? AND status != 'done' AND due_date = ?`,
    user.id,
    today,
  );
  for (const task of due) {
    notify({
      userId: user.id,
      type: "due_today",
      title: "Seu prazo vence hoje",
      body: task.title,
      link: `/tarefas/${task.id}`,
      dedupeKey: `due:${task.id}:${today}`,
    });
  }
  const people = all<{ id: number; name: string }>(
    `SELECT id, name FROM users WHERE active = 1 AND birthday IS NOT NULL AND substr(birthday, 6, 5) = ?`,
    today.slice(5),
  );
  for (const person of people) {
    if (person.id === user.id) {
      notify({
        userId: user.id,
        type: "birthday",
        title: "Hoje é o seu aniversário",
        body: "As mensagens da equipe ficam em Aniversários.",
        link: `/aniversarios?pessoa=${user.id}`,
        dedupeKey: `bday-self:${year}`,
      });
    } else {
      notify({
        userId: user.id,
        type: "birthday",
        title: `Hoje é aniversário de ${person.name}`,
        body: "Deixe uma mensagem.",
        link: `/aniversarios?pessoa=${person.id}`,
        dedupeKey: `bday:${person.id}:${year}`,
      });
    }
  }
}

export function searchAll(user: SessionUser, query: string): SearchResults {
  const pattern = `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const access = taskAccessSql(user);
  const tasks = all<{ id: number; title: string; status: TaskStatus; dueDate: string | null }>(
    `SELECT t.id, t.title, t.status, t.due_date AS dueDate
     FROM tasks t
     WHERE ${access.sql} AND (t.title LIKE ? ESCAPE '\\' OR t.description LIKE ? ESCAPE '\\' OR t.category LIKE ? ESCAPE '\\')
     ORDER BY t.updated_at DESC LIMIT 20`,
    ...access.params,
    pattern,
    pattern,
    pattern,
  );
  const people = all<{ id: number; name: string; jobTitle: string; department: string; hasAvatar: number }>(
    `SELECT id, name, job_title AS jobTitle, department,
            CASE WHEN avatar_path IS NOT NULL AND avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM users
     WHERE active = 1 AND (name LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\' OR job_title LIKE ? ESCAPE '\\')
     ORDER BY name COLLATE NOCASE LIMIT 12`,
    pattern,
    pattern,
    pattern,
  ).map((row) => ({ ...row, hasAvatar: row.hasAvatar === 1 }));
  const announcements = all<{ id: number; title: string; type: AnnouncementType }>(
    `SELECT id, title, type FROM announcements
     WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC LIMIT 12`,
    pattern,
    pattern,
  );
  const events = all<{ id: number; title: string; date: string; type: EventType }>(
    `SELECT id, title, event_date AS date, type FROM events
     WHERE title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\'
     ORDER BY event_date DESC LIMIT 12`,
    pattern,
    pattern,
  );
  return { tasks, people, announcements, events };
}

export function getProfile(viewer: SessionUser, id: number) {
  const person = get<{
    id: number;
    name: string;
    username: string;
    email: string;
    role: SessionUser["role"];
    jobTitle: string;
    department: string;
    birthday: string | null;
    bio: string;
    hasAvatar: number;
    active: number;
  }>(
    `SELECT id, name, username, email, role, job_title AS jobTitle, department, birthday, bio, active,
            CASE WHEN avatar_path IS NOT NULL AND avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
     FROM users WHERE id = ?`,
    id,
  );
  if (!person || (person.active !== 1 && !isLeadership(viewer))) return null;
  const tasks = all<TaskRow>(
    `${TASK_SELECT} WHERE t.assignee_id = ? ${isLeadership(viewer) || viewer.id === id ? "" : "AND 1 = 0"}
     ORDER BY CASE WHEN t.status = 'done' THEN 1 ELSE 0 END, t.due_date IS NULL, t.due_date ASC
     LIMIT 8`,
    id,
  );
  const visibleTasks = tasks.map((row) => mapTask(row));
  return {
    id: person.id,
    name: person.name,
    username: person.username,
    email: viewer.id === id || isLeadership(viewer) ? person.email : "",
    repostsVisible: Boolean(get<{ reposts_visible: number }>("SELECT reposts_visible FROM users WHERE id = ?", id)?.reposts_visible),
    posts: profilePosts(id, false),
    reposts: viewer.id === id || isLeadership(viewer) || Boolean(get<{ reposts_visible: number }>("SELECT reposts_visible FROM users WHERE id = ?", id)?.reposts_visible) ? profilePosts(id, true) : [],
    role: person.role,
    jobTitle: person.jobTitle,
    department: person.department,
    birthday: person.birthday,
    bio: person.bio,
    hasAvatar: person.hasAvatar === 1,
    active: person.active === 1,
    tasks: visibleTasks,
    recognitions: recognitionsFor(id).slice(0, 8),
  };
}

export function listAudit(): AuditItem[] {
  return all<AuditItem>(
    `SELECT a.id, a.action, a.entity, a.entity_id AS entityId, a.details, a.created_at AS createdAt, u.name AS userName
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC LIMIT 40`,
  );
}

export function getHome(user: SessionUser): HomeData {
  const today = todayInSaoPaulo();
  const statsRow = get<{ open: number; done: number; today: number; overdue: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END), 0) AS open,
       COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS done,
       COALESCE(SUM(CASE WHEN status != 'done' AND due_date = ? THEN 1 ELSE 0 END), 0) AS today,
       COALESCE(SUM(CASE WHEN status != 'done' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END), 0) AS overdue
     FROM tasks WHERE assignee_id = ?`,
    today,
    today,
    user.id,
  );
  const tasks = all<TaskRow>(
    `${TASK_SELECT}
     WHERE t.assignee_id = ? AND t.status != 'done'
     ORDER BY CASE WHEN t.due_date IS NOT NULL AND t.due_date < ? THEN 0 ELSE 1 END,
              t.due_date IS NULL, t.due_date ASC,
              CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END
     LIMIT 6`,
    user.id,
    today,
  ).map((row) => mapTask(row, today));

  const birthdays = birthdayPeople();
  const todayItems: HomeData["today"] = [];
  for (const person of birthdays.filter((item) => item.isToday).slice(0, 3)) {
    todayItems.push({
      id: `bday-${person.id}`,
      title: person.name,
      meta: "Aniversário hoje",
      href: `/aniversarios?pessoa=${person.id}`,
    });
  }
  const events = all<{ id: number; title: string; time: string | null; type: string }>(
    `SELECT id, title, event_time AS time, type FROM events WHERE event_date = ? ORDER BY event_time ASC LIMIT 3`,
    today,
  );
  for (const event of events) {
    todayItems.push({
      id: `event-${event.id}`,
      title: event.title,
      meta: event.time ? `${event.type === "reuniao" ? "Reunião" : "Evento"} · ${event.time}` : event.type === "reuniao" ? "Reunião" : "Evento",
      href: "/calendario",
    });
  }
  const pinned = get<{ id: number; title: string }>(
    `SELECT id, title FROM announcements WHERE pinned = 1 ORDER BY pinned_at DESC LIMIT 1`,
  );
  if (pinned) {
    todayItems.push({ id: `pin-${pinned.id}`, title: pinned.title, meta: "Comunicado fixado", href: `/mural/${pinned.id}` });
  }
  const important = all<{ id: number; title: string }>(
    `SELECT id, title FROM tasks
     WHERE assignee_id = ? AND status != 'done' AND due_date = ? AND priority IN ('high', 'urgent')
     LIMIT 2`,
    user.id,
    today,
  );
  for (const task of important) {
    todayItems.push({ id: `task-${task.id}`, title: task.title, meta: "Prioridade para hoje", href: `/tarefas/${task.id}` });
  }

  const feed = listAnnouncements(user, undefined, 1, 3);
  return {
    greeting: greetingForHour(),
    firstName: firstName(user.name),
    dateLabel: longDate(today),
    stats: statsRow ?? { open: 0, done: 0, today: 0, overdue: 0 },
    tasks,
    today: todayItems.slice(0, 6),
    announcements: feed.items,
    birthdays: birthdays.filter((item) => !item.isToday).slice(0, 4),
    recognitions: listRecognitions(3),
    mood: todayMood(user.id),
  };
}

export function findUserByEmail(email: string) {
  return get<{ id: number; password_hash: string; active: number }>(
    "SELECT id, password_hash, active FROM users WHERE email = ?",
    email.trim().toLowerCase(),
  );
}

export function userExists(id: number) {
  return Boolean(get("SELECT id FROM users WHERE id = ? AND active = 1", id));
}

export function uniqueUsername(name: string) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 22) || "pessoa";
  let candidate = base;
  let suffix = 2;
  while (get("SELECT id FROM users WHERE username = ?", candidate)) {
    candidate = `${base}${suffix++}`;
  }
  return candidate;
}

type FeedRow = {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  username: string;
  hasAvatar: number;
  hasImage: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  liked: number;
  reposted: number;
  repostedByName: string | null;
  sortAt: string;
};

export function listFeed(viewer: SessionUser, page = 1) {
  const pageSize = 12;
  const offset = Math.max(0, page - 1) * pageSize;
  const leadership = isLeadership(viewer) ? 1 : 0;
  const rows = all<FeedRow>(
    `SELECT * FROM (
       SELECT p.id, p.body, p.created_at AS createdAt, p.author_id AS authorId, u.name AS authorName, u.username,
              CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar,
              CASE WHEN p.image_path IS NOT NULL AND p.image_path != '' THEN 1 ELSE 0 END AS hasImage,
              (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likeCount,
              (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS commentCount,
              (SELECT COUNT(*) FROM post_reposts r WHERE r.post_id = p.id) AS repostCount,
              (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
              (SELECT COUNT(*) FROM post_reposts r WHERE r.post_id = p.id AND r.user_id = ?) AS reposted,
              NULL AS repostedByName,
              p.created_at AS sortAt
       FROM posts p JOIN users u ON u.id = p.author_id
       UNION ALL
       SELECT p.id, p.body, p.created_at AS createdAt, p.author_id AS authorId, u.name AS authorName, u.username,
              CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar,
              CASE WHEN p.image_path IS NOT NULL AND p.image_path != '' THEN 1 ELSE 0 END AS hasImage,
              (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id) AS likeCount,
              (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS commentCount,
              (SELECT COUNT(*) FROM post_reposts r WHERE r.post_id = p.id) AS repostCount,
              (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
              1 AS reposted,
              ru.name AS repostedByName,
              rp.created_at AS sortAt
       FROM post_reposts rp
       JOIN posts p ON p.id = rp.post_id
       JOIN users u ON u.id = p.author_id
       JOIN users ru ON ru.id = rp.user_id
       WHERE ru.reposts_visible = 1 OR ru.id = ? OR ? = 1
     )
     ORDER BY sortAt DESC
     LIMIT ? OFFSET ?`,
    viewer.id,
    viewer.id,
    viewer.id,
    viewer.id,
    leadership,
    pageSize + 1,
    offset,
  );
  const slice = rows.slice(0, pageSize);
  const comments = slice.length
    ? all<{ id: number; postId: number; body: string; createdAt: string; userId: number; userName: string; username: string; hasAvatar: number }>(
        `SELECT c.id, c.post_id AS postId, c.body, c.created_at AS createdAt, c.user_id AS userId,
                u.name AS userName, u.username,
                CASE WHEN u.avatar_path IS NOT NULL AND u.avatar_path != '' THEN 1 ELSE 0 END AS hasAvatar
         FROM post_comments c JOIN users u ON u.id = c.user_id
         WHERE c.post_id IN (${slice.map(() => "?").join(",")})
         ORDER BY c.created_at ASC`,
        ...slice.map((row) => row.id),
      )
    : [];
  const posts: FeedPost[] = slice.map((row) => ({
    ...row,
    hasAvatar: row.hasAvatar === 1,
    hasImage: row.hasImage === 1,
    liked: row.liked > 0,
    reposted: row.reposted > 0,
    comments: comments
      .filter((comment) => comment.postId === row.id)
      .slice(-3)
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        userId: comment.userId,
        userName: comment.userName,
        username: comment.username,
        hasAvatar: comment.hasAvatar === 1,
      })),
  }));
  return { posts, hasMore: rows.length > pageSize };
}

export function accountSettings(userId: number) {
  const row = get<{ name: string; username: string; theme: "light" | "dark"; repostsVisible: number; preferences: string }>(
    "SELECT name, username, theme, reposts_visible AS repostsVisible, preferences FROM users WHERE id = ?",
    userId,
  );
  let preferences: Record<string, boolean> = {};
  try {
    preferences = row?.preferences ? (JSON.parse(row.preferences) as Record<string, boolean>) : {};
  } catch {
    preferences = {};
  }
  const theme: "light" | "dark" = row?.theme === "dark" ? "dark" : "light";
  return {
    name: row?.name ?? "",
    username: row?.username ?? "",
    theme,
    repostsVisible: row?.repostsVisible === 1,
    preferences,
  };
}

export function appSetting(key: string, fallback = "") {
  return get<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", key)?.value ?? fallback;
}

export function listOpenPolls(viewer: SessionUser) {
  const now = new Date().toISOString();
  const rows = all<{ id: number }>(
    "SELECT id FROM polls WHERE starts_at <= ? AND ends_at >= ? ORDER BY ends_at ASC LIMIT 3",
    now,
    now,
  );
  return rows.map((row) => pollById(viewer, row.id)).filter((item): item is PollView => Boolean(item));
}

export function listPolls(viewer: SessionUser): PollView[] {
  const rows = all<{ id: number }>("SELECT id FROM polls ORDER BY created_at DESC LIMIT 40");
  return rows.map((row) => pollById(viewer, row.id)).filter((item): item is PollView => Boolean(item));
}

function pollById(viewer: SessionUser, id: number): PollView | null {
  const poll = get<{
    id: number;
    question: string;
    startsAt: string;
    endsAt: string;
    singleVote: number;
    hideResults: number;
    authorName: string;
  }>(
    `SELECT p.id, p.question, p.starts_at AS startsAt, p.ends_at AS endsAt, p.single_vote AS singleVote,
            p.hide_results AS hideResults, u.name AS authorName
     FROM polls p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
    id,
  );
  if (!poll) return null;
  const now = new Date().toISOString();
  const closed = poll.endsAt < now || poll.startsAt > now;
  const ended = poll.endsAt < now;
  const votes = all<{ optionId: number; userId: number }>(
    "SELECT option_id AS optionId, user_id AS userId FROM poll_votes WHERE poll_id = ?",
    id,
  );
  const mine = new Set(votes.filter((vote) => vote.userId === viewer.id).map((vote) => vote.optionId));
  const canSeeResults = isLeadership(viewer) || poll.hideResults === 0 || ended;
  const options = all<{ id: number; label: string }>(
    "SELECT id, label FROM poll_options WHERE poll_id = ? ORDER BY position, id",
    id,
  ).map((option) => ({
    id: option.id,
    label: option.label,
    votes: canSeeResults ? votes.filter((vote) => vote.optionId === option.id).length : 0,
    selected: mine.has(option.id),
  }));
  return {
    id: poll.id,
    question: poll.question,
    startsAt: poll.startsAt,
    endsAt: poll.endsAt,
    singleVote: poll.singleVote === 1,
    hideResults: poll.hideResults === 1,
    closed,
    canSeeResults,
    voted: mine.size > 0,
    authorName: poll.authorName,
    options,
  };
}

export function listOwnFeedbacks(userId: number): FeedbackView[] {
  return all<{ id: number; kind: FeedbackKind; body: string; anonymous: number; createdAt: string }>(
    "SELECT id, kind, body, anonymous, created_at AS createdAt FROM feedbacks WHERE author_id = ? ORDER BY created_at DESC",
    userId,
  ).map((row) => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    anonymous: row.anonymous === 1,
    createdAt: row.createdAt,
    authorName: null,
  }));
}

export function listLeadershipFeedbacks(): FeedbackView[] {
  return all<{ id: number; kind: FeedbackKind; body: string; anonymous: number; createdAt: string; authorName: string }>(
    `SELECT f.id, f.kind, f.body, f.anonymous, f.created_at AS createdAt, u.name AS authorName
     FROM feedbacks f JOIN users u ON u.id = f.author_id
     ORDER BY f.created_at DESC LIMIT 80`,
  ).map((row) => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    anonymous: row.anonymous === 1,
    createdAt: row.createdAt,
    authorName: row.anonymous === 1 ? null : row.authorName,
  }));
}

export function listDocuments(
  viewer: SessionUser,
  filters: { platform?: DocumentPlatform; query?: string; sort?: "az" | "za"; status?: DocumentStatus },
): DocumentView[] {
  const where = ["1 = 1"];
  const params: (string | number)[] = [];
  if (!isLeadership(viewer)) {
    where.push("(d.status = 'approved' OR d.author_id = ?)");
    params.push(viewer.id);
  } else if (filters.status) {
    where.push("d.status = ?");
    params.push(filters.status);
  }
  if (filters.platform) {
    where.push("d.platform = ?");
    params.push(filters.platform);
  }
  if (filters.query) {
    where.push("(d.title LIKE ? OR d.description LIKE ? OR d.category LIKE ?)");
    const like = `%${filters.query}%`;
    params.push(like, like, like);
  }
  const direction = filters.sort === "za" ? "DESC" : "ASC";
  return all<DocumentView & { status: DocumentStatus; platform: DocumentPlatform }>(
    `SELECT d.id, d.title, d.description, d.category, d.platform, d.status, d.original_name AS originalName,
            d.author_id AS authorId, u.name AS authorName, d.created_at AS createdAt, d.updated_at AS updatedAt
     FROM documents d JOIN users u ON u.id = d.author_id
     WHERE ${where.join(" AND ")}
     ORDER BY d.title COLLATE NOCASE ${direction}`,
    ...params,
  );
}

export function documentPublishers() {
  return all<{ id: number; name: string }>(
    `SELECT u.id, u.name FROM document_publishers p JOIN users u ON u.id = p.user_id ORDER BY u.name`,
  );
}

function profilePosts(userId: number, reposts: boolean) {
  if (reposts) {
    return all<{ id: number; body: string; createdAt: string }>(
      `SELECT p.id, p.body, rp.created_at AS createdAt
       FROM post_reposts rp JOIN posts p ON p.id = rp.post_id
       WHERE rp.user_id = ? ORDER BY rp.created_at DESC LIMIT 12`,
      userId,
    );
  }
  return all<{ id: number; body: string; createdAt: string }>(
    "SELECT id, body, created_at AS createdAt FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 12",
    userId,
  );
}

export function pinnedAnnouncement() {
  const row = get<{ id: number; title: string; content: string; type: string; imagePath: string | null }>(
    "SELECT id, title, content, type, image_path AS imagePath FROM announcements WHERE pinned = 1 ORDER BY pinned_at DESC LIMIT 1",
  );
  if (!row) return null;
  return { id: row.id, title: row.title, content: row.content, type: row.type, hasImage: Boolean(row.imagePath) };
}

