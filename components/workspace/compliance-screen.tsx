"use client";

import { Check, CircleAlert, FileCheck2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Identifier } from "@/components/shared/identifier";
import { SurfaceShell } from "@/components/workspace/surface-shell";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";
import type { ComplianceSnapshot } from "@/lib/domain";

/**
 * Every field reads from state. The previous version printed "Nokware shea
 * repair balm", "NK-SB-2407" and "Tema → Lekki" as string literals, which was
 * correct for exactly one order.
 */
function CertificatePreview({ compliance }: { compliance: ComplianceSnapshot }) {
  return (
    <Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="text-muted-foreground/15 pointer-events-none absolute inset-0 grid place-items-center"
      >
        <span className="-rotate-12 text-center text-xl font-bold tracking-wider whitespace-nowrap">
          {compliance.certificateWatermark}
        </span>
      </div>
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-(length:--text-meta)">
          <FileCheck2 className="size-4" aria-hidden />
          Origin assessment preview
        </CardTitle>
        <p className="text-muted-foreground text-(length:--text-meta)">
          ECOWAS / AfCFTA · illustrative
        </p>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-3">
        <dl className="flex flex-col gap-2 text-(length:--text-meta)">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Product</dt>
            <dd className="text-right font-medium">
              {compliance.productName ?? "Not recorded"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Batch</dt>
            <dd>
              {compliance.batchReference ? (
                <Identifier value={compliance.batchReference} />
              ) : (
                "Not allocated"
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Movement</dt>
            <dd>{compliance.movement ?? "Not recorded"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Duty treatment</dt>
            <dd className="text-right">{compliance.dutyQuote}</dd>
          </div>
          {compliance.assessedAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Assessed</dt>
              <dd>
                <Identifier value={compliance.assessedAt.slice(0, 10)} />
              </dd>
            </div>
          )}
        </dl>
        <div className="text-muted-foreground flex justify-between border-t pt-3 text-(length:--text-meta)">
          <span>Preview only</span>
          <span>Not valid for customs</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceScreen() {
  const { state, error, busy, refresh } = useWorkspaceLive();
  const { compliance, order } = state;

  // A parcel can mix provenance, so show a certificate per Ghana-origin line
  // rather than pretending an order has exactly one origin story.
  const lineCertificates =
    order?.lines.filter(
      (line) => line.origin === "ghana_origin_export" && line.compliance,
    ) ?? [];
  const certificates = lineCertificates.length
    ? lineCertificates.map((line) => ({ key: String(line.lineNo), compliance: line.compliance! }))
    : [{ key: "base", compliance }];

  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Compliance" }]}
        title="Compliance"
        meta={
          [
            compliance.productName,
            compliance.batchReference && `batch ${compliance.batchReference}`,
            compliance.movement,
          ]
            .filter(Boolean)
            .join(" · ") || "Origin assessment"
        }
        actions={<Badge variant="outline">Preview — not a legal certificate</Badge>}
      />

      <div className="grid gap-(--gutter) xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-(length:--text-meta)">
              Origin assessment
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-success/15 text-success border-transparent"
            >
              Provisionally eligible
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h3 className="mb-1 text-(length:--text-meta) font-medium">
                Why this qualifies
              </h3>
              <p className="text-muted-foreground text-(length:--text-meta)">
                {compliance.transformation}
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" data-numeric>
                      #
                    </TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead className="w-16 text-right">On file</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.evidence.map((item, index) => (
                    <TableRow key={item}>
                      <TableCell data-numeric>
                        {String(index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell>{item}</TableCell>
                      <TableCell className="text-right">
                        <Check className="text-success ml-auto size-3.5" aria-hidden />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Alert>
              <CircleAlert />
              <AlertDescription>
                Repackaging or relabelling alone produces a rejected
                assessment. Origin is only claimed where a transformation
                record supports it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-(--gutter)">
          {certificates.map((certificate) => (
            <CertificatePreview
              key={certificate.key}
              compliance={certificate.compliance}
            />
          ))}
        </div>
      </div>
    </SurfaceShell>
  );
}
