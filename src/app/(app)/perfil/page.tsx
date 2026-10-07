import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { getCurrentUser } from "@/lib/auth";

export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ProfileView id={user.id} />;
}
