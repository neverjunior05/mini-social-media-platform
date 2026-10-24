"use client";
import Link from "next/link";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl">Something wobbled</h1>
      <p className="max-w-sm text-sm text-muted">{error.message || "An unexpected error happened."}</p>
      <div className="flex gap-2"><button className="btn-primary" onClick={reset}>Try again</button><Link href="/home" className="btn-ghost">Go home</Link></div>
    </div>
  );
}
