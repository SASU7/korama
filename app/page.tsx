import { headers } from "next/headers";
import AccessGate from "@/components/AccessGate";
import PrototypeWorkspace from "@/components/PrototypeWorkspace";
import { authenticatedRole, hasValidSession } from "@/lib/demo-auth";
import type { UserRole } from "@/lib/domain";

export default async function HomePage() {
  const incomingHeaders = await headers();
  const request = new Request("http://localhost", { headers: { cookie: incomingHeaders.get("cookie") ?? "" } });
  if (!hasValidSession(request)) return <AccessGate />;
  const role = await authenticatedRole(request);
  return <PrototypeWorkspace initialRole={(role ?? "consumer") as UserRole} />;
}
