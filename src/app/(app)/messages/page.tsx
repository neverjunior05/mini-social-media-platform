import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ConversationList } from "@/components/chat/ConversationList";
export const metadata: Metadata = { title: "Messages", robots: { index: false } };
export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
  return <ConversationList />;
}
