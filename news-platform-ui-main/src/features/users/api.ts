import { apiClient } from "@/lib/api-client";
import { Role, type AuthUser } from "@/features/auth/types";

export const usersApi = {
   getAll: async (): Promise<AuthUser[]> => {
      const response = await apiClient.get<AuthUser[]>("/users");
      return response.data;
   },
   updateRole: async (id: string, role: Role): Promise<AuthUser> => {
      const response = await apiClient.patch<AuthUser>(`/users/${id}/role`, {
         role,
      });
      return response.data;
   },
};
