import Link from "next/link";
import { AuthFrame } from "@/components/auth";
import { ResetForm } from "@/components/spaces";
import { firstParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = firstParam((await searchParams).token) ?? "";
  return (
    <AuthFrame title="Nova senha" text="O link vale por uma hora e só pode ser usado uma vez.">
      {token ? <ResetForm token={token} /> : <p className="text-sm text-mute">Abra o link completo enviado para o seu e-mail.</p>}
      <Link href="/login" className="mt-4 block text-center text-sm text-unica">Ir para o acesso</Link>
    </AuthFrame>
  );
}
