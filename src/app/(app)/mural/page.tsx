import { redirect } from "next/navigation";
import { MuralList } from "@/components/mural";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { listAnnouncements } from "@/server/data";
import type { AnnouncementType } from "@/lib/types";

const TYPES = new Set(["comunicado", "noticia", "aviso", "evento"]);

export default async function MuralPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const type = firstParam(params.tipo);
  const page = Math.max(1, Number(firstParam(params.pagina) || 1));
  const feed = listAnnouncements(user, type && TYPES.has(type) ? (type as AnnouncementType) : undefined, Number.isFinite(page) ? page : 1);
  return <MuralList items={feed.items} me={user} page={feed.page} total={feed.total} pageSize={feed.pageSize} type={type && TYPES.has(type) ? type : undefined} />;
}
