"use client";

import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { UploadCloud, X, FileText, AlertCircle, Mail, CheckCircle, Settings, Clock, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";
import React, { useState, useCallback, useMemo } from "react";
import { ContentCard } from "../../../dashboard/ContentCard";
import { sendCESOverdueTicketsEmail, CES_EMAIL_CONFIG, getCESTicketAnalysis, getCESWorkloadDistribution } from "../../../../lib/ces-email-service"; // Adjust path as needed

interface ClarifyTicket {
  id: string;
  status: string;
  severity: string;
  priority: string;
  createdAt: Date;
  incidentStartDate: Date;
  closedAt: Date | null;
  lastUpdatedAt: Date;
  owner: string;
  region: string;
  company: string;
  city: string;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  totalRows: number;
  processedRows: number;
  fileName: string;
  fileSize: number;
}

interface EmailSettings {
  enabled: boolean;
  recipients: string[];
  customRecipients: string;
}

interface FileUploadProps {
  onFileProcessed: (tickets: ClarifyTicket[]) => void;
}

// Date parsing function
const parseFrenchDate = (dateStr: string | number | undefined): Date | null => {
  try {
    if (!dateStr) return null;

    if (typeof dateStr === "number") {
      const utcMs = (dateStr - 25569) * 86400 * 1000;
      const utcDate = new Date(utcMs);
      return new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(),
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds()
      );
    }

    const [datePart, timePart = "00:00:00"] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return null;
  }
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed }) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    totalRows: 0,
    processedRows: 0,
    fileName: "",
    fileSize: 0,
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    enabled: true,
    recipients: CES_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS,
    customRecipients: "",
  });

  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processFileData = useCallback(async (jsonData: any[], fileName: string, fileSize: number) => {
    setProcessingState({
      isProcessing: true,
      progress: 0,
      totalRows: jsonData.length,
      processedRows: 0,
      fileName,
      fileSize,
    });

    try {
      // Process in chunks for large files
      const CHUNK_SIZE = 500;
      const allParsedTickets: ClarifyTicket[] = [];

      for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
        const chunk = jsonData.slice(i, i + CHUNK_SIZE);
        
        const chunkTickets = chunk
          .filter((row: any) => CES_EMAIL_CONFIG.CES_TEAM_IDS.includes(row["Propriétaire"]))
          .map((row: any) => ({
            id: row["ID cas"]?.toString() || "",
            status: row["Statut"] || "Unknown",
            severity: row["Sévérité"]?.toString() || "Unknown",
            priority: row["Priorité"] || "Unknown",
            createdAt: parseFrenchDate(row["Date de création"]) || new Date(),
            incidentStartDate: parseFrenchDate(row["Date de Début d'Incident"]) || new Date(),
            closedAt: parseFrenchDate(row["Date de clôture du cas"]),
            lastUpdatedAt: parseFrenchDate(row["Date de dernière mise à jour du cas"]) || new Date(),
            owner: CES_EMAIL_CONFIG.OWNER_NAME_MAPPING[(row["Propriétaire"] || "").toLowerCase() as keyof typeof CES_EMAIL_CONFIG.OWNER_NAME_MAPPING] || row["Propriétaire"] || "Unknown",
            region: row["Région du site"] || "Unknown",
            company: row["Raison sociale société"] || "Unknown",
            city: row["Ville du site"] || "Unknown",
          }))
          .filter((ticket) => ticket.createdAt && ticket.lastUpdatedAt);

        allParsedTickets.push(...chunkTickets);

        const processedRows = Math.min(i + CHUNK_SIZE, jsonData.length);
        const progress = Math.round((processedRows / jsonData.length) * 100);

        setProcessingState(prev => ({
          ...prev,
          progress,
          processedRows,
        }));

        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (allParsedTickets.length === 0) {
        toast.warning("No valid CES team tickets found in the Excel file.");
        setProcessingState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      // Analyze the CES data
      const analysis = getCESTicketAnalysis(allParsedTickets);
      const workloadDistribution = getCESWorkloadDistribution(allParsedTickets);
      setLastAnalysis({ ...analysis, workloadDistribution });

      // Process the tickets
      onFileProcessed(allParsedTickets);

      // Auto-send email if enabled and overdue tickets detected
      if (emailSettings.enabled && analysis.overdue > 0) {
        setEmailSending(true);
        try {
          const recipients = emailSettings.customRecipients
            ? emailSettings.customRecipients.split(',').map(email => email.trim()).filter(email => email)
            : emailSettings.recipients;

          const emailResult = await sendCESOverdueTicketsEmail(allParsedTickets, fileName, recipients);
          
          if (emailResult.success) {
            if (emailResult.overdueCount > 0) {
              toast.success(
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <div>
                    <p className="font-medium">CES Team Alert Email Sent!</p>
                    <p className="text-sm">{emailResult.message}</p>
                    {emailResult.s1Count > 0 && (
                      <p className="text-sm text-red-600 font-medium">
                        🚨 {emailResult.s1Count} S1 tickets require immediate CES attention!
                      </p>
                    )}
                  </div>
                </div>
              );
            } else {
              toast.info("No overdue CES tickets detected - email not sent");
            }
          } else {
            toast.error(`CES email sending failed: ${emailResult.message}`);
          }
        } catch (error) {
          console.error("CES email sending error:", error);
          toast.error("Failed to send CES overdue tickets email");
        } finally {
          setEmailSending(false);
        }
      }

      // Show success message with analysis
      toast.success(
        <div>
          <p className="font-medium">CES Clarify data imported successfully!</p>
          <p className="text-sm">
            {allParsedTickets.length} CES tickets processed
          </p>
          {analysis.overdue > 0 && (
            <p className="text-sm text-red-600 font-medium">
              ⚠️ {analysis.overdue} CES tickets are overdue SLA!
            </p>
          )}
        </div>
      );

    } catch (error) {
      console.error("Error processing CES file:", error);
      toast.error("Error processing file. Please check the format.");
    } finally {
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [emailSettings, onFileProcessed]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    onDrop: async (files) => {
      try {
        const file = files[0];
        
        if (!file) {
          toast.error("No file selected. Please upload an Excel file.");
          return;
        }

        setProcessingState(prev => ({
          ...prev,
          isProcessing: true,
          fileName: file.name,
          fileSize: file.size,
        }));

        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          toast.error("No data found in the Excel file.");
          setProcessingState(prev => ({ ...prev, isProcessing: false }));
          return;
        }

        await processFileData(jsonData, file.name, file.size);

      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Error processing file. Please check the format.");
        setProcessingState(prev => ({ ...prev, isProcessing: false }));
      }
    },
  });

  const handleEmailSettingsChange = (field: keyof EmailSettings, value: any) => {
    setEmailSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const cancelProcessing = useCallback(() => {
    setProcessingState(prev => ({ ...prev, isProcessing: false }));
    toast.info("File processing cancelled");
  }, []);

  const progressPercentage = useMemo(() => 
    processingState.totalRows > 0 
      ? Math.round((processingState.processedRows / processingState.totalRows) * 100)
      : 0
  , [processingState.processedRows, processingState.totalRows]);

  return (
    <ContentCard title="Upload CES Clarify Data">
      <div className="space-y-4">
        {/* Email Settings Panel */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">CES Team Email Alerts</span>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                emailSettings.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {emailSettings.enabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <button
              onClick={() => setShowEmailSettings(!showEmailSettings)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>

          {showEmailSettings && (
            <div className="space-y-3 pt-3 border-t border-green-200">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => handleEmailSettingsChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-green-800">
                    Auto-send email alerts for overdue CES tickets
                  </span>
                </label>
              </div>

              {emailSettings.enabled && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-green-800">
                    Custom Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={emailSettings.customRecipients}
                    onChange={(e) => handleEmailSettingsChange('customRecipients', e.target.value)}
                    placeholder="ces-manager@company.com, support-director@company.com"
                    className="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-green-600">
                    Leave empty to use default: {CES_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CES Team Analysis Results */}
        {lastAnalysis && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              CES Team Performance Analysis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Total CES Tickets</div>
                <div className="text-lg font-bold text-green-600">{lastAnalysis.total}</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">S1 Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.bySeverity.s1.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.bySeverity.s1.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">SLA Compliance</div>
                <div className={`text-lg font-bold ${lastAnalysis.teamPerformance.slaCompliance < 90 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.teamPerformance.slaCompliance}%
                </div>
              </div>
            </div>

            {/* CES Team Member Breakdown */}
            <div className="bg-white p-3 rounded border">
              <h5 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Users className="h-4 w-4" />
                CES Team Workload
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(lastAnalysis.byOwner).map(([owner, stats]: [string, any]) => (
                  <div key={owner} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{owner}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      stats.overdue > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {stats.overdue}/{stats.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {processingState.isProcessing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">{processingState.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(processingState.fileSize)}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelProcessing}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing CES tickets...</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {processingState.processedRows.toLocaleString()} of {processingState.totalRows.toLocaleString()} rows processed
              </p>
            </div>

            {emailSending && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <Mail className="h-4 w-4 animate-pulse" />
                <span>Analyzing CES SLA compliance and sending email alerts...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer ${
              processingState.isProcessing ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 font-medium">
              {processingState.isProcessing ? "Processing file..." : "Drop your CES Clarify Excel file here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports Excel files (.xlsx) containing Clarify ticket data for CES team
            </p>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-green-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">CES Team SLA Monitoring</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Aggressive SLA monitoring for Customer Expert Support team (S1: 2h, S2: 4h, S3: 8h warnings)
              </p>
            </div>

            {emailSettings.enabled && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Auto CES Alerts Active</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  S1/S2 critical tickets and SLA breaches will trigger immediate email notifications
                </p>
              </div>
            )}

            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">CES Team Filter</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Automatically filters for: Nada, Mohamed, Youssef, and Chafik&apos;s tickets
              </p>
            </div>
          </div>
        )}
      </div>
    </ContentCard>
  );
};