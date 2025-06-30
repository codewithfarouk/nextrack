import { FileUpload, GlobalAnalytics } from "@/app/dashboard/globale/types";

interface FooterStatsProps {
  analytics: GlobalAnalytics;
  files: FileUpload[];
}

export default function FooterStats({ analytics, files }: FooterStatsProps) {
  return (
    <div className="bg-white border-t mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap justify-between items-center text-sm text-gray-600">
          <div className="flex space-x-6">
            <span>📊 {analytics.totalTickets} tickets analysés</span>
            <span>🏢 {analytics.totalClients} clients</span>
            <span>📁 {files.length} fichiers importés</span>
          </div>
          <div className="flex space-x-4">
            <span>🔄 Mis à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
            {analytics.activePeriod.start && analytics.activePeriod.end && (
              <span>📅 Période: {analytics.activePeriod.start.getFullYear()} - {analytics.activePeriod.end.getFullYear()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}