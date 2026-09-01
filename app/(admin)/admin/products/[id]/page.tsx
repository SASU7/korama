import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { readAdminProduct, listAdminProducts } from "@/lib/supabase/catalogue-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit product — Korama admin" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const draft = await readAdminProduct(id);
  if (!draft) notFound();

  const rows = await listAdminProducts();
  const row = rows.find((candidate) => candidate.id === id);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: draft.name },
        ]}
        title={draft.name}
        meta={draft.reference}
        actions={
          <DeleteProductButton
            id={id}
            name={draft.name}
            batchCount={row?.batchCount ?? 0}
          />
        }
      />
      <ProductForm draft={draft} currentImagePath={row?.imagePath} />
    </>
  );
}
