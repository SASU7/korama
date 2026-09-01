import { Skeleton } from "@/components/ui/skeleton";

/** Card geometry matches ProductCard exactly, so there is no layout shift. */
export default function ShopGridLoading() {
  return (
    <>
      <div className="mb-(--gutter) flex flex-col gap-(--stack)">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className="hidden lg:block">
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-4/5 w-full rounded-lg" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
