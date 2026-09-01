import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New product — Korama admin" };

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New" },
        ]}
        title="New product"
        meta="Creates the product, its market listing and its variant in one save."
      />
      <ProductForm />
    </>
  );
}
