import { OperationsClient } from "./operations-client";
import { requireSurfaceRole } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  // Asserted per page, not only in the group layout: a client-side navigation
  // between sibling routes re-renders the page segment without the layout.
  await requireSurfaceRole("warehouse_operator", "operations");
  return <OperationsClient />;
}
