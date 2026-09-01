import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * The only sanctioned page header.
 *
 * There is deliberately no `eyebrow` prop and no lede paragraph. The component
 * this replaces took `{eyebrow, title, detail}` and produced marketing
 * sentences inside app chrome — "Nigeria shop / Goods with a traceable
 * journey.", "Market horizon / Start narrow. Build the corridor." A page
 * header in a product says where you are and what you can do here.
 *
 * `meta` is for facts (counts, currency, market), not for copy.
 */
export function PageHeader({
  breadcrumbs,
  title,
  meta,
  actions,
  className,
}: {
  breadcrumbs: Crumb[];
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-(--gutter) flex flex-col gap-(--stack)", className)}>
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <BreadcrumbItem key={`${crumb.label}-${i}`}>
                  {last || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-wrap items-center justify-between gap-(--stack)">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.01em] compact:text-[1.0625rem]">
            {title}
          </h1>
          {meta && (
            <p className="text-(length:--text-meta) text-muted-foreground">{meta}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
