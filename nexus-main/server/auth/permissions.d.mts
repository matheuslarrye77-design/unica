export function isLeader(user: { role?: string; department?: string } | null | undefined): boolean;
export function guardLeader(user: { role?: string; department?: string } | null | undefined): { status: number; body: { error?: string; ok?: boolean } };
