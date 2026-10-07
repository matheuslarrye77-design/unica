import { Role } from "@/features/auth/types";

export const USERS_QUERY_KEY = "users" as const;

export const ROLE_OPTIONS: Role[] = [Role.ADMIN, Role.EDITOR, Role.READER];

export const ROLE_COLORS: Record<Role, string> = {
   [Role.ADMIN]: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
   [Role.EDITOR]:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
   [Role.READER]:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};
