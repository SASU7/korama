import { ComplianceClient } from "./compliance-client";
import { requireSurfaceRole } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  // Asserted per page, not only in the group layout: a client-side navigation
  // between sibling routes re-renders the page segment without the layout.
  await requireSurfaceRole("warehouse_operator", "compliance");
  return <ComplianceClient />;
}
