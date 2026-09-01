import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/shop",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 text-[0.8125rem] font-semibold tracking-[0.18em]",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-primary text-primary-foreground font-display grid size-6 place-items-center rounded-md text-[0.8125rem] font-bold tracking-normal"
      >
        K
      </span>
      <span>KORAMA</span>
    </Link>
  );
}
