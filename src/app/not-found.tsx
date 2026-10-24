import Link from "next/link";
import { PebbleMark } from "@/components/ui/SmartImage";
export default function NotFound() {
  return (
    <div className="aurora flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <PebbleMark className="h-16 w-16" />
      <h1 className="text-3xl">This pebble rolled away</h1>
      <p className="font-accent text-2xl text-muted">The page doesn't exist, or it's private.</p>
      <Link href="/home" className="btn-primary mt-2">Go home</Link>
    </div>
  );
}
