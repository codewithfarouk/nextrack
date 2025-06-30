// Updated FileUpload component with email integration
"use client";

import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { UploadCloud, X, FileText, AlertCircle, Mail, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { format, isValid, parse, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ContentCard } from "../../../dashboard/ContentCard";
import React, { useState, useCallback, useMemo } from "react";
import { EMAIL_CONFIG } from "@/lib/email-config";
import { sendOverdueTicketsEmail } from "@/lib/email-service";
 // Adjust path as needed

const CES_TEAM_IDS = ["ee0023059", "ee0023068", "ee0023070", "ee0095270"];

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CHUNK_SIZE = 1000; // Process in chunks of 1000 rows

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

// Keep all your existing date parsing logic
const dateFormats = [
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "M/d/yyyy HH:mm:ss",
  "M/d/yyyy HH:mm",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm",
  "d/M/yyyy HH:mm:ss",
  "d/M/yyyy HH:mm",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "dd-MM-yyyy HH:mm:ss",
  "dd-MM-yyyy HH:mm",
  "MM-dd-yyyy HH:mm:ss",
  "MM-dd-yyyy HH:mm",
  "yyyy/MM/dd HH:mm:ss",
  "yyyy/MM/dd HH:mm",
];

const fixTwoDigitYear = (dateStr: string): string => {
  return dateStr.replace(/(\d{1,2}\/\d{1,2}\/)(\d{2})(\s|$)/g, (match, prefix, year, suffix) => {
    const yearNum = parseInt(year);
    const fullYear = yearNum <= 29 ? 2000 + yearNum : 1900 + yearNum;
    return prefix + fullYear + suffix;
  }).replace(/(\d{1,2}-\d{1,2}-)(\d{2})(\s|$)/g, (match, prefix, year, suffix) => {
    const yearNum = parseInt(year);
    const fullYear = yearNum <= 29 ? 2000 + yearNum : 1900 + yearNum;
    return prefix + fullYear + suffix;
  });
};

const parseFrenchDate = (dateStr: string | number): Date => {
  try {
    if (typeof dateStr === "number") {
      const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
      console.log("Parsed from Excel number:", dateStr, "=>", excelDate);
      return excelDate;
    }
    
    if (typeof dateStr === "string") {
      let cleanDateStr = dateStr.trim();
      cleanDateStr = fixTwoDigitYear(cleanDateStr);
      
      for (const formatStr of dateFormats) {
        try {
          const parsed = parse(cleanDateStr, formatStr, new Date(), { locale: fr });
          if (isValid(parsed)) {
            console.log(`Parsed from string [${formatStr}]:`, cleanDateStr, "=>", parsed);
            return parsed;
          }
        } catch (parseError) {
          continue;
        }
      }
      
      try {
        const fallback = parseISO(cleanDateStr);
        if (isValid(fallback)) {
          console.log("Parsed with ISO fallback:", cleanDateStr, "=>", fallback);
          return fallback;
        }
      } catch (isoError) {
        // Continue
      }
      
      try {
        const nativeDate = new Date(cleanDateStr);
        if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) {
          console.log("Parsed with native Date constructor:", cleanDateStr, "=>", nativeDate);
          return nativeDate;
        }
      } catch (nativeError) {
        // Continue
      }
      
      console.warn("Unrecognized date string:", cleanDateStr);
    }
    
    return new Date("");
  } catch (error) {
    console.error("Date parsing failed:", dateStr, error);
    return new Date("");
  }
};

const parseTicketRow = (row: any): ClarifyTicket => {
  const ticket: ClarifyTicket = {
    id: row["ID cas"]?.toString() || "",
    status: row["Statut"] || "Unknown",
    severity: row["Sévérité"]?.toString() || "Unknown",
    priority: row["Priorité"] || "Unknown",
    createdAt: parseFrenchDate(row["Date de création"]),
    incidentStartDate: parseFrenchDate(row["Date de Début d'Incident"]),
    closedAt: row["Date de clôture du cas"]
      ? parseFrenchDate(row["Date de clôture du cas"])
      : null,
    lastUpdatedAt: parseFrenchDate(row["Date de dernière mise à jour du cas"]),
    owner: row["Propriétaire"] || "Unknown",
    region: row["Région du site"] || "Unknown",
    company: row["Raison sociale société"] || "Unknown",
    city: row["Ville du site"] || "Unknown",
  };

  console.log("Parsed ticket:", ticket);
  return ticket;
};

interface FileUploadProps {
  onFileProcessed: (tickets: ClarifyTicket[]) => void;
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
    recipients: EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS,
    customRecipients: "",
  });

  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processFileInChunks = useCallback(async (
    jsonData: Record<string, any>[],
    fileName: string,
    fileSize: number
  ) => {
    const filteredData = jsonData.filter(
      (row: any) => !CES_TEAM_IDS.includes(row["Propriétaire"])
    );

    const totalRows = filteredData.length;
    const parsedTickets: ClarifyTicket[] = [];

    setProcessingState({
      isProcessing: true,
      progress: 0,
      totalRows,
      processedRows: 0,
      fileName,
      fileSize,
    });

    try {
      for (let i = 0; i < filteredData.length; i += CHUNK_SIZE) {
        const chunk = filteredData.slice(i, i + CHUNK_SIZE);
        const chunkTickets = chunk.map(parseTicketRow);
        parsedTickets.push(...chunkTickets);

        const processedRows = Math.min(i + CHUNK_SIZE, totalRows);
        const progress = Math.round((processedRows / totalRows) * 100);

        setProcessingState(prev => ({
          ...prev,
          progress,
          processedRows,
        }));

        await new Promise(resolve => setTimeout(resolve, 10));
      }

      onFileProcessed(parsedTickets);
      toast.success(`Successfully processed ${parsedTickets.length} tickets from ${fileName}`);

      // Auto-send email if enabled and overdue tickets detected
      if (emailSettings.enabled) {
        setEmailSending(true);
        try {
          const recipients = emailSettings.customRecipients
            ? emailSettings.customRecipients.split(',').map(email => email.trim()).filter(email => email)
            : emailSettings.recipients;

          const emailResult = await sendOverdueTicketsEmail(parsedTickets, fileName, recipients);
          
          if (emailResult.success) {
            if (emailResult.overdueCount > 0) {
              toast.success(
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Email Alert Sent!</p>
                    <p className="text-sm">{emailResult.message}</p>
                  </div>
                </div>
              );
            } else {
              toast.info("No overdue tickets detected - email not sent");
            }
          } else {
            toast.error(`Email sending failed: ${emailResult.message}`);
          }
        } catch (error) {
          console.error("Email sending error:", error);
          toast.error("Failed to send overdue tickets email");
        } finally {
          setEmailSending(false);
        }
      }

    } catch (error) {
      console.error("Error processing chunks:", error);
      toast.error("Error processing file chunks. Please try again.");
    } finally {
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [onFileProcessed, emailSettings]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`;
    }
    
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return "Only Excel files (.xlsx) are supported";
    }

    return null;
  }, []);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: true,
        progress: 0,
        fileName: file.name,
        fileSize: file.size,
      }));

      const data = await file.arrayBuffer();
      const workbook = read(data, {
        cellStyles: false,
        cellHTML: false,
        cellFormula: false,
        sheetStubs: false,
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<Record<string, any>>(worksheet, {
        raw: false,
        defval: "",
        blankrows: false,
      });

      if (jsonData.length === 0) {
        toast.error("The uploaded file appears to be empty.");
        return;
      }

      if (!("ID cas" in jsonData[0])) {
        toast.error("This is not a valid Clarify file. Missing 'ID cas' column.");
        return;
      }

      if (jsonData.length > 10000) {
        toast.info(`Processing large file with ${jsonData.length.toLocaleString()} rows. This may take a moment...`);
      }

      await processFileInChunks(jsonData, file.name, file.size);

    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Error processing file. Please check the format and try again.");
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [validateFile, processFileInChunks]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await processFile(acceptedFiles[0]);
      }
    },
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        toast.error(`File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      } else if (error?.code === 'file-invalid-type') {
        toast.error("Invalid file type. Please upload an Excel file (.xlsx)");
      } else {
        toast.error("File upload failed. Please try again.");
      }
    },
  });

  const cancelProcessing = useCallback(() => {
    setProcessingState(prev => ({ ...prev, isProcessing: false }));
    toast.info("File processing cancelled");
  }, []);

  const progressPercentage = useMemo(() => 
    processingState.totalRows > 0 
      ? Math.round((processingState.processedRows / processingState.totalRows) * 100)
      : 0
  , [processingState.processedRows, processingState.totalRows]);

  const handleEmailSettingsChange = (field: keyof EmailSettings, value: any) => {
    setEmailSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <ContentCard title="Upload Excel File">
      <div className="space-y-4">
        {/* Email Settings Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Email Alerts</span>
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
                    Auto-send email alerts for overdue tickets
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
                    placeholder="admin@company.com, manager@company.com"
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-blue-600">
                    Leave empty to use default recipients: {EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
                <span>Processing tickets...</span>
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
                <span>Checking for overdue tickets and sending email alerts...</span>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="mt-2 font-medium">
              {isDragActive
                ? "Drop the Excel file here..."
                : "Drop your Clarify Excel file here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports Excel files (.xlsx) up to {formatFileSize(MAX_FILE_SIZE)}
            </p>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Large File Support</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Files with 10,000+ rows will be processed in chunks with progress tracking
              </p>
            </div>

            {emailSettings.enabled && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Auto Email Alerts Active</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Overdue tickets will automatically trigger email notifications
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentCard>
  );
};