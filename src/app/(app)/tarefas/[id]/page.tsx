import { notFound, redirect } from "next/navigation";
import { TaskScreen } from "@/components/task-screen";
import { getCurrentUser } from "@/lib/auth";
import { getTask, listPeople } from "@/server/data";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) notFound();
  const task = getTask(user, taskId);
  if (!task) notFound();
  return <TaskScreen task={task} me={user} people={user.role === "leadership" ? listPeople() : []} />;
}
