"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_HOME, ROLE_LABELS } from "@/lib/navigation";
import type { UserRole } from "@/lib/domain";

export function AccountMenu({
  displayName,
  roles,
  activeRole,
}: {
  displayName?: string;
  roles: UserRole[];
  activeRole: UserRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(role: UserRole) {
    startTransition(async () => {
      await fetch("/api/auth/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.push(ROLE_HOME[role]);
      router.refresh();
    });
  }

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/shop");
      router.refresh();
    });
  }

  const staffRoles = roles.filter((r) => r !== "consumer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          aria-busy={pending}
        >
          <CircleUser className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          {displayName ?? "Signed in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/orders">Your orders</Link>
        </DropdownMenuItem>
        {staffRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Operations access
            </DropdownMenuLabel>
            {staffRoles.map((role) => (
              <DropdownMenuItem key={role} onSelect={() => go(role)}>
                {ROLE_LABELS[role]}
                {role === activeRole && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    active
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
