import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Breadcrumb } from "@/components/dashboard/Breadcrumb";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div className="container p-4 md:p-6">
        <Breadcrumb />
        <div className="mt-4">{children}</div>
      </div>
    </DashboardLayout>
  );
}