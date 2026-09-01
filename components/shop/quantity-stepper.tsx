"use client";

import { useOptimistic, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCartQuantityAction } from "@/app/(shop)/actions";
import { MAX_LINE_QUANTITY } from "@/lib/domain";
import { toast } from "sonner";

export function QuantityStepper({
  productId,
  quantity,
  label,
}: {
  productId: string;
  quantity: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(quantity);

  function change(next: number) {
    if (next < 1 || next > MAX_LINE_QUANTITY) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setCartQuantityAction(productId, next);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center gap-1" aria-busy={pending}>
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        disabled={optimistic <= 1}
        onClick={() => change(optimistic - 1)}
        aria-label={`Decrease ${label} quantity`}
      >
        <Minus className="size-3.5" aria-hidden />
      </Button>
      <span
        className="w-8 text-center font-mono tabular-nums"
        aria-live="polite"
        aria-label={`${label} quantity`}
      >
        {optimistic}
      </span>
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        disabled={optimistic >= MAX_LINE_QUANTITY}
        onClick={() => change(optimistic + 1)}
        aria-label={`Increase ${label} quantity`}
      >
        <Plus className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
