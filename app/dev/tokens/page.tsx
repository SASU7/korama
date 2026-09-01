/**
 * Foundation verification page. Not linked from anywhere; deleted before the
 * overhaul merges. It exists so the token layer can be proven — contrast,
 * radius roles, type scale, both densities, both themes — before any screen
 * is built on top of it.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Money } from "@/components/shared/money";
import { Identifier } from "@/components/shared/identifier";
import { OriginBadge } from "@/components/shared/origin-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PackageSearch } from "lucide-react";

const SURFACES = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["gold-muted", "gold-foreground"],
  ["sidebar", "sidebar-foreground"],
] as const;

const ROWS = [
  { batch: "NK-SB-2407", expiry: "2027-01-07", qty: 42, minor: 485000, origin: "ghana_origin_export" },
  { batch: "NK-SB-2401", expiry: "2026-08-02", qty: 8, minor: 485000, origin: "ghana_origin_export" },
  { batch: "AW-KT-18", expiry: "No expiry", qty: 9, minor: 950000, origin: "ghana_origin_export" },
  { batch: "DI-NG-081", expiry: "No expiry", qty: 6, minor: 2150000, origin: "direct_import" },
  { batch: "DI-NG-074", expiry: "No expiry", qty: 14, minor: 730000, origin: "direct_import" },
] as const;

function Swatches() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {SURFACES.map(([bg, fg]) => (
        <div
          key={bg}
          className="rounded-lg border p-3"
          style={{ background: `var(--${bg})`, color: `var(--${fg})` }}
        >
          <p className="text-[0.8125rem] font-medium">--{bg}</p>
          <p className="font-mono text-[0.6875rem] opacity-80">--{fg}</p>
          <p className="mt-2 text-[0.6875rem] opacity-70">Body text sample</p>
        </div>
      ))}
    </div>
  );
}

function RadiusRoles() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input className="w-40" placeholder="input · radius-sm" />
      <Button>Button · sm</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <div className="rounded-lg border bg-card px-4 py-3 text-[0.8125rem] shadow-(--shadow-card)">
        card · radius-lg
      </div>
      <div className="rounded-xl border bg-popover px-4 py-3 text-[0.8125rem] shadow-(--shadow-overlay)">
        sheet/dialog · radius-xl
      </div>
      <Badge>badge · full</Badge>
      <OriginBadge origin="ghana_origin_export" />
      <OriginBadge origin="direct_import" />
    </div>
  );
}

function TypeScale() {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-[1.375rem] font-semibold tracking-[-0.01em] compact:text-[1.0625rem]">
        Page title — Fraunces 600
      </p>
      <p className="text-[1.125rem] font-semibold tracking-[-0.005em] compact:text-[0.875rem]">
        Section title — Instrument Sans 600
      </p>
      <p className="text-(length:--text-body)">
        Body — Instrument Sans 400. Nokware shea repair balm, blended and
        batch-tested in Accra, pre-positioned at Lekki.
      </p>
      <p className="font-display text-[1rem] font-medium tracking-[-0.005em]">
        Product name — Fraunces 500
      </p>
      <p className="text-(length:--text-meta) text-muted-foreground">
        Meta — 8 products · Nigeria · prices in NGN
      </p>
      <p className="flex gap-4">
        <Money minor={485000} currency="NGN" className="text-[1rem]" />
        <Identifier value="NK-SB-2407" />
        <Identifier value="KOR-NG-1756402891-8a3f21bc" />
      </p>
      <p className="font-mono text-[0.75rem]">
        Glyph disambiguation: 0O 1lI 5S 8B — dotted zero, distinct forms
      </p>
    </div>
  );
}

function DataTable() {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead data-numeric>On hand</TableHead>
            <TableHead data-numeric>Unit price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).flatMap((_, page) =>
            ROWS.map((r) => (
              <TableRow key={`${page}-${r.batch}`}>
                <TableCell>
                  <Identifier value={r.batch} />
                </TableCell>
                <TableCell>
                  <Identifier value={r.expiry} />
                </TableCell>
                <TableCell>
                  <OriginBadge origin={r.origin} />
                </TableCell>
                <TableCell data-numeric>{r.qty}</TableCell>
                <TableCell data-numeric>
                  <Money minor={r.minor} currency="NGN" />
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function DensityPanel({ density }: { density: "comfortable" | "compact" }) {
  return (
    <div data-density={density} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{density}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadiusRoles />
          <TypeScale />
          <DataTable />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-8 p-(--gutter)">
      <PageHeader
        breadcrumbs={[{ label: "Dev", href: "/dev/tokens" }, { label: "Tokens" }]}
        title="Design tokens"
        meta="Foundation verification · delete before merge"
        actions={<ThemeToggle />}
      />
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.125rem] font-semibold">Surfaces</h2>
        <Swatches />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <DensityPanel density="comfortable" />
        <DensityPanel density="compact" />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-[1.125rem] font-semibold">Empty state</h2>
        <EmptyState
          icon={PackageSearch}
          title="No products match these filters"
          description="Nigeria has 8 listings. Clear the category filter or search again."
          action={<Button variant="outline">Clear filters</Button>}
        />
      </section>
    </main>
  );
}
