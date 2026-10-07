import { redirect } from "next/navigation";
import { RightRail } from "@/components/right-rail";
import { Shell } from "@/components/shell";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { greetingForHour, todayInSaoPaulo } from "@/lib/dates";
import { firstName } from "@/lib/utils";
import { ensureDailyNotifications, unreadCount } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    await clearSessionCookie();
    redirect("/login");
  }
  ensureDailyNotifications(user);
  const unread = unreadCount(user.id);
  const today = todayInSaoPaulo();
  const birthdayToday = Boolean(user.birthday && user.birthday.slice(5, 10) === today.slice(5, 10));
  return (
    <Shell user={user} unread={unread} greeting={greetingForHour()} firstName={firstName(user.name)} birthdayToday={birthdayToday} rail={<RightRail user={user} />} mobileRail={<RightRail user={user} />}>
      {children}
    </Shell>
  );
}
