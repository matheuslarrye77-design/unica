import { redirect } from "next/navigation";
import { FeedbackBoard } from "@/components/spaces";
import { getCurrentUser } from "@/lib/auth";
import { listLeadershipFeedbacks, listOwnFeedbacks } from "@/server/data";

export default async function FeedbacksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const leadership = user.role === "leadership";
  return <FeedbackBoard mine={listOwnFeedbacks(user.id)} incoming={leadership ? listLeadershipFeedbacks() : []} leadership={leadership} />;
}
