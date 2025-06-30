import { useState } from 'react';
import { Search, Activity, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
} from 'recharts';
import { CHART_COLORS, COLORS } from './constants';
import { FileUpload, GlobalAnalytics } from '@/app/dashboard/globale/types';

interface DashboardViewProps {
  analytics: GlobalAnalytics;
  files: FileUpload[];
  filters: any;
  setFilters: (filters: any) => void;
  debouncedSetSearch: (value: string) => void;
}

export default function DashboardView({ analytics, files, filters, setFilters, debouncedSetSearch }: DashboardViewProps) {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isClientsOpen, setIsClientsOpen] = useState(false);

  const sourceOptions = [
    { value: 'clarify', label: 'Clarify' },
    { value: 'jira', label: 'Jira' },
    { value: 'itsm-change', label: 'ITSM Change' },
    { value: 'itsm-incident', label: 'ITSM Incident' },
  ];

  const toggleSource = (value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      sources: prev.sources.includes(value)
        ? prev.sources.filter((item: string) => item !== value)
        : [...prev.sources, value],
    }));
  };

  const toggleClient = (value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      clients: prev.clients.includes(value)
        ? prev.clients.filter((item: string) => item !== value)
        : [...prev.clients, value],
    }));
  };

  return (
    <div className="space-y-8 p-4 bg-gray-50 min-h-screen">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Tickets',
            value: analytics.totalTickets.toLocaleString(),
            subtitle: 'Tous systèmes confondus',
            icon: <Activity className="w-12 h-12 text-blue-200" />,
            gradient: 'from-blue-600 to-blue-700',
          },
          {
            title: 'Total Incidents',
            value: analytics.totalIncidents.toLocaleString(),
            subtitle: 'Clarify + ITSM Incident',
            icon: <AlertCircle className="w-12 h-12 text-red-200" />,
            gradient: 'from-red-600 to-red-700',
          },
          {
            title: 'Total Changements',
            value: analytics.totalChanges.toLocaleString(),
            subtitle: 'Jira + ITSM Change',
            icon: <RefreshCw className="w-12 h-12 text-green-200" />,
            gradient: 'from-green-600 to-green-700',
          },
          {
            title: 'Total Clients',
            value: analytics.totalClients.toLocaleString(),
            subtitle: 'Organisations uniques',
            icon: <Building2 className="w-12 h-12 text-purple-200" />,
            gradient: 'from-purple-600 to-purple-700',
          },
        ].map((metric, index) => (
          <div
            key={index}
            className={`bg-gradient-to-r ${metric.gradient} rounded-2xl p-6 text-white transform hover:scale-105 transition-transform duration-200 shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{metric.title}</p>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-white/60 text-xs mt-1">{metric.subtitle}</p>
              </div>
              {metric.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Filtres Avancés</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
            <input
              type="date"
              value={filters.dateStart}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, dateStart: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150"
              aria-label="Date de début"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
            <input
              type="date"
              value={filters.dateEnd}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, dateEnd: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150"
              aria-label="Date de fin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sources</label>
            <div className="relative">
              <button
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-left bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center text-sm text-gray-700"
              >
                <span>{filters.sources.length > 0 ? `${filters.sources.length} sélectionné(s)` : 'Sélectionner sources'}</span>
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${isSourcesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isSourcesOpen && (
                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
                  {sourceOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    >
                      <input
                        type="checkbox"
                        checked={filters.sources.includes(option.value)}
                        onChange={() => toggleSource(option.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Clients</label>
            <div className="relative">
              <button
                onClick={() => setIsClientsOpen(!isClientsOpen)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-left bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center text-sm text-gray-700"
              >
                <span>{filters.clients.length > 0 ? `${filters.clients.length} sélectionné(s)` : 'Sélectionner clients'}</span>
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 ${isClientsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isClientsOpen && (
                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
                  {analytics.clientAnalytics.slice(0, 50).map((client) => (
                    <label
                      key={client.name}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    >
                      <input
                        type="checkbox"
                        checked={filters.clients.includes(client.name)}
                        onChange={() => toggleClient(client.name)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-700">{client.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                onChange={(e) => debouncedSetSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-150"
                aria-label="Rechercher par ID ou client"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Évolution Mensuelle</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={analytics.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="incidents"
                stackId="1"
                stroke={COLORS.danger}
                fill={COLORS.danger}
                fillOpacity={0.7}
                name="Incidents"
              />
              <Area
                type="monotone"
                dataKey="changes"
                stackId="1"
                stroke={COLORS.success}
                fill={COLORS.success}
                fillOpacity={0.7}
                name="Changements"
              />
              <Line type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={3} name="Total" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Répartition par Source</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={Object.entries(analytics.bySource)
                  .map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
                    value,
                    fullName: name,
                  }))
                  .filter((item) => item.value > 0)}
                cx="50%"
                cy="50%"
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {Object.entries(analytics.bySource).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Métriques de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Taux d\'Incidents',
              value: analytics.performanceMetrics.incidentRate.toFixed(1),
              color: 'red-600',
              width: Math.min(100, analytics.performanceMetrics.incidentRate),
            },
            {
              title: 'Taux de Changements',
              value: analytics.performanceMetrics.changeRate.toFixed(1),
              color: 'green-600',
              width: Math.min(100, analytics.performanceMetrics.changeRate),
            },
            {
              title: 'Tickets par Client',
              value: analytics.performanceMetrics.avgTicketsPerClient.toFixed(1),
              color: 'blue-600',
              width: Math.min(100, (analytics.performanceMetrics.avgTicketsPerClient / 50) * 100),
            },
          ].map((metric, index) => (
            <div key={index} className="text-center">
              <div className={`text-3xl font-bold text-${metric.color}`}>{metric.value}%</div>
              <div className="text-gray-600 text-sm mt-1">{metric.title}</div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div
                  className={`bg-${metric.color} h-2.5 rounded-full transition-all duration-300`}
                  style={{ width: `${metric.width}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Source Analysis */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Analyse Détaillée par Source</h3>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={analytics.byMonth} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Bar dataKey="clarify" fill={CHART_COLORS[0]} name="Clarify" />
            <Bar dataKey="jira" fill={CHART_COLORS[1]} name="Jira" />
            <Bar dataKey="itsmChange" fill={CHART_COLORS[2]} name="ITSM Change" />
            <Bar dataKey="itsmIncident" fill={CHART_COLORS[3]} name="ITSM Incident" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Quality Metrics */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Qualité des Données</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {((analytics.totalTickets > 0 ? analytics.totalTickets - analytics.clientAnalytics.reduce((sum, c) => sum + c.incidents, 0) : 0) / Math.max(analytics.totalTickets, 1) * 100).toFixed(1)}%
            </div>
            <div className="text-gray-600 text-sm">Dates valides</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {((analytics.totalTickets > 0 ? analytics.totalTickets - analytics.clientAnalytics.reduce((sum, c) => sum + (c.name === 'Client Inconnu' || c.name === 'Client Non Défini' ? c.totalTickets : 0), 0) : 0) / Math.max(analytics.totalTickets, 1) * 100).toFixed(1)}%
            </div>
            <div className="text-gray-600 text-sm">Clients identifiés</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{files.reduce((sum, file) => sum + file.errors.length, 0)}</div>
            <div className="text-gray-600 text-sm">Erreurs détectées</div>
          </div>
        </div>
      </div>

      {/* Detailed Error Report */}
      {files.some((f) => f.errors.length > 0) && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Rapport d&apos;Erreurs</h3>
          <div className="space-y-6">
            {files
              .filter((f) => f.errors.length > 0)
              .map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3">{file.file.name}</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {file.errors.slice(0, 10).map((error, index) => (
                      <p key={index} className="text-sm text-red-600">
                        {error}
                      </p>
                    ))}
                    {file.errors.length > 10 && (
                      <p className="text-sm text-gray-500">... et {file.errors.length - 10} autres erreurs</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* System Health Dashboard */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Santé du Système</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              title: 'Fichiers Clarify',
              value: files.filter((f) => f.type === 'clarify').length,
              tickets: analytics.bySource.clarify,
              color: 'blue-600',
            },
            {
              title: 'Fichiers Jira',
              value: files.filter((f) => f.type === 'jira').length,
              tickets: analytics.bySource.jira,
              color: 'green-600',
            },
            {
              title: 'Fichiers ITSM Change',
              value: files.filter((f) => f.type === 'itsm-change').length,
              tickets: analytics.bySource['itsm-change'],
              color: 'orange-600',
            },
            {
              title: 'Fichiers ITSM Incident',
              value: files.filter((f) => f.type === 'itsm-incident').length,
              tickets: analytics.bySource['itsm-incident'],
              color: 'red-600',
            },
          ].map((metric, index) => (
            <div key={index} className="text-center">
              <div className={`text-2xl font-bold text-${metric.color}`}>{metric.value}</div>
              <div className="text-gray-600 text-sm">{metric.title}</div>
              <div className="text-xs text-gray-400 mt-1">{metric.tickets} tickets</div>
            </div>
          ))}
        </div>
      </div>

      {/* Period Analysis */}
      {analytics.activePeriod.start && analytics.activePeriod.end && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Période d&apos;Analyse</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{analytics.activePeriod.start.toLocaleDateString('fr-FR')}</div>
              <div className="text-gray-600 text-sm">Date de début</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{analytics.activePeriod.end.toLocaleDateString('fr-FR')}</div>
              <div className="text-gray-600 text-sm">Date de fin</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {Math.ceil((analytics.activePeriod.end.getTime() - analytics.activePeriod.start.getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-gray-600 text-sm">Jours de données</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}