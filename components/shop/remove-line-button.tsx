"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addToCartAction, removeCartLineAction } from "@/app/(shop)/actions";

export function RemoveLineButton({
  productId,
  name,
  quantity,
}: {
  productId: string;
  name: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8"
      disabled={pending}
      aria-label={`Remove ${name} from cart`}
      onClick={() =>
        startTransition(async () => {
          const result = await removeCartLineAction(productId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast(`${name} removed`, {
            action: {
              label: "Undo",
              onClick: () => void addToCartAction(productId, quantity),
            },
          });
        })
      }
    >
      <X className="size-4" aria-hidden />
    </Button>
  );
}
