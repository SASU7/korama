"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_HOME, ROLE_LABELS } from "@/lib/navigation";
import type { UserRole } from "@/lib/domain";

/**
 * Role switching, server-side. POSTs to /api/auth/role, which validates the
 * role against the caller's assignments and sets an httpOnly cookie — the
 * client never asserts its own role.
 *
 * Radix's DropdownMenu replaces ~38 lines of hand-rolled roving focus and
 * Escape handling, and adds typeahead and correct aria-activedescendant.
 */
export function RoleSwitcher({
  roles,
  activeRole,
  className,
}: {
  roles: UserRole[];
  activeRole: UserRole;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (roles.length < 2) return null;

  function switchTo(next: UserRole) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!response.ok) {
        setError("That role could not be selected.");
        return;
      }
      router.push(ROLE_HOME[next]);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={pending}
          aria-busy={pending}
        >
          {ROLE_LABELS[activeRole]}
          <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground font-normal">
          Roles assigned to your account
        </DropdownMenuLabel>
        {roles.map((role) => (
          <DropdownMenuItem key={role} onSelect={() => switchTo(role)}>
            <span className="flex-1">{ROLE_LABELS[role]}</span>
            {role === activeRole && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
        {error && (
          <p role="alert" className="text-destructive px-2 py-1.5 text-xs">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
