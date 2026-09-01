import Link from "next/link";
import { Lock } from "lucide-react";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Focused checkout shell: no nav, no search, no cart button. Removing the
 * escape hatches is the standard commerce move and it makes crossing from
 * browsing into paying unmistakable.
 */
export const dynamic = "force-dynamic";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mb-8 border-b">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-3 px-(--gutter)">
          <Wordmark href="/cart" />
          <span className="text-muted-foreground flex items-center gap-1.5 text-(length:--text-meta)">
            <Lock className="size-3.5" aria-hidden />
            Secure checkout
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-foreground text-(length:--text-meta)"
            >
              Back to cart
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1080px] flex-1 px-(--gutter) pb-12">
        {children}
      </main>
    </div>
  );
}
