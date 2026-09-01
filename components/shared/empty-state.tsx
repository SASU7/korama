import { cn } from "@/lib/utils";

/**
 * Icon, a reason, and a real next step — never a bare "No data".
 *
 * `description` should state an operational fact the reader can act on
 * ("Lekki holds 3 batches of NK-SB-2407, 42 units eligible"), not a demo
 * instruction ("Complete the checkout to activate this workspace").
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <Icon className="size-7 text-muted-foreground" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-[46ch] text-(length:--text-meta) text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
