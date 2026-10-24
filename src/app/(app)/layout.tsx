import type { ReactNode } from "react";
import { SideNav, TabBar } from "@/components/layout/Nav";
import { RightPanel } from "@/components/layout/RightPanel";
import { GlobalComposer } from "@/components/layout/GlobalComposer";
import { PageTransition } from "@/components/animations/PageTransition";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Three-column desktop layout, icon rail on tablet, bottom tabs on mobile. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user && !user.onboarded) redirect("/onboarding");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] gap-0 px-0 md:px-4">
      <SideNav />
      <main id="main" className="pb-safe mx-auto w-full min-w-0 max-w-[640px] flex-1 px-3 py-4 md:px-4 md:pb-8" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>
      <RightPanel />
      <TabBar />
      {user && <GlobalComposer />}
    </div>
  );
}
