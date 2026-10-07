import type { Role } from "@/features/auth/types";

export interface User {
   id: string;
   username: string;
   email: string;
   role: Role;
   createdAt: string;
}
