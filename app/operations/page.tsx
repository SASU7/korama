import KoramaPage from "@/components/KoramaPage";
export const dynamic = "force-dynamic";
export default function OperationsPage() {
  return <KoramaPage surface="operations" requiredRole="warehouse_operator" />;
}
