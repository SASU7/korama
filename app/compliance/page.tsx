import KoramaPage from "@/components/KoramaPage";
export const dynamic = "force-dynamic";
export default function CompliancePage() {
  return <KoramaPage surface="compliance" requiredRole="warehouse_operator" />;
}
