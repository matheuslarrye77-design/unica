import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function ProtectedLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>): React.JSX.Element {
   return (
      <ProtectedRoute>
         <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
         </div>
      </ProtectedRoute>
   );
}
