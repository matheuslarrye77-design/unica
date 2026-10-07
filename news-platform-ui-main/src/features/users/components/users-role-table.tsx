"use client";

import { useState } from "react";
import { getUser } from "@/features/auth/utils";
import { Role, type AuthUser } from "@/features/auth/types";
import { useUsers } from "@/features/users/hooks/use-users";
import { useUpdateRole } from "@/features/users/hooks/use-update-role";
import { ROLE_OPTIONS, ROLE_COLORS } from "@/features/users/constants";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export function UsersRoleTable(): React.JSX.Element {
   const currentUser = getUser();
   const [error, setError] = useState<string | null>(null);

   const { users, isLoading } = useUsers();
   const { mutate: updateRole, isPending } = useUpdateRole({
      onSuccess: () => setError(null),
      onError: (message) => setError(message),
   });

   const handleRoleChange = (user: AuthUser, newRole: Role): void => {
      if (user.role === newRole) return;
      setError(null);
      updateRole({ id: user.id, role: newRole });
   };

   if (isLoading) {
      return (
         <div className="flex justify-center py-32">
            <Spinner className="size-8" />
         </div>
      );
   }

   return (
      <div className="mx-auto max-w-4xl px-4 py-8">
         <div className="mb-6">
            <h1 className="text-2xl font-bold">Role Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
               Manage user roles and permissions.
            </p>
         </div>

         {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
               {error}
            </div>
         )}

         <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
               <thead>
                  <tr className="border-b bg-muted/50">
                     <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Username
                     </th>
                     <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Email
                     </th>
                     <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Current Role
                     </th>
                     <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        Change Role
                     </th>
                  </tr>
               </thead>
               <tbody>
                  {users?.map((user) => {
                     const isSelf = user.id === currentUser?.id;
                     return (
                        <tr
                           key={user.id}
                           className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                        >
                           <td className="px-4 py-3 font-medium">
                              {user.username}
                              {isSelf && (
                                 <span className="ml-2 text-xs text-muted-foreground">
                                    (you)
                                 </span>
                              )}
                           </td>
                           <td className="px-4 py-3 text-muted-foreground">
                              {user.email}
                           </td>
                           <td className="px-4 py-3">
                              <Badge
                                 className={`${ROLE_COLORS[user.role]} border-0`}
                              >
                                 {user.role}
                              </Badge>
                           </td>
                           <td className="px-4 py-3">
                              <select
                                 value={user.role}
                                 onChange={(e) =>
                                    handleRoleChange(
                                       user,
                                       e.target.value as Role,
                                    )
                                 }
                                 disabled={isSelf || isPending}
                                 className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                 {ROLE_OPTIONS.map((role) => (
                                    <option key={role} value={role}>
                                       {role}
                                    </option>
                                 ))}
                              </select>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>

            {(!users || users.length === 0) && (
               <p className="py-12 text-center text-muted-foreground">
                  No users found.
               </p>
            )}
         </div>
      </div>
   );
}
