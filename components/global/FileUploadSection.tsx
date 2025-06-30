import { AllTickets, FileUpload } from "@/app/dashboard/globale/types";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface FileUploadSectionProps {
  files: FileUpload[];
  loading: boolean;
  handleFileUpload: (files: FileList | null, type: string) => void;
  handleClearAll: () => void;
  setFiles: React.Dispatch<React.SetStateAction<FileUpload[]>>;
  setAllTickets: React.Dispatch<React.SetStateAction<AllTickets[]>>;
}

export default function FileUploadSection({
  files,
  loading,
  handleFileUpload,
  handleClearAll,
  setFiles,
  setAllTickets,
}: FileUploadSectionProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Import de Fichiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              type: "clarify",
              label: "Clarify",
              icon: AlertCircle,
              color: "bg-blue-500",
              description: "Incidents et cas",
            },
            {
              type: "jira",
              label: "Jira (JSD)",
              icon: CheckCircle,
              color: "bg-green-500",
              description: "Demandes de service",
            },
            {
              type: "itsm-change",
              label: "ITSM Change",
              icon: RefreshCw,
              color: "bg-orange-500",
              description: "Gestion des changements",
            },
            {
              type: "itsm-incident",
              label: "ITSM Incident",
              icon: AlertCircle,
              color: "bg-red-500",
              description: "Incidents ITSM",
            },
          ].map(({ type, label, icon: Icon, color, description }) => (
            <div key={type} className="relative group">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={(e) => handleFileUpload(e.target.files, type)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={loading}
                aria-label={`Importer fichier ${label}`}
              />
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 group-hover:scale-105">
                <div
                  className={`w-12 h-12 mx-auto mb-4 rounded-full ${color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{label}</h3>
                <p className="text-sm text-gray-500 mb-3">{description}</p>
                <div className="text-xs text-gray-400">
                  {files.filter((f) => f.type === type).length} fichier(s)
                  importé(s)
                </div>
                {loading && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Fichiers Importés
            </h3>
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-2 text-red-600 hover:text-red-800 transition-colors"
              aria-label="Supprimer tous les fichiers"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer tous</span>
            </button>
          </div>
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {file.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {file.type} •{" "}
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                        {file.recordCount} enregistrements •{" "}
                        {file.uploadDate.toLocaleDateString("fr-FR")}
                      </p>
                      {file.errors.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          {file.errors.length} erreur(s) détectée(s)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.processed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                    <button
                      onClick={() => {
                        setFiles((prev) =>
                          prev.filter((f) => f.id !== file.id)
                        );
                        if (file.data) {
                          setAllTickets((prev) =>
                            prev.filter(
                              (ticket) => !file.data?.includes(ticket)
                            )
                          );
                        }
                      }}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Supprimer le fichier ${file.file.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
