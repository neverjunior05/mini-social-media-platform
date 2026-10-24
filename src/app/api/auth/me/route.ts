import { handler, json } from "@/lib/api";
import { getCurrentUser, publicUser } from "@/lib/auth";
export const GET = handler(async () => {
  const u = await getCurrentUser();
  return json({ user: u ? { ...publicUser(u), email: u.email, onboarded: u.onboarded } : null });
});
