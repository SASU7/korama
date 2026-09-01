import { cn } from "@/lib/utils";

/**
 * Batch numbers, order references, SKUs, sortie IDs.
 *
 * Mono is not decoration here: JetBrains Mono disambiguates 1/l/I, 5/S, 8/B
 * and dots the zero. Mis-reading a character in NK-SB-2407 is an operational
 * failure, so identifiers never render in the UI sans.
 */
export function Identifier({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.75rem] tracking-[-0.01em] tabular-nums",
        className,
      )}
      title={label ? `${label}: ${value}` : undefined}
    >
      {value}
    </span>
  );
}
