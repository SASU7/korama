import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shared/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[1.375rem] font-semibold">
          Page not found
        </h1>
        <p className="text-muted-foreground text-(length:--text-meta)">
          The link may be out of date.
        </p>
      </div>
      <Button asChild>
        <Link href="/shop">Browse the shop</Link>
      </Button>
    </main>
  );
}
