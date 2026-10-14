export function normalizeLoginId(value: string): string;
export function hashPassword(password: string, salt: string): string;
export function tokenHash(token: string): string;
export function safeEqual(a: string, b: string): boolean;
export function passwordMatches(password: string, salt: string | undefined, hash: string | undefined): boolean;
