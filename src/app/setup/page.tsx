import { redirect } from "next/navigation";
import { AuthFrame, SetupForm } from "@/components/auth";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await getCurrentUser()) redirect("/inicio");
  if (countUsers() > 0) redirect("/login");
  return (
    <AuthFrame title="Primeiro acesso" text="Crie a conta de liderança que vai administrar o espaço interno.">
      <SetupForm />
    </AuthFrame>
  );
}
