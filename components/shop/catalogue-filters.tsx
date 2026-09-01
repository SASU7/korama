"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { InventoryClass } from "@/lib/domain";

export const CATEGORIES = ["Beauty", "Fashion", "Pantry", "Home & craft"];

export const ORIGINS: { value: InventoryClass | "all"; label: string }[] = [
  { value: "all", label: "All provenance" },
  { value: "ghana_origin_export", label: "Ghana origin" },
  { value: "direct_import", label: "Direct import" },
];

/**
 * Filters live entirely in searchParams: shareable, correct under the back
 * button, and every empty state is reachable by URL.
 */
export function CatalogueFilters({
  facets,
}: {
  facets: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const selectedCategories = params.getAll("category");
  const origin = params.get("origin") ?? "all";
  const inStock = params.get("stock") === "in";

  function commit(next: URLSearchParams) {
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function toggleCategory(category: string, on: boolean) {
    const next = new URLSearchParams(params.toString());
    const values = next.getAll("category").filter((v) => v !== category);
    next.delete("category");
    for (const v of values) next.append("category", v);
    if (on) next.append("category", category);
    commit(next);
  }

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    commit(next);
  }

  const activeCount =
    selectedCategories.length + (origin !== "all" ? 1 : 0) + (inStock ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="catalogue-search" className="sr-only">
          Search products
        </Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="catalogue-search"
            type="search"
            className="pl-9"
            placeholder="Product, maker, provenance"
            defaultValue={params.get("q") ?? ""}
            onChange={(event) => set("q", event.target.value || null)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-(length:--text-meta) font-medium">
          Category
        </legend>
        {CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex cursor-pointer items-center gap-2 text-(length:--text-meta)"
          >
            <Checkbox
              checked={selectedCategories.includes(category)}
              onCheckedChange={(checked) =>
                toggleCategory(category, checked === true)
              }
            />
            <span className="flex-1">{category}</span>
            <span className="text-muted-foreground tabular-nums">
              {facets[category] ?? 0}
            </span>
          </label>
        ))}
      </fieldset>

      <Separator />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-(length:--text-meta) font-medium">
          Provenance
        </legend>
        <RadioGroup
          value={origin}
          onValueChange={(value) => set("origin", value === "all" ? null : value)}
        >
          {ORIGINS.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2 text-(length:--text-meta)"
            >
              <RadioGroupItem value={item.value} />
              {item.label}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <Separator />

      <label className="flex cursor-pointer items-center gap-2 text-(length:--text-meta)">
        <Checkbox
          checked={inStock}
          onCheckedChange={(checked) =>
            set("stock", checked === true ? "in" : null)
          }
        />
        In stock now
      </label>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.replace(pathname, { scroll: false })}
        >
          <X className="size-3.5" aria-hidden />
          Clear {activeCount} filter{activeCount > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
