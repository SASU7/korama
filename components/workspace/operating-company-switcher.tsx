"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMPANIES = [
  { id: "10000000-0000-0000-0000-000000000001", label: "Ghana operations", status: "Checkout active" },
  { id: "10000000-0000-0000-0000-000000000002", label: "Nigeria operations", status: "Catalogue only" },
] as const;

export function OperatingCompanySwitcher({ activeOperatingCompanyId }: { activeOperatingCompanyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const active = COMPANIES.find((company) => company.id === activeOperatingCompanyId) ?? COMPANIES[0];

  function switchTo(operatingCompanyId: string) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/auth/operating-company", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ operatingCompanyId }),
      });
      if (!response.ok) return setError("That operating company could not be selected.");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between" disabled={pending} aria-busy={pending}>
          <span className="flex min-w-0 items-center gap-2"><Building2 className="size-4 shrink-0" aria-hidden /><span className="truncate">{active.label}</span></span>
          <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground font-normal">Administrator operating-company view</DropdownMenuLabel>
        {COMPANIES.map((company) => (
          <DropdownMenuItem key={company.id} onSelect={() => switchTo(company.id)}>
            <span className="flex-1"><span className="block">{company.label}</span><span className="text-muted-foreground text-xs">{company.status}</span></span>
            {company.id === active.id && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
        {error && <p role="alert" className="text-destructive px-2 py-1.5 text-xs">{error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
