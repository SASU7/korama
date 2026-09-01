import { Wordmark } from "@/components/shared/brand";
import { Skeleton } from "@/components/ui/skeleton";

/** Same 56px height as the real header, so nothing shifts when it resolves. */
export function StoreHeaderSkeleton() {
  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-(--gutter)">
        <Wordmark />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </header>
  );
}
