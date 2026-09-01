"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <CircleAlert className="text-muted-foreground size-7" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">This page didn&rsquo;t load.</p>
        <p className="text-muted-foreground max-w-[46ch] text-(length:--text-meta)">
          Usually a temporary connection problem. Nothing about your cart,
          payment or order state changed.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/shop">Back to the shop</Link>
        </Button>
      </div>
    </div>
  );
}
