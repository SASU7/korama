"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AccountMenu } from "@/components/shop/account-menu";
import { STORE_NAV, ROLE_LABELS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/domain";

export function StoreHeader({
  authenticated,
  displayName,
  roles,
  activeRole,
  cartCount,
}: {
  authenticated: boolean;
  displayName?: string;
  roles: UserRole[];
  activeRole: UserRole;
  cartCount: number;
}) {
  const pathname = usePathname();
  const staffRoles = roles.filter((r) => r !== "consumer");

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-4 px-(--gutter)">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b">
              <SheetTitle asChild>
                <Wordmark />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {STORE_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2 text-sm"
                >
                  {item.label}
                </Link>
              ))}
              {staffRoles.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <p className="text-muted-foreground px-3 pb-1 text-xs">
                    Operations
                  </p>
                  {staffRoles.map((role) => (
                    <span
                      key={role}
                      className="text-muted-foreground px-3 py-1 text-sm"
                    >
                      {ROLE_LABELS[role]}
                    </span>
                  ))}
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Store">
          {STORE_NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label={
              cartCount > 0 ? `Cart, ${cartCount} items` : "Cart, empty"
            }
          >
            <Link href="/cart" className="relative">
              <ShoppingBag className="size-4" aria-hidden />
              {cartCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 size-4 justify-center p-0 text-[0.625rem]">
                  {cartCount}
                </Badge>
              )}
            </Link>
          </Button>
          {authenticated ? (
            <AccountMenu
              displayName={displayName}
              roles={roles}
              activeRole={activeRole}
            />
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
