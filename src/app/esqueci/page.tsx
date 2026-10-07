import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth";
import { ForgotForm } from "@/components/spaces";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  if (await getCurrentUser()) redirect("/inicio");
  return (
    <AuthFrame title="Esqueci minha senha" text="Informe o e-mail cadastrado. O link só sai quando o serviço de e-mail estiver configurado.">
      <ForgotForm />
      <Link href="/login" className="mt-4 block text-center text-sm text-unica">Voltar ao acesso</Link>
    </AuthFrame>
  );
}
