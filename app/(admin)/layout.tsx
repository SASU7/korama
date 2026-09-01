import Link from "next/link";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { requireAdministrator } from "@/lib/auth-guards-admin";

export const dynamic = "force-dynamic";

/**
 * Catalogue administration. Its own group, so neither the storefront shell nor
 * the staff console wraps it, and comfortable density because these are forms
 * rather than work queues.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdministrator();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-(--gutter)">
          <Wordmark href="/admin/products" />
          <Badge variant="outline">Catalogue admin</Badge>
          <nav className="ml-4 hidden gap-1 sm:flex">
            <Link
              href="/admin/products"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm"
            >
              Products
            </Link>
            <Link
              href="/shop"
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-sm"
            >
              View shop
            </Link>
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-(--gutter) py-8">
        {children}
      </main>
    </div>
  );
}
