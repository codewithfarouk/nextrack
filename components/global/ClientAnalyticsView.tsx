
import { BarChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar } from 'recharts';
import { Target } from 'lucide-react';
import { COLORS, CHART_COLORS } from './constants';
import { GlobalAnalytics } from '@/app/dashboard/globale/types';

interface ClientAnalyticsViewProps {
  analytics: GlobalAnalytics;
}

export default function ClientAnalyticsView({ analytics }: ClientAnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 15 Clients par Volume</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.topClients} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} fontSize={10} />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, name === 'totalTickets' ? 'Total Tickets' : name]} labelFormatter={(label) => `Client: ${label}`} />
              <Legend />
              <Bar dataKey="incidents" fill={COLORS.danger} name="Incidents" />
              <Bar dataKey="changes" fill={COLORS.success} name="Changements" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients à Risque</h3>
          <div className="space-y-4">
            {analytics.riskClients.length > 0 ? (
              analytics.riskClients.map((client, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{client.name}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.riskScore > 90
                          ? 'bg-red-100 text-red-800'
                          : client.riskScore > 70
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {client.riskScore.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Total: {client.totalTickets}</div>
                    <div>Incidents: {client.incidents}</div>
                    <div>Changements: {client.changes}</div>
                    <div>Dernière activité: {client.lastActivity?.toLocaleDateString('fr-FR') || 'N/A'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun client à risque détecté</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Globale des Clients par Source</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Clarify', value: analytics.clientAnalytics.reduce((sum, c) => sum + c.clarifyTickets, 0) },
                  { name: 'Jira', value: analytics.clientAnalytics.reduce((sum, c) => sum + c.jiraTickets, 0) },
                  { name: 'ITSM Change', value: analytics.clientAnalytics.reduce((sum, c) => sum + c.itsmChangeTickets, 0) },
                  { name: 'ITSM Incident', value: analytics.clientAnalytics.reduce((sum, c) => sum + c.itsmIncidentTickets, 0) },
                ].filter((item) => item.value > 0)}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              >
                {CHART_COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Répartition Détaillée</h4>
            {[
              { name: 'Clarify', count: analytics.clientAnalytics.reduce((sum, c) => sum + c.clarifyTickets, 0), color: CHART_COLORS[0] },
              { name: 'Jira', count: analytics.clientAnalytics.reduce((sum, c) => sum + c.jiraTickets, 0), color: CHART_COLORS[1] },
              { name: 'ITSM Change', count: analytics.clientAnalytics.reduce((sum, c) => sum + c.itsmChangeTickets, 0), color: CHART_COLORS[2] },
              { name: 'ITSM Incident', count: analytics.clientAnalytics.reduce((sum, c) => sum + c.itsmIncidentTickets, 0), color: CHART_COLORS[3] },
            ]
              .filter((item) => item.count > 0)
              .map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse Détaillée des Clients</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-900">Client</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Total</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Incidents</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Changements</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Clarify</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Jira</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">ITSM-C</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">ITSM-I</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Risque</th>
                <th className="text-center py-3 px-2 font-medium text-gray-900">Dernière Activité</th>
              </tr>
            </thead>
            <tbody>
              {analytics.clientAnalytics.slice(0, 50).map((client, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2 font-medium text-gray-900 max-w-xs truncate">{client.name}</td>
                  <td className="py-3 px-2 text-center font-semibold text-blue-600">{client.totalTickets}</td>
                  <td className="py-3 px-2 text-center text-red-600">{client.incidents}</td>
                  <td className="py-3 px-2 text-center text-green-600">{client.changes}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{client.clarifyTickets}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{client.jiraTickets}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{client.itsmChangeTickets}</td>
                  <td className="py-3 px-2 text-center text-gray-600">{client.itsmIncidentTickets}</td>
                  <td className="py-3 px-2 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        client.riskScore > 90
                          ? 'bg-red-100 text-red-800'
                          : client.riskScore > 70
                          ? 'bg-orange-100 text-orange-800'
                          : client.riskScore > 40
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {client.riskScore.toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center text-xs text-gray-500">{client.lastActivity?.toLocaleDateString('fr-FR') || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {analytics.clientAnalytics.length > 50 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Affichage de 50 clients sur {analytics.clientAnalytics.length} au total
            </div>
          )}
        </div>
      </div>
    </div>
  );
}