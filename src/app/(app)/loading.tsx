import { PostSkeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div className="space-y-4" aria-busy="true" aria-label="Loading"><div className="skeleton h-8 w-32" /><PostSkeleton /><PostSkeleton /></div>;
}
