import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings/SettingsView";
export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  return <SettingsView />;
}
