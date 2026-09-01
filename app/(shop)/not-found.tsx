import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Compass className="text-muted-foreground size-7" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">We couldn&rsquo;t find that page.</p>
        <p className="text-muted-foreground text-(length:--text-meta)">
          The link may be out of date.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/markets">See markets</Link>
        </Button>
      </div>
    </div>
  );
}
