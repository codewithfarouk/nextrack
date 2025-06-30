'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { RefreshCw } from 'lucide-react';
import { AllTickets, FileUpload } from './types';
import { processFileData } from '@/utils/processFileData';
import { calculateAnalytics } from '@/utils/calculateAnalytics';
import Header from '@/components/global/Header';
import FileUploadSection from '@/components/global/FileUploadSection';
import { exportToExcel } from '@/utils/exportToExcel';
import DashboardView from '@/components/global/DashboardView';
import ClientAnalyticsView from '@/components/global/ClientAnalyticsView';
import AnalyticsView from '@/components/global/AnalyticsView';
import FooterStats from '@/components/global/FooterStats';

export default function AdvancedTicketDashboard() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [allTickets, setAllTickets] = useState<AllTickets[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'analytics' | 'files'>('dashboard');
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    sources: [] as string[],
    clients: [] as string[],
    search: '',
  });

  // File upload handler with deduplication
  const handleFileUpload = useCallback(
    async (uploadedFiles: FileList | null, fileType: string) => {
      if (!uploadedFiles || uploadedFiles.length === 0) return;

      setLoading(true);
      const newFiles: FileUpload[] = [];

      try {
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const { data, errors } = await processFileData(file, fileType, allTickets);

          const fileUpload: FileUpload = {
            id: `${fileType}-${Date.now()}-${i}`,
            file,
            type: fileType as any,
            processed: true,
            data,
            uploadDate: new Date(),
            recordCount: data.length,
            errors,
          };

          newFiles.push(fileUpload);
        }

        setFiles((prev) => [...prev, ...newFiles]);
        const allNewTickets = newFiles.flatMap((f) => f.data || []);
        setAllTickets((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          return [...prev, ...allNewTickets.filter((t) => !existingIds.has(t.id))];
        });
      } catch (error) {
        console.error('Erreur lors du traitement des fichiers:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search handler
  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 300),
    []
  );

  // Calculate analytics
  const analytics = useMemo(() => calculateAnalytics(allTickets, filters), [allTickets, filters]);

  // Clear all files and tickets
  const handleClearAll = () => {
    setFiles([]);
    setAllTickets([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        quickFilters={[
          { label: 'Tous', action: () => setFilters((prev) => ({ ...prev, sources: [] })) },
          { label: 'Incidents', action: () => setFilters((prev) => ({ ...prev, sources: ['clarify', 'itsm-incident'] })) },
          { label: 'Changements', action: () => setFilters((prev) => ({ ...prev, sources: ['jira', 'itsm-change'] })) },
          { label: 'Réinitialiser', action: () => setFilters({ dateStart: '', dateEnd: '', sources: [], clients: [], search: '' }) },
        ]}
        exportToExcel={() => exportToExcel(analytics, allTickets)}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'files' && (
          <FileUploadSection
            files={files}
            loading={loading}
            handleFileUpload={handleFileUpload}
            handleClearAll={handleClearAll}
            setFiles={setFiles}
            setAllTickets={setAllTickets}
          />
        )}
        {activeView === 'dashboard' && (
          <DashboardView
            analytics={analytics}
            files={files}
            filters={filters}
            setFilters={setFilters}
            debouncedSetSearch={debouncedSetSearch}
          />
        )}
        {activeView === 'clients' && <ClientAnalyticsView analytics={analytics} />}
        {activeView === 'analytics' && <AnalyticsView analytics={analytics} />}
      </div>
      <FooterStats analytics={analytics} files={files} />
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <div>
              <p className="text-lg font-semibold text-gray-900">Traitement en cours...</p>
              <p className="text-sm text-gray-600">Analyse des fichiers Excel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}