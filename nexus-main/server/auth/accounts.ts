import { builtinAccounts as roster } from './builtinAccounts.mjs';

export type AuthAccount = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

export function builtinAccounts(): AuthAccount[] {
  return roster;
}
