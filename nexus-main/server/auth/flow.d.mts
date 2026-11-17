export type PublicUser = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

export type AuthStore = {
  findCredential: (loginId: string) => Promise<{ user: PublicUser; passwordSalt: string; passwordHash: string } | null>;
  createSession: (input: { tokenHash: string; userId: string; expiresAt: string }) => Promise<void>;
  getSession: (tokenHash: string) => Promise<{ status: 'ok'; user: PublicUser } | { status: 'missing' | 'expired' }>;
  deleteSession: (tokenHash: string) => Promise<void>;
  updatePassword: (currentPassword: string, nextPassword: string, email?: string) => Promise<boolean>;
};

export type AuthResult = {
  status: number;
  body: { error?: string; user?: PublicUser; ok?: boolean };
  cookie?: string;
};

export function configError(): AuthResult;
export function performLogin(store: AuthStore, body: { email?: string; password?: string }): Promise<AuthResult>;
export function performSession(store: AuthStore, cookieHeader: string | undefined): Promise<AuthResult>;
export function performPasswordChange(store: AuthStore, body: { current?: string; next?: string }): Promise<AuthResult>;
export function performLogout(store: AuthStore, cookieHeader: string | undefined): Promise<AuthResult>;
