"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { MarketCode } from "@/lib/domain";

export function MarketSwitcher({ market }: { market: MarketCode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="market" className="text-muted-foreground sr-only sm:not-sr-only">
        Market
      </Label>
      <Select
        value={market}
        onValueChange={(value) => {
          const next = new URLSearchParams(params.toString());
          next.set("market", value);
          // Category counts differ per market, so a stale category filter
          // would silently produce an empty grid.
          next.delete("category");
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      >
        <SelectTrigger id="market" className="w-[168px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="GH">Ghana · GHS</SelectItem>
          <SelectItem value="NG">Nigeria · NGN</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
