"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircle } from "lucide-react";
import { getUser, clearAuth } from "@/features/auth/utils";
import { Role } from "@/features/auth/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Popover,
   PopoverTrigger,
   PopoverContent,
} from "@/components/ui/popover";

export function Navbar(): React.JSX.Element {
   const router = useRouter();
   const user = getUser();

   const handleSignOut = (): void => {
      clearAuth();
      router.push("/login");
   };

   return (
      <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
         <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/news" className="text-xl font-bold tracking-tight">
               <span className="text-black">NE</span>
               <span className="text-red-600">WS</span>
            </Link>

            <div className="flex items-center gap-3">
               {user?.role === Role.ADMIN && (
                  <Link
                     href="/dashboard/users"
                     className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                     Role Settings
                  </Link>
               )}

               <Popover>
                  <PopoverTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 cursor-pointer">
                     <UserCircle className="size-5" />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64">
                     {user && (
                        <div className="flex flex-col gap-3">
                           <div className="flex flex-col gap-1">
                              <p className="text-sm font-medium">
                                 {user.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                 {user.email}
                              </p>
                           </div>
                           <Badge variant="secondary" className="w-fit">
                              {user.role}
                           </Badge>
                           <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={handleSignOut}
                           >
                              Sign out
                           </Button>
                        </div>
                     )}
                  </PopoverContent>
               </Popover>
            </div>
         </div>
      </nav>
   );
}
