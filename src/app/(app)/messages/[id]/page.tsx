import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChatWindow } from "@/components/chat/ChatWindow";
export const metadata: Metadata = { title: "Chat", robots: { index: false } };
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
  return <ChatWindow conversationId={id} />;
}
