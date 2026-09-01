"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteRoleAction,
  type RoleActionResult,
} from "@/app/(admin)/admin/users/actions";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/navigation";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      <UserPlus className="size-4" aria-hidden />
      {pending ? "Assigning…" : "Assign role"}
    </Button>
  );
}

export function RoleInviteForm() {
  const [result, action] = useActionState<RoleActionResult | null, FormData>(
    inviteRoleAction,
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign a role by email</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_240px_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Google account</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                placeholder="name@gmail.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select name="role" defaultValue="warehouse_operator">
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Submit />
          </div>

          <p className="text-muted-foreground text-(length:--text-meta)">
            Only <strong>@gmail.com</strong> addresses for now, because sign-in
            is Google OAuth. If the person has never signed in, the role waits
            for them and applies the first time they do.
          </p>

          {result && (
            <Alert
              variant={result.ok ? "default" : "destructive"}
              role={result.ok ? "status" : "alert"}
            >
              <AlertDescription>
                {result.ok ? result.message : result.error}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export function RoleLegend() {
  return (
    <dl className="text-muted-foreground grid gap-1 text-(length:--text-meta) sm:grid-cols-3">
      {ASSIGNABLE_ROLES.map((role) => (
        <div key={role}>
          <dt className="text-foreground font-medium">{ROLE_LABELS[role]}</dt>
          <dd>{ROLE_DESCRIPTIONS[role]}</dd>
        </div>
      ))}
    </dl>
  );
}
