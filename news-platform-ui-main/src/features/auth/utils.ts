import { STORAGE_KEYS } from "@/lib/constants";
import type { AuthUser } from "./types";

export function saveAuth(token: string, user: AuthUser): void {
   if (typeof window === "undefined") return;
   localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
   localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
}

export function clearAuth(): void {
   if (typeof window === "undefined") return;
   localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
   localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
}

export function getToken(): string | null {
   if (typeof window === "undefined") return null;
   return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function getUser(): AuthUser | null {
   if (typeof window === "undefined") return null;
   const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
   if (!userStr) return null;
   try {
      return JSON.parse(userStr) as AuthUser;
   } catch {
      return null;
   }
}

export function isAuthenticated(): boolean {
   return !!getToken() && !!getUser();
}
