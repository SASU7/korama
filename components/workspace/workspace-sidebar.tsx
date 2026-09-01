"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck2,
  LogOut,
  Map,
  PackagePlus,
  Plane,
  ShoppingBag,
  UserCog,
  Warehouse,
} from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { Button } from "@/components/ui/button";
import { WORKSPACE_NAV, type WorkspaceSurface } from "@/lib/navigation";
import type { UserRole } from "@/lib/domain";

const ICONS: Record<WorkspaceSurface, typeof Warehouse> = {
  operations: Warehouse,
  compliance: FileCheck2,
  delivery: Plane,
};

export function WorkspaceSidebar({
  roles,
  activeRole,
}: {
  roles: UserRole[];
  activeRole: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Only surfaces the account actually holds a role for.
  const visible = WORKSPACE_NAV.filter((item) => roles.includes(item.role));
  const groups = ["Fulfilment", "Delivery"] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between gap-2 px-1 py-1 group-data-[collapsible=icon]:px-0">
          <Wordmark href="/operations" />
          <Badge
            variant="outline"
            className="group-data-[collapsible=icon]:hidden"
          >
            Lekki
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => {
          const items = visible.filter((i) => i.group === group);
          if (!items.length) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = ICONS[item.key];
                    const active = pathname === item.href;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        <SidebarGroup>
          <SidebarGroupLabel>Reference</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Markets">
                  <Link href="/markets">
                    <Map aria-hidden />
                    <span>Markets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {roles.includes("administrator") && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Catalogue admin">
                      <Link href="/admin/products">
                        <PackagePlus aria-hidden />
                        <span>Catalogue</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="People and roles">
                      <Link href="/admin/users">
                        <UserCog aria-hidden />
                        <span>People</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Shop">
                  <Link href="/shop">
                    <ShoppingBag aria-hidden />
                    <span>Shop</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* No marketing callout here. Staff chrome carries controls, not copy. */}
      <SidebarFooter className="border-t">
        <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
          <RoleSwitcher
            roles={roles}
            activeRole={activeRole}
            className="flex-1 justify-between"
          />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() =>
              startTransition(async () => {
                await fetch("/api/auth/sign-out", { method: "POST" });
                router.push("/shop");
                router.refresh();
              })
            }
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
