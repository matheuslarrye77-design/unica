import { redirect } from "next/navigation";
import { AuthFrame, LoginForm } from "@/components/auth";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/inicio");
  if (countUsers() === 0) redirect("/setup");
  return (
    <AuthFrame title="Acesso interno" text="Entre com o e-mail cadastrado pela liderança.">
      <LoginForm />
    </AuthFrame>
  );
}
