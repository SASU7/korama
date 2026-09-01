import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderEvent, OrderStatus } from "@/lib/domain";

const TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function OrderTimeline({
  events,
  status,
}: {
  events: OrderEvent[];
  status: OrderStatus;
}) {
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const current = !event.complete && event.status === status;
        return (
          <li key={event.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  event.complete && "bg-success/20 border-transparent",
                  current && "ring-primary/40 bg-background ring-2",
                  !event.complete && !current && "bg-muted",
                )}
              >
                {event.complete && <Check className="text-success size-2.5" />}
              </span>
              {index < events.length - 1 && (
                <span className="bg-border w-px flex-1" />
              )}
            </div>
            <div className={cn("pb-4", index === events.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "font-medium",
                  !event.complete && !current && "text-muted-foreground",
                )}
              >
                {event.label}
              </p>
              <p className="text-muted-foreground text-(length:--text-meta)">
                {event.detail}
              </p>
              {event.complete && event.at && (
                <p className="text-muted-foreground font-mono text-[0.6875rem] tabular-nums">
                  {TIME.format(new Date(event.at))}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
