import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Onboarding } from "@/components/onboarding/Onboarding";
export const metadata: Metadata = { title: "Welcome", robots: { index: false } };
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/home");
  return <Onboarding username={user.username} avatarUrl={user.avatarUrl} />;
}
