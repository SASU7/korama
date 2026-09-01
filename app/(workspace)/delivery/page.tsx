import { DeliveryClient } from "./delivery-client";
import { requireSurfaceRole } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function DeliveryPage() {
  // Asserted per page, not only in the group layout: a client-side navigation
  // between sibling routes re-renders the page segment without the layout.
  await requireSurfaceRole("safety_officer", "delivery");
  return <DeliveryClient />;
}
