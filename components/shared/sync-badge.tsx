import { cn } from "@/lib/utils";

export type SyncStatus = "local" | "polling" | "realtime";

const LABELS: Record<SyncStatus, string> = {
  realtime: "Live",
  polling: "Synced",
  local: "Connected",
};

/**
 * Where the data on screen came from. Shown in the staff console and on a
 * customer's order tracking page — the two places where "is this current?"
 * is a real question — and deliberately nowhere else in the storefront,
 * because a shopper does not care about the Realtime channel.
 */
export function SyncBadge({
  status,
  className,
}: {
  status: SyncStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-(length:--text-meta) text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "realtime" ? "bg-success" : "bg-muted-foreground/50",
        )}
      />
      {LABELS[status]}
    </span>
  );
}
