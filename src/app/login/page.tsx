import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/home");
  return <Suspense><AuthForm mode="login" /></Suspense>;
}
