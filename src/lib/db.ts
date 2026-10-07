import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | bigint | null;

const globalForDb = globalThis as unknown as { unicaDb?: DatabaseSync };

function createDatabase() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(path.join(dir, "unica.db"));
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA busy_timeout = 4000");
  database.exec("PRAGMA synchronous = NORMAL");
  migrate(database);
  return database;
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('collaborator', 'leadership')),
      job_title TEXT NOT NULL DEFAULT '',
      department TEXT NOT NULL DEFAULT '',
      birthday TEXT,
      avatar_path TEXT,
      bio TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      assignee_id INTEGER NOT NULL REFERENCES users(id),
      creator_id INTEGER NOT NULL REFERENCES users(id),
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'review', 'done')),
      due_date TEXT,
      category TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

    CREATE TABLE IF NOT EXISTS task_checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_checklist_task ON task_checklist_items(task_id);

    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

    CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);

    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('comunicado', 'noticia', 'aviso', 'evento')),
      author_id INTEGER NOT NULL REFERENCES users(id),
      pinned INTEGER NOT NULL DEFAULT 0,
      pinned_at TEXT,
      allow_comments INTEGER NOT NULL DEFAULT 1,
      event_date TEXT,
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_feed ON announcements(pinned, created_at);

    CREATE TABLE IF NOT EXISTS announcement_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_announcement_comments ON announcement_comments(announcement_id);

    CREATE TABLE IF NOT EXISTS announcement_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      reaction TEXT NOT NULL CHECK (reaction IN ('like', 'heart', 'clap', 'idea')),
      created_at TEXT NOT NULL,
      UNIQUE (announcement_id, user_id, reaction)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK (type IN ('reuniao', 'evento')),
      event_date TEXT NOT NULL,
      event_time TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

    CREATE TABLE IF NOT EXISTS birthday_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      year INTEGER NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_birthday_messages ON birthday_messages(recipient_id, year);

    CREATE TABLE IF NOT EXISTS moods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mood_date TEXT NOT NULL,
      mood TEXT NOT NULL CHECK (mood IN ('bem', 'normal', 'cansado', 'sobrecarregado', 'motivado')),
      visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, mood_date)
    );
    CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(mood_date);

    CREATE TABLE IF NOT EXISTS recognitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL CHECK (category IN ('proatividade', 'equipe', 'ideia', 'resultado', 'atendimento')),
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recognitions_to ON recognitions(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_recognitions_created ON recognitions(created_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      link TEXT,
      read_at TEXT,
      dedupe_key TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  ensureColumn(database, "users", "username", "username TEXT");
  ensureColumn(database, "users", "theme", "theme TEXT NOT NULL DEFAULT 'light'");
  ensureColumn(database, "users", "reposts_visible", "reposts_visible INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "users", "technical", "technical INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "users", "preferences", "preferences TEXT NOT NULL DEFAULT '{}'");
  database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");

  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL DEFAULT '',
      image_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE (post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_reposts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE (post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reposts_user ON post_reposts(user_id);

    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      single_vote INTEGER NOT NULL DEFAULT 1,
      hide_results INTEGER NOT NULL DEFAULT 1,
      author_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE (poll_id, user_id, option_id)
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL CHECK (kind IN ('sugestao', 'critica', 'melhoria', 'observacao')),
      body TEXT NOT NULL,
      anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedbacks_author ON feedbacks(author_id);

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL CHECK (platform IN ('pincel', 'prominas')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_documents_platform ON documents(platform, status, title);

    CREATE TABLE IF NOT EXISTS document_publishers (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const missing = database.prepare("SELECT id, name FROM users WHERE username IS NULL OR username = ''").all() as { id: number; name: string }[];
  const taken = new Set(
    (database.prepare("SELECT username FROM users WHERE username IS NOT NULL AND username != ''").all() as { username: string }[]).map((row) => row.username),
  );
  const updateUsername = database.prepare("UPDATE users SET username = ? WHERE id = ?");
  for (const person of missing) {
    const base = usernameFromName(person.name);
    let candidate = base;
    let suffix = 2;
    while (taken.has(candidate)) candidate = `${base}${suffix++}`;
    taken.add(candidate);
    updateUsername.run(candidate, person.id);
  }
}

function ensureColumn(database: DatabaseSync, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

function usernameFromName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return base || "pessoa";
}

export const db = globalForDb.unicaDb ?? createDatabase();
globalForDb.unicaDb = db;
if (globalForDb.unicaDb) migrate(db);

function plain<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function all<T>(sql: string, ...params: SqlValue[]): T[] {
  return (db.prepare(sql).all(...params) as T[]).map((row) => plain(row));
}

export function get<T>(sql: string, ...params: SqlValue[]): T | undefined {
  const row = db.prepare(sql).get(...params) as T | undefined;
  return row === undefined ? undefined : plain(row);
}

export function run(sql: string, ...params: SqlValue[]) {
  return db.prepare(sql).run(...params);
}

export function insert(sql: string, ...params: SqlValue[]) {
  const result = db.prepare(sql).run(...params);
  return Number(result.lastInsertRowid);
}

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function uploadDir() {
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
