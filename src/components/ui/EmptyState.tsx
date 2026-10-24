import { PebbleMark } from "./SmartImage";
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <PebbleMark className="h-14 w-14" />
      <p className="font-accent text-2xl text-coral-deep dark:text-peach">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
