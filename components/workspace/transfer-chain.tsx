import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransferStep } from "@/lib/domain";

/** Ghana production through to destination receipt. */
export function TransferChain({ steps }: { steps: TransferStep[] }) {
  if (!steps.length)
    return (
      <p className="text-muted-foreground text-(length:--text-meta)">
        No transfer history for this operating company yet.
      </p>
    );

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                step.complete ? "bg-success/20 border-transparent" : "bg-muted",
              )}
            >
              {step.complete && <Check className="text-success size-2.5" />}
            </span>
            {index < steps.length - 1 && <span className="bg-border w-px flex-1" />}
          </div>
          <div className={cn("pb-3", index === steps.length - 1 && "pb-0")}>
            <p className="font-medium">{step.label}</p>
            <p className="text-muted-foreground text-(length:--text-meta)">
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
