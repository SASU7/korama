import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { authContext } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/navigation";
import type { UserRole } from "@/lib/domain";

export const dynamic = "force-dynamic";

const REQUIRED: Record<string, { label: string; role: UserRole }> = {
  operations: { label: "Operations", role: "warehouse_operator" },
  compliance: { label: "Compliance", role: "warehouse_operator" },
  delivery: { label: "Delivery", role: "safety_officer" },
  admin: { label: "Catalogue admin", role: "administrator" },
};

/**
 * Previously /shop?access=denied — redirected to from the role check and read
 * nowhere, so a blocked user silently landed on the shop with no explanation.
 *
 * It sits inside (shop) so it renders with the storefront header, which means
 * a user whose account *does* hold the role can switch to it right here
 * instead of being told to go elsewhere.
 */
export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ surface?: string }>;
}) {
  const { surface } = await searchParams;
  const auth = await authContext();
  const target = surface ? REQUIRED[surface] : undefined;
  const holdsRole = Boolean(target && auth?.roles.includes(target.role));
  const heldLabels = (auth?.roles ?? []).map((r) => ROLE_LABELS[r]).join(", ");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-12">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <ShieldAlert className="text-muted-foreground size-6" aria-hidden />
          <CardTitle>
            {target ? `${target.label} needs another role` : "You can't open that page"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {target ? (
            holdsRole ? (
              <>
                <p className="text-muted-foreground text-(length:--text-meta)">
                  Your account holds the {ROLE_LABELS[target.role].toLowerCase()}{" "}
                  role, but it isn&rsquo;t the role you&rsquo;re currently using.
                  Switch to it to open {target.label.toLowerCase()}.
                </p>
                <RoleSwitcher
                  roles={auth?.roles ?? []}
                  activeRole={auth?.activeRole ?? "consumer"}
                />
              </>
            ) : (
              <p className="text-muted-foreground text-(length:--text-meta)">
                {target.label} needs the{" "}
                {ROLE_LABELS[target.role].toLowerCase()} role. Your account has:{" "}
                {heldLabels || "no roles"}. Ask a Korama administrator to assign
                it.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-(length:--text-meta)">
              That page needs a role your account doesn&rsquo;t currently use.
            </p>
          )}
          <Button variant="outline" asChild>
            <Link href="/shop">Back to the shop</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
