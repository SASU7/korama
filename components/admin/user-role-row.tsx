"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  saveUserRolesAction,
  type RoleActionResult,
} from "@/app/(admin)/admin/users/actions";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type AssignableRole,
} from "@/lib/navigation";
import type { AdminUserRow } from "@/lib/role-types";

function Save({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={dirty ? "default" : "outline"}
      disabled={!dirty || pending}
      aria-busy={pending}
    >
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function UserRoleRow({
  account,
  isSelf,
  lastSignIn,
}: {
  account: AdminUserRow;
  isSelf: boolean;
  lastSignIn: string;
}) {
  const [result, action] = useActionState<RoleActionResult | null, FormData>(
    saveUserRolesAction,
    null,
  );
  const held = ASSIGNABLE_ROLES.filter((role) => account.roles.includes(role));
  const [selected, setSelected] = useState<AssignableRole[]>(held);

  // Compare against what the server last rendered, so the Save button goes
  // quiet again after a successful round trip.
  const dirty =
    selected.length !== held.length ||
    selected.some((role) => !held.includes(role));

  function toggle(role: AssignableRole, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, role] : current.filter((held) => held !== role),
    );
  }

  return (
    <TableRow>
      <TableCell>
        <span className="font-medium">{account.displayName}</span>
        <span className="text-muted-foreground block text-(length:--text-meta)">
          {account.email}
          {isSelf && " · you"}
        </span>
      </TableCell>
      <TableCell>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="profileId" value={account.id} />
          {ASSIGNABLE_ROLES.map((role) => {
            const id = `${account.id}-${role}`;
            // Self-demotion is refused by the action; disabling the box says
            // so before the submit rather than after it.
            const locked = isSelf && role === "administrator";
            return (
              <label
                key={role}
                htmlFor={id}
                className="flex items-center gap-2 text-(length:--text-meta)"
              >
                <Checkbox
                  id={id}
                  name="roles"
                  value={role}
                  checked={selected.includes(role)}
                  disabled={locked}
                  onCheckedChange={(checked) => toggle(role, checked === true)}
                />
                {ROLE_LABELS[role]}
              </label>
            );
          })}
          {isSelf && selected.includes("administrator") && (
            <input type="hidden" name="roles" value="administrator" />
          )}
          <Save dirty={dirty} />
        </form>
        {result && (
          <p
            role={result.ok ? "status" : "alert"}
            className={`mt-1.5 text-(length:--text-meta) ${result.ok ? "text-muted-foreground" : "text-destructive"}`}
          >
            {result.ok ? result.message : result.error}
          </p>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {account.roles.includes("administrator") ? (
          <Badge variant="outline" className="bg-gold-muted text-gold-foreground border-transparent">
            Full access
          </Badge>
        ) : (
          <span className="text-muted-foreground text-(length:--text-meta)">
            {held.length ? held.map((role) => ROLE_LABELS[role]).join(", ") : "Customer only"}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground hidden lg:table-cell text-(length:--text-meta)">
        {lastSignIn}
      </TableCell>
    </TableRow>
  );
}
