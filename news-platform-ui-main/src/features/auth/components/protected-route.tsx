"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { isAuthenticated, getUser } from "@/features/auth/utils";
import { ROUTES } from "@/lib/constants";

interface ProtectedRouteProps {
   children: ReactNode;
   allowedRoles?: string[];
}

export function ProtectedRoute({
   children,
   allowedRoles,
}: ProtectedRouteProps): React.JSX.Element | null {
   const router = useRouter();
   const [isChecking, setIsChecking] = useState<boolean>(true);
   const [hasAccess, setHasAccess] = useState<boolean>(false);

   useEffect(() => {
      let mounted = true;

      const check = (): void => {
         const authenticated = isAuthenticated();
         if (!mounted) return;

         if (!authenticated) {
            router.push(ROUTES.LOGIN);
            setIsChecking(false);
            return;
         }

         const user = getUser();
         if (allowedRoles && user && !allowedRoles.includes(user.role)) {
            router.push(ROUTES.NEWS);
            setIsChecking(false);
            return;
         }

         setHasAccess(true);
         setIsChecking(false);
      };

      check();
      return (): void => {
         mounted = false;
      };
   }, [router, allowedRoles]);

   if (isChecking) {
      return (
         <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      );
   }

   if (!hasAccess) return null;

   return <>{children}</>;
}
