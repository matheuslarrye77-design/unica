export enum Role {
   ADMIN = "ADMIN",
   EDITOR = "EDITOR",
   READER = "READER",
}

export interface AuthUser {
   id: string;
   email: string;
   username: string;
   role: Role;
}

export interface AuthResponse {
   token: string;
   id: string;
   email: string;
   username: string;
   role: Role;
}

export interface LoginPayload {
   emailOrUsername: string;
   password: string;
   captchaToken?: string;
}

export interface RegisterPayload {
   username: string;
   email: string;
   password: string;
   captchaToken?: string;
}
