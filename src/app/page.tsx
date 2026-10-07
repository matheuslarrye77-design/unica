import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function IndexPage() {
  const user = await getCurrentUser();
  if (user) redirect("/inicio");
  if (countUsers() === 0) redirect("/setup");
  redirect("/login");
}
