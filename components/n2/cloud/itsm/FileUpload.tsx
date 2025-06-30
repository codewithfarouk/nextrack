"use client";

import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { UploadCloud, X, FileText, AlertCircle, Mail, CheckCircle, Settings, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import React, { useState, useCallback, useMemo } from "react";
import { ContentCard } from "../../../dashboard/ContentCard";
import { sendITSMOverdueTicketsEmail, ITSM_EMAIL_CONFIG, getSLABreachAnalysis } from "../../../../lib/itsm-email-service"; // Adjust path as needed

const CES_TEAM = [
  "Youssef RAYOUDE",
  "Nada BELMAATI", 
  "Mohammed AZFAR AZAMI",
  "Chafik ZARHOUR",
];

interface ITSMTicket {
  id: string;
  type: "CRQ" | "INC";
  priority: "P1" | "P2" | "P3";
  status: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  assignee: string;
  company: string;
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
  onFileProcessed: (tickets: ITSMTicket[]) => void;
}

// Updated date parsing function to handle French date format and timezone issues
const parseFrenchDate = (dateString?: string | number): Date => {
  if (!dateString) return new Date();

  try {
    if (typeof dateString === "number") {
      // Excel serial number (e.g., 45123.524)
      const utcDays = Math.floor(dateString - 25569);
      const utcMs = utcDays * 86400 * 1000;
      const date = new Date(utcMs);

      const fractionalDay = dateString - Math.floor(dateString);
      const totalSeconds = Math.round(fractionalDay * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours,
        minutes,
        seconds
      );
    }

    // Trim and split
    dateString = dateString.trim();
    const [datePart, timePart = "00:00:00"] = dateString.split(/\s+/);
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart
      .split(":")
      .map(Number);

    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return new Date(); // fallback
  }
};

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed }) => {
  const [ignoredTicketsCount, setIgnoredTicketsCount] = useState(0);
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
    recipients: ITSM_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS,
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

    let ignoredCount = 0;
    const parsedTickets: ITSMTicket[] = [];

    // Process in chunks for large files
    const CHUNK_SIZE = 500;
    for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
      const chunk = jsonData.slice(i, i + CHUNK_SIZE);
      
      const chunkTickets = chunk
        .filter((row: any) => {
          const ticketNumber = row["N° de ticket"]?.toString() || "";
          const intervenant = row["Intervenant"];
          
          const isValidTicket = ticketNumber.startsWith("CRQ") || ticketNumber.startsWith("INC");
          const isNotCESTeam = !CES_TEAM.includes(intervenant);
          
          if (!isValidTicket || !isNotCESTeam) {
            ignoredCount++;
          }
          
          return isValidTicket && isNotCESTeam;
        })
        .map((row: any): ITSMTicket => ({
          id: row["N° de ticket"]?.toString() || "",
          type: row["N° de ticket"]?.startsWith("CRQ") ? "CRQ" : "INC",
          priority: row["Prio."] || "P3",
          status: row["Etat"] || "En attente",
          createdAt: parseFrenchDate(row["Création"]),
          lastUpdatedAt: parseFrenchDate(row["Dernière IT le :"]),
          assignee: row["Intervenant"] || "Unknown",
          company: row["Société"] || "Unknown",
        }));

      parsedTickets.push(...chunkTickets);

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

    setIgnoredTicketsCount(ignoredCount);
    
    // Analyze the data
    const analysis = getSLABreachAnalysis(parsedTickets);
    setLastAnalysis(analysis);

    // Process the tickets
    onFileProcessed(parsedTickets);

    // Auto-send email if enabled and overdue tickets detected
    if (emailSettings.enabled && analysis.overdue > 0) {
      setEmailSending(true);
      try {
        const recipients = emailSettings.customRecipients
          ? emailSettings.customRecipients.split(',').map(email => email.trim()).filter(email => email)
          : emailSettings.recipients;

        const emailResult = await sendITSMOverdueTicketsEmail(parsedTickets, fileName, recipients);
        
        if (emailResult.success) {
          if (emailResult.overdueCount > 0) {
            toast.success(
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <div>
                  <p className="font-medium">ITSM Alert Email Sent!</p>
                  <p className="text-sm">{emailResult.message}</p>
                  {emailResult.p1Count > 0 && (
                    <p className="text-sm text-red-600 font-medium">
                      🔥 {emailResult.p1Count} P1 incidents require immediate attention!
                    </p>
                  )}
                </div>
              </div>
            );
          } else {
            toast.info("No overdue ITSM tickets detected - email not sent");
          }
        } else {
          toast.error(`ITSM email sending failed: ${emailResult.message}`);
        }
      } catch (error) {
        console.error("ITSM email sending error:", error);
        toast.error("Failed to send ITSM overdue tickets email");
      } finally {
        setEmailSending(false);
      }
    }

    // Show success message with analysis
    toast.success(
      <div>
        <p className="font-medium">ITSM data imported successfully!</p>
        <p className="text-sm">
          {parsedTickets.length} tickets processed, {ignoredCount} ignored
        </p>
        {analysis.overdue > 0 && (
          <p className="text-sm text-red-600 font-medium">
            ⚠️ {analysis.overdue} tickets are overdue SLA!
          </p>
        )}
      </div>
    );

    setProcessingState(prev => ({ ...prev, isProcessing: false }));
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
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          toast.error("The uploaded file contains no sheets.");
          return;
        }
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);
        
        if (!jsonData || jsonData.length === 0) {
          toast.error("No data found in the Excel file.");
          return;
        }

        await processFileData(jsonData, file.name, file.size);
        
      } catch (error) {
        console.error("Comprehensive error processing file:", error);
        
        if (error instanceof Error) {
          toast.error(`Error processing file: ${error.message}`);
        } else {
          toast.error("Error processing file. Please check the format and try again.");
        }
        
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
    <ContentCard title="Upload ITSM Data">
      <div className="space-y-4">
        {/* Email Settings Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">ITSM Email Alerts</span>
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
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>

          {showEmailSettings && (
            <div className="space-y-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={emailSettings.enabled}
                    onChange={(e) => handleEmailSettingsChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-800">
                    Auto-send email alerts for overdue ITSM tickets
                  </span>
                </label>
              </div>

              {emailSettings.enabled && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-blue-800">
                    Custom Recipients (comma-separated emails)
                  </label>
                  <input
                    type="text"
                    value={emailSettings.customRecipients}
                    onChange={(e) => handleEmailSettingsChange('customRecipients', e.target.value)}
                    placeholder="itsm-manager@company.com, service-desk@company.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-blue-600">
                    Leave empty to use default: {ITSM_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last Analysis Results */}
        {lastAnalysis && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last Import Analysis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Total Tickets</div>
                <div className="text-lg font-bold text-blue-600">{lastAnalysis.total}</div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">P1 Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.byPriority.P1.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.byPriority.P1.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Incidents Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.byType.INC.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.byType.INC.overdue}
                </div>
              </div>
            </div>
          </div>
        )}

        {processingState.isProcessing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
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
                <span>Processing ITSM tickets...</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {processingState.processedRows.toLocaleString()} of {processingState.totalRows.toLocaleString()} rows processed
              </p>
            </div>

            {emailSending && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <Mail className="h-4 w-4 animate-pulse" />
                <span>Analyzing SLA breaches and sending email alerts...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 font-medium">
              Drop your ITSM Excel file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports Excel files (.xlsx) containing ITSM ticket data
            </p>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">ITSM SLA Monitoring</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Automatic SLA breach detection for P1/P2/P3 incidents and change requests
              </p>
            </div>

            {emailSettings.enabled && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Auto ITSM Alerts Active</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  P1 incidents, SLA breaches, and overdue tickets will trigger email notifications
                </p>
              </div>
            )}

            {ignoredTicketsCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-amber-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium">Previous Import Info</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  {ignoredTicketsCount} tickets were filtered out (CES team or invalid format)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentCard>
  );
};