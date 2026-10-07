import { redirect } from "next/navigation";
import { PollBoard } from "@/components/spaces";
import { getCurrentUser } from "@/lib/auth";
import { listPolls } from "@/server/data";

export default async function PollsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <PollBoard polls={listPolls(user)} leadership={user.role === "leadership"} />;
}
