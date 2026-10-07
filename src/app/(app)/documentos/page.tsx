import { redirect } from "next/navigation";
import { DocumentBoard } from "@/components/spaces";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { appSetting, documentPublishers, listDocuments, listPeople } from "@/server/data";
import type { DocumentPlatform, DocumentStatus } from "@/lib/types";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const platform = firstParam(params.plataforma);
  const status = firstParam(params.status);
  const sort = firstParam(params.ordem) === "za" ? "za" : "az";
  const documents = listDocuments(user, {
    platform: platform === "pincel" || platform === "prominas" ? (platform as DocumentPlatform) : undefined,
    query: firstParam(params.q) || undefined,
    sort,
    status: status === "pending" || status === "approved" || status === "rejected" || status === "archived" ? (status as DocumentStatus) : undefined,
  });
  return (
    <DocumentBoard
      documents={documents}
      people={listPeople()}
      publishers={documentPublishers().map((person) => person.id)}
      mode={appSetting("document_mode", "approval")}
      birthdayStyle={appSetting("birthday_style", "name")}
      leadership={user.role === "leadership"}
      me={user}
    />
  );
}
