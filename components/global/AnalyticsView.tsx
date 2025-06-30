import { GlobalAnalytics } from "@/app/dashboard/globale/types";

interface AnalyticsViewProps {
  analytics: GlobalAnalytics;
}

export default function AnalyticsView({ analytics }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse par Statut</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">{status}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / Math.max(analytics.totalTickets, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse par Priorité</h3>
          <div className="space-y-3">
            {Object.entries(analytics.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-gray-700 text-sm">{priority}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(count / Math.max(analytics.totalTickets, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}