import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = { title: "Create account" };
export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/home");
  return <Suspense><AuthForm mode="register" /></Suspense>;
}
