"use client";

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/features/users/api";
import { USERS_QUERY_KEY } from "@/features/users/constants";
import type { AuthUser } from "@/features/auth/types";

interface UseUsersReturn {
   users: AuthUser[] | undefined;
   isLoading: boolean;
}

export function useUsers(): UseUsersReturn {
   const { data: users, isLoading } = useQuery({
      queryKey: [USERS_QUERY_KEY],
      queryFn: () => usersApi.getAll(),
   });

   return { users, isLoading };
}
