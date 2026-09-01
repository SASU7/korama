import type { UserRole } from "@/lib/domain";

export const ROLE_LABELS: Record<UserRole, string> = {
  consumer: "Customer",
  warehouse_operator: "Warehouse operator",
  safety_officer: "Safety officer",
  administrator: "Administrator",
};

/**
 * Roles an administrator can hand out on /admin/users. `consumer` is omitted:
 * every signed-in account holds it from the OAuth callback onwards, so it is
 * never a decision.
 */
export const ASSIGNABLE_ROLES = [
  "warehouse_operator",
  "safety_officer",
  "administrator",
] as const satisfies readonly UserRole[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  consumer: "Shop, check out, and track their own orders.",
  warehouse_operator: "Operations and Compliance: allocate, pick, pack, dispatch.",
  safety_officer: "Delivery: preflight, launch, and ground a drone sortie.",
  administrator: "Everything, including the catalogue and this page.",
};

/** Where a role switch lands you. */
export const ROLE_HOME: Record<UserRole, string> = {
  consumer: "/shop",
  warehouse_operator: "/operations",
  safety_officer: "/delivery",
  administrator: "/admin/products",
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

export const ADMIN_NAV = [
  { label: "Products", href: "/admin/products" },
  { label: "People", href: "/admin/users" },
];

export const STORE_NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Markets", href: "/markets" },
];
