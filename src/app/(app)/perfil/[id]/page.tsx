import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";

export default async function PersonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const personId = Number(id);
  if (!Number.isInteger(personId)) notFound();
  return <ProfileView id={personId} />;
}
