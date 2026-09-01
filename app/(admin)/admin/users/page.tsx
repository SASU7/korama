import type { Metadata } from "next";
import { Clock3, UserCog, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleInviteForm, RoleLegend } from "@/components/admin/role-invite-form";
import { UserRoleRow } from "@/components/admin/user-role-row";
import { cancelInviteAction } from "./actions";
import { requireAdministrator } from "@/lib/auth-guards-admin";
import { ROLE_LABELS } from "@/lib/navigation";
import { listPendingInvites, listUserAccounts } from "@/lib/supabase/role-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "People — Korama admin" };

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminUsersPage() {
  // The layout guards this too. Repeated here because a client-side
  // navigation between /admin/products and /admin/users re-renders the page
  // segment without re-running the layout.
  const auth = await requireAdministrator("/admin/users");
  const [accounts, invites] = await Promise.all([
    listUserAccounts(),
    listPendingInvites(),
  ]);
  const administrators = accounts.filter((account) =>
    account.roles.includes("administrator"),
  ).length;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "People" }]}
        title="People"
        meta={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${administrators} administrator${administrators === 1 ? "" : "s"}${invites.length ? ` · ${invites.length} waiting to sign in` : ""}`}
      />

      <div className="flex flex-col gap-6">
        <RoleInviteForm />

        {invites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4" aria-hidden />
                Waiting for a first sign-in
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium">{invite.email}</span>
                  <Badge variant="outline">{ROLE_LABELS[invite.role]}</Badge>
                  <span className="text-muted-foreground text-(length:--text-meta)">
                    invited {DATE.format(new Date(invite.createdAt))}
                  </span>
                  <form action={cancelInviteAction} className="ml-auto">
                    <input type="hidden" name="id" value={invite.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <X className="size-3.5" aria-hidden />
                      Withdraw
                    </Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {accounts.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="No accounts yet"
            description="Accounts appear here after their first Google sign-in. Assign a role by email above and it applies the moment they arrive."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="hidden md:table-cell">Access</TableHead>
                  <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <UserRoleRow
                    key={account.id}
                    account={account}
                    isSelf={account.id === auth.user.id}
                    lastSignIn={
                      account.lastSignInAt
                        ? DATE.format(new Date(account.lastSignInAt))
                        : "Never"
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <RoleLegend />
      </div>
    </>
  );
}
