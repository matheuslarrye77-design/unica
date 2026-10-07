import { cookies } from "next/headers";
import { get, run } from "./db";
import { nowISO } from "./dates";
import type { Role, SessionUser } from "./types";

const COOKIE = "koban_session";
const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

type UserRow = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: Role;
  job_title: string;
  department: string;
  birthday: string | null;
  bio: string;
  avatar_path: string | null;
  theme: string | null;
  reposts_visible: number;
};

export function mapUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title,
    department: row.department,
    birthday: row.birthday,
    bio: row.bio,
    hasAvatar: Boolean(row.avatar_path),
    theme: row.theme === "dark" ? "dark" : "light",
    repostsVisible: row.reposts_visible === 1,
  };
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = get<UserRow>(
    `SELECT u.id, u.name, u.username, u.email, u.role, u.job_title, u.department, u.birthday, u.bio, u.avatar_path, u.theme, u.reposts_visible
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ? AND u.active = 1`,
    token,
    nowISO(),
  );
  return row ? mapUser(row) : null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FOURTEEN_DAYS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function sessionExpiry() {
  return new Date(Date.now() + FOURTEEN_DAYS * 1000).toISOString();
}

export function countUsers() {
  return get<{ total: number }>("SELECT COUNT(*) AS total FROM users")?.total ?? 0;
}

export function cleanupSessions() {
  run("DELETE FROM sessions WHERE expires_at <= ?", nowISO());
}
