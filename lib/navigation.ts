import type { UserRole } from "@/lib/domain";

export const ROLE_LABELS: Record<UserRole, string> = {
  consumer: "Customer",
  warehouse_operator: "Warehouse operator",
  safety_officer: "Safety officer",
};

/** Where a role switch lands you. */
export const ROLE_HOME: Record<UserRole, string> = {
  consumer: "/shop",
  warehouse_operator: "/operations",
  safety_officer: "/delivery",
};

export type WorkspaceSurface = "operations" | "compliance" | "delivery";

export const WORKSPACE_NAV: {
  key: WorkspaceSurface;
  label: string;
  href: string;
  group: "Fulfilment" | "Delivery";
  role: UserRole;
}[] = [
  { key: "operations", label: "Operations", href: "/operations", group: "Fulfilment", role: "warehouse_operator" },
  { key: "compliance", label: "Compliance", href: "/compliance", group: "Fulfilment", role: "warehouse_operator" },
  { key: "delivery", label: "Delivery", href: "/delivery", group: "Delivery", role: "safety_officer" },
];

export const STORE_NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Markets", href: "/markets" },
];
