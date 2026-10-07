import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function safeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 80) || "arquivo";
}

export function clip(text: string, max = 140) {
  const value = text.replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
