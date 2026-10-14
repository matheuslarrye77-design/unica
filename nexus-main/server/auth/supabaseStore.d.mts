import type { AuthResult, AuthStore } from './flow.mjs';

export function serverSecretKey(env?: NodeJS.ProcessEnv): string;
export function supabaseConfigError(env?: NodeJS.ProcessEnv): AuthResult | null;
export function supabaseAuthStore(env?: NodeJS.ProcessEnv): AuthStore;
