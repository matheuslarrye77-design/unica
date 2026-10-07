import { redirect } from "next/navigation";
import { TaskBoard } from "@/components/tasks";
import { getCurrentUser } from "@/lib/auth";
import { firstParam } from "@/lib/utils";
import { listCategories, listPeople, listTasks } from "@/server/data";
import type { Priority, TaskStatus } from "@/lib/types";

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const STATUSES = new Set(["todo", "doing", "review", "done"]);
const DUES = new Set(["overdue", "today", "week", "none"]);

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const assignee = Number(firstParam(params.assignee));
  const priority = firstParam(params.priority);
  const status = firstParam(params.status);
  const due = firstParam(params.due);
  const category = firstParam(params.category) ?? "";
  const result = listTasks(user, {
    assignee: Number.isInteger(assignee) && assignee > 0 ? assignee : undefined,
    priority: priority && PRIORITIES.has(priority) ? (priority as Priority) : undefined,
    status: status && STATUSES.has(status) ? (status as TaskStatus) : undefined,
    due: due && DUES.has(due) ? (due as "overdue" | "today" | "week" | "none") : undefined,
    category: category || undefined,
  });
  return (
    <TaskBoard
      tasks={result.tasks}
      truncated={result.truncated}
      me={user}
      people={user.role === "leadership" ? listPeople() : []}
      categories={listCategories(user)}
      initialFilters={{
        assignee: firstParam(params.assignee),
        priority,
        status,
        due,
        category,
      }}
    />
  );
}
