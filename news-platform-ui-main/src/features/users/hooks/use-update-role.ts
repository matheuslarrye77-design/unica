"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/features/users/api";
import { USERS_QUERY_KEY } from "@/features/users/constants";
import type { Role, AuthUser } from "@/features/auth/types";

interface UseUpdateRoleReturn {
   mutate: (params: { id: string; role: Role }) => void;
   isPending: boolean;
   error: Error | null;
}

interface UseUpdateRoleOptions {
   onSuccess?: () => void;
   onError?: (message: string) => void;
}

export function useUpdateRole({
   onSuccess,
   onError,
}: UseUpdateRoleOptions = {}): UseUpdateRoleReturn {
   const queryClient = useQueryClient();

   const mutation = useMutation<
      AuthUser,
      { response?: { data?: { message?: string } } },
      { id: string; role: Role }
   >({
      mutationFn: ({ id, role }) => usersApi.updateRole(id, role),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
         onSuccess?.();
      },
      onError: (err) => {
         onError?.(err.response?.data?.message ?? "Failed to update role");
      },
   });

   return {
      mutate: mutation.mutate,
      isPending: mutation.isPending,
      error: mutation.error as Error | null,
   };
}
