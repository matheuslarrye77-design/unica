import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AnnouncementComments, Post } from "@/components/mural";
import { getCurrentUser } from "@/lib/auth";
import { getAnnouncement } from "@/server/data";

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();
  const post = getAnnouncement(user, postId);
  if (!post) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/mural" className="text-sm font-medium text-unica">
        Mural
      </Link>
      <div className="mt-3">
        <Post item={post} me={user} detailed />
        <AnnouncementComments comments={post.comments} />
      </div>
    </div>
  );
}
