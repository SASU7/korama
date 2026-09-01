import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40" />
      <div className="rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-2 h-6" />
        ))}
      </div>
    </div>
  );
}
