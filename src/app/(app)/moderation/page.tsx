import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ModerationDashboard } from "@/components/moderation/ModerationDashboard";
export const metadata: Metadata = { title: "Moderation", robots: { index: false } };
export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user || user.role === "member") redirect("/home");
  return <ModerationDashboard isAdmin={user.role === "admin"} />;
}
