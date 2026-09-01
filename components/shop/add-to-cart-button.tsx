"use client";

import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartFormAction } from "@/app/(shop)/actions";
import { cn } from "@/lib/utils";

function Submit({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className={cn("w-full", className)}
      disabled={pending}
      aria-busy={pending}
    >
      <ShoppingBag className="size-4" aria-hidden />
      {pending ? "Adding\u2026" : "Add to cart"}
    </Button>
  );
}

/**
 * A real form, so adding to the cart works without JavaScript. The server
 * action revalidates, which refreshes the header count on its own.
 */
export function AddToCartButton({
  productId,
  className,
}: {
  productId: string;
  name?: string;
  className?: string;
}) {
  return (
    <form action={addToCartFormAction} className="w-full">
      <input type="hidden" name="productId" value={productId} />
      <Submit className={className} />
    </form>
  );
}
