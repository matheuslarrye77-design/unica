import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountForm } from "@/components/spaces";
import { getCurrentUser } from "@/lib/auth";
import { accountSettings } from "@/server/data";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = accountSettings(user.id);
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      <p className="mt-1 text-sm text-mute">
        Foto e texto do perfil ficam em <Link href="/perfil" className="font-medium text-unica">Meu perfil</Link>. O humor de hoje continua na área de humor.
      </p>
      <div className="mt-6">
        <AccountForm {...settings} />
      </div>
    </div>
  );
}
