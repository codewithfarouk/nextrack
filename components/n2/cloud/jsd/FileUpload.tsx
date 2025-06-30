"use client";

import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { UploadCloud, X, FileText, AlertCircle, Mail, CheckCircle, Settings, Clock, TrendingUp, AlertTriangle, Bug, BookOpen } from "lucide-react";
import { toast } from "sonner";
import React, { useState, useCallback, useMemo } from "react";
import { ContentCard } from "../../../dashboard/ContentCard";
import { parseFrenchDate } from "../../../../utils/dateUtils";
import { sendJiraOverdueTicketsEmail, JIRA_EMAIL_CONFIG, getJiraTicketAnalysis } from "../../../../lib/jira-email-service"; // Adjust path as needed

interface JiraTicket {
  key: string;
  type: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  assignee: string;
  reporter: string;
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
  onFileProcessed: (tickets: JiraTicket[]) => void;
}

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
    recipients: JIRA_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS,
    customRecipients: "",
  });

  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const validateJSDFile = (jsonData: any[]) => {
    if (!jsonData || jsonData.length === 0) {
      return false;
    }

    const hasRequiredFields = jsonData.some(row => 
      row.hasOwnProperty("Clé") || 
      row.hasOwnProperty("Key") || 
      row.hasOwnProperty("Issue key")
    );

    return hasRequiredFields;
  };

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

    const parsedTickets: JiraTicket[] = [];
    let invalidTicketsCount = 0;

    // Process in chunks for large files
    const CHUNK_SIZE = 500;
    for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
      const chunk = jsonData.slice(i, i + CHUNK_SIZE);
      
      const chunkTickets = chunk.map((row: any, index: number) => {
        // Enhanced key handling with multiple fallback options
        let ticketKey = "";
        
        if (row["Clé"]) {
          ticketKey = row["Clé"].toString();
        } else if (row["Key"]) {
          ticketKey = row["Key"].toString();
        } else if (row["Issue key"]) {
          ticketKey = row["Issue key"].toString();
        } else {
          console.warn(`No ticket key found for row ${index + 1}:`, row);
          ticketKey = `UNKNOWN-${index + 1}`;
          invalidTicketsCount++;
        }

        return {
          key: ticketKey,
          type: row["Type de ticket"] || row["Issue Type"] || "Unknown",
          priority: row["Priorité"] || row["Priority"] || "Medium",
          status: row["État"] || row["Status"] || "Unknown",
          createdAt: parseFrenchDate(row["Création"] || row["Created"]),
          updatedAt: parseFrenchDate(row["Mise à jour"] || row["Updated"]),
          assignee: row["Responsable"] || row["Assignee"] || "Unassigned",
          reporter: row["Rapporteur"] || row["Reporter"] || "Unknown",
        };
      });

      // Filter out tickets with invalid keys
      const validChunkTickets = chunkTickets.filter(ticket => 
        ticket.key && ticket.key !== "" && !ticket.key.startsWith("UNKNOWN-")
      );

      parsedTickets.push(...validChunkTickets);

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

    if (parsedTickets.length === 0) {
      toast.error("No valid JIRA tickets found in the file.", {
        description: "Please check that your file contains valid JIRA data with ticket keys.",
        duration: 5000,
      });
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
      return;
    }

    // Analyze the data
    const analysis = getJiraTicketAnalysis(parsedTickets);
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

        const emailResult = await sendJiraOverdueTicketsEmail(parsedTickets, fileName, recipients);
        
        if (emailResult.success) {
          if (emailResult.overdueCount > 0) {
            toast.success(
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <div>
                  <p className="font-medium">JIRA Alert Email Sent!</p>
                  <p className="text-sm">{emailResult.message}</p>
                  {emailResult.criticalCount > 0 && (
                    <p className="text-sm text-red-600 font-medium">
                      🔥 {emailResult.criticalCount} critical priority tickets need immediate attention!
                    </p>
                  )}
                </div>
              </div>
            );
          } else {
            toast.info("No overdue JIRA tickets detected - email not sent");
          }
        } else {
          toast.error(`JIRA email sending failed: ${emailResult.message}`);
        }
      } catch (error) {
        console.error("JIRA email sending error:", error);
        toast.error("Failed to send JIRA overdue tickets email");
      } finally {
        setEmailSending(false);
      }
    }

    // Show success message with analysis
    if (invalidTicketsCount > 0) {
      toast.warning(`Imported ${parsedTickets.length} tickets. ${invalidTicketsCount} tickets were skipped due to missing keys.`);
    }

    toast.success(
      <div>
        <p className="font-medium">JIRA data imported successfully!</p>
        <p className="text-sm">
          {parsedTickets.length} tickets processed
        </p>
        {analysis.overdue > 0 && (
          <p className="text-sm text-red-600 font-medium">
            ⚠️ {analysis.overdue} tickets are overdue!
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        // Validate if this is a JSD file
        if (!validateJSDFile(jsonData)) {
          toast.error("This is not a valid JSD file. Please try another file.", {
            description: "Make sure your Excel file contains JIRA Service Desk data with the required columns.",
            duration: 5000,
          });
          setProcessingState(prev => ({ ...prev, isProcessing: false }));
          return;
        }

        await processFileData(jsonData, file.name, file.size);

      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Error processing file. Please check the format.", {
          description: "Make sure you're uploading a valid Excel file (.xlsx) with JIRA data.",
          duration: 5000,
        });
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
    <ContentCard title="Upload JIRA Data">
      <div className="space-y-4">
        {/* Email Settings Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">JIRA Email Alerts</span>
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
                    Auto-send email alerts for overdue JIRA tickets
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
                    placeholder="jira-admin@company.com, project-manager@company.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-blue-600">
                    Leave empty to use default: {JIRA_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last Analysis Results */}
        {lastAnalysis && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last Import Analysis
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
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
                <div className="font-medium text-gray-600">Critical Priority</div>
                <div className={`text-lg font-bold ${lastAnalysis.byPriority.highest.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.byPriority.highest.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Bugs Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.byType.bug.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {lastAnalysis.byType.bug.overdue}
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-600">Stories Overdue</div>
                <div className={`text-lg font-bold ${lastAnalysis.byType.story.overdue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {lastAnalysis.byType.story.overdue}
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
                <span>Processing JIRA tickets...</span>
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
                <span>Analyzing ticket priorities and sending email alerts...</span>
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
              Drop your JIRA Excel file here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports Excel files (.xlsx) containing JIRA ticket data
            </p>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">JIRA Priority Monitoring</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Automatic priority-based overdue detection for Bugs, Stories, Tasks, and Epics
              </p>
            </div>

            {emailSettings.enabled && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Auto JIRA Alerts Active</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Critical/High priority tickets and overdue items will trigger email notifications
                </p>
              </div>
            )}

            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-amber-700">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Smart Processing</span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Validates JIRA data format and filters invalid ticket keys automatically
              </p>
            </div>
          </div>
        )}
      </div>
    </ContentCard>
  );
};