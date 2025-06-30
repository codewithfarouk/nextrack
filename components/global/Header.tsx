import { Download, BarChart3, Users, TrendingUp, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: 'dashboard' | 'clients' | 'analytics' | 'files') => void;
  quickFilters: { label: string; action: () => void }[];
  exportToExcel: () => void;
}

export default function Header({ activeView, setActiveView, quickFilters, exportToExcel }: HeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Centre de Contrôle Tickets</h1>
            <p className="text-gray-600 mt-1">Analyse globale multi-sources en temps réel</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex space-x-2">
              {quickFilters.map((filter, index) => (
                <button
                  key={index}
                  onClick={filter.action}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              aria-label="Exporter les données"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>
        <div className="flex space-x-8 border-t">
          {[
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
            { id: 'clients', label: 'Analyse Clients', icon: Users },
            { id: 'analytics', label: 'Analytics Avancées', icon: TrendingUp },
            { id: 'files', label: 'Gestion Fichiers', icon: FileSpreadsheet },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                activeView === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              aria-current={activeView === id ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}