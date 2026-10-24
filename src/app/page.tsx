import { getCurrentUser } from "@/lib/auth";
import { Landing } from "@/components/landing/Landing";
import { ensureSeeded } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  await ensureSeeded();
  const user = await getCurrentUser();
  return <Landing loggedIn={!!user} />;
}
