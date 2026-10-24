import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotificationList } from "@/components/notifications/NotificationList";
export const metadata: Metadata = { title: "Notifications", robots: { index: false } };
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  return <NotificationList />;
}
