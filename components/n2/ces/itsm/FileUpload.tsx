"use client";

import { useDropzone } from "react-dropzone";
import { read, utils } from "xlsx";
import { UploadCloud, Mail, CheckCircle, AlertCircle, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import React, { useState } from "react";
import { ContentCard } from "../../../dashboard/ContentCard";

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

const parseFrenchDate = (dateStr: string | number | undefined): Date | null => {
  try {
    if (!dateStr) return null;

    // Handle Excel serial numbers
    if (typeof dateStr === "number") {
      const excelEpoch = new Date((dateStr - 25569) * 86400 * 1000);

      // Extract components in UTC (to avoid timezone shift)
      const year = excelEpoch.getUTCFullYear();
      const month = excelEpoch.getUTCMonth();
      const day = excelEpoch.getUTCDate();
      const hours = excelEpoch.getUTCHours();
      const minutes = excelEpoch.getUTCMinutes();
      const seconds = excelEpoch.getUTCSeconds();

      // Rebuild in local time
      return new Date(year, month, day, hours, minutes, seconds);
    }

    // Handle "dd/MM/yyyy" or "dd/MM/yyyy HH:mm:ss"
    const [datePart, timePart = "00:00:00"] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

    // Construct in local time
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error("Error parsing date:", dateStr, error);
    return null;
  }
};

// Check if ticket is overdue
const isTicketOverdue = (ticket: ITSMTicket): boolean => {
  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = ["fermé", "clos", "résolu", "closed", "resolved", "clot"].includes(normalizedStatus);
  
  if (isClosedStatus) {
    return false;
  }

  const now = new Date();
  const hoursSinceCreation = Math.floor((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60));
  const hoursSinceUpdate = Math.floor((now.getTime() - ticket.lastUpdatedAt.getTime()) / (1000 * 60 * 60));
  
  return hoursSinceCreation > 24 || hoursSinceUpdate > 24;
};

// Send email notification for overdue tickets
const sendOverdueEmailNotification = async (tickets: ITSMTicket[]): Promise<boolean> => {
  try {
    const response = await fetch('/api/send-ces-itsm-overdue-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tickets: tickets.map(ticket => ({
          ...ticket,
          createdAt: ticket.createdAt.toISOString(),
          lastUpdatedAt: ticket.lastUpdatedAt.toISOString(),
        }))
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

interface FileUploadProps {
  onFileProcessed: (tickets: ITSMTicket[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [uploadStats, setUploadStats] = useState<{
    totalTickets: number;
    cesTeamTickets: number;
    overdueTickets: number;
    criticalTickets: number;
  } | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    disabled: isProcessing,
    onDrop: async (files) => {
      try {
        setIsProcessing(true);
        setEmailStatus('idle');
        setUploadStats(null);

        // Check if a file was uploaded
        if (!files || files.length === 0) {
          toast.error("No file uploaded.", {
            duration: 4000,
            closeButton: true,
            style: { borderRadius: "8px", padding: "12px" },
          });
          return;
        }

        const file = files[0];

        // Validate file extension and MIME type
        if (!file.name.endsWith(".xlsx") || !file.type.includes("spreadsheetml.sheet")) {
          toast.error("Invalid file type. Please upload an Excel (.xlsx) file.", {
            duration: 4000,
            closeButton: true,
            style: { borderRadius: "8px", padding: "12px" },
          });
          return;
        }

        // Show processing toast
        const processingToast = toast.loading("📊 Processing ITSM data...", {
          duration: Infinity,
        });

        // Read file data
        const data = await file.arrayBuffer();
        const workbook = read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);

        // Parse tickets
        const parsedTickets: ITSMTicket[] = jsonData
          .map((row: any): ITSMTicket => {
            const rawType = row["N° de ticket"]?.startsWith("CRQ") ? "CRQ" : "INC";
            const rawPriority = row["Prio."];
            const priority: "P1" | "P2" | "P3" = ["P1", "P2", "P3"].includes(rawPriority)
              ? rawPriority
              : "P3";

            return {
              id: row["N° de ticket"]?.toString() || "",
              type: rawType,
              priority,
              status: row["Etat"] || "En attente",
              createdAt: parseFrenchDate(row["Création"]) || new Date(),
              lastUpdatedAt: parseFrenchDate(row["Dernière IT le :"]) || new Date(),
              assignee: row["Intervenant"] || "Unknown",
              company: row["Société"] || "Unknown",
            };
          })
          .filter((ticket) => ticket.createdAt && ticket.lastUpdatedAt);

        // Validate assignees
        const hasValidAssignee = parsedTickets.some((ticket) =>
          CES_TEAM.includes(ticket.assignee)
        );

        if (!hasValidAssignee) {
          throw new Error(
            "No tickets assigned to CES team members. Expected assignees: " +
              CES_TEAM.join(", ")
          );
        }

        // Filter CES team tickets
        const cesTeamTickets = parsedTickets.filter(ticket => 
          CES_TEAM.includes(ticket.assignee)
        );

        // Check for overdue tickets
        const overdueTickets = cesTeamTickets.filter(isTicketOverdue);
        const criticalTickets = cesTeamTickets.filter(ticket => ticket.priority === "P1");
        
        // Calculate stats
        const stats = {
          totalTickets: parsedTickets.length,
          cesTeamTickets: cesTeamTickets.length,
          overdueTickets: overdueTickets.length,
          criticalTickets: criticalTickets.length,
        };
        setUploadStats(stats);

        // Dismiss processing toast
        toast.dismiss(processingToast);

        // Process valid tickets first
        onFileProcessed(parsedTickets);

        // Show success toast with detailed stats
        toast.success(
          `✅ ITSM data imported successfully!
          📊 ${stats.totalTickets} total tickets processed
          👥 ${stats.cesTeamTickets} CES team tickets found
          ${stats.overdueTickets > 0 ? `⚠️ ${stats.overdueTickets} overdue tickets detected` : '✅ No overdue tickets'}
          ${stats.criticalTickets > 0 ? `🚨 ${stats.criticalTickets} critical (P1) tickets` : ''}`, 
          {
            duration: 8000,
            closeButton: true,
            style: { borderRadius: "8px", padding: "12px" },
          }
        );

        // Send email notification if there are overdue tickets
        if (overdueTickets.length > 0) {
          setEmailStatus('sending');
          
          toast.info(
            `📧 Sending email notification for ${overdueTickets.length} overdue ticket${overdueTickets.length > 1 ? 's' : ''}...`,
            {
              duration: 4000,
              closeButton: true,
              style: { borderRadius: "8px", padding: "12px" },
            }
          );

          // Send email with all CES team tickets (for context)
          const emailSent = await sendOverdueEmailNotification(cesTeamTickets);
          
          if (emailSent) {
            setEmailStatus('sent');
            toast.success(
              `✅ Email notification sent successfully! 
              📧 Professional alert sent to totocarabel@gmail.com
              🚨 ${overdueTickets.length} overdue ticket${overdueTickets.length > 1 ? 's' : ''} reported
              📋 Complete CES team dashboard included`,
              {
                duration: 8000,
                closeButton: true,
                style: { borderRadius: "8px", padding: "12px" },
              }
            );
          } else {
            setEmailStatus('failed');
            toast.error(
              "❌ Failed to send email notification. Please check SMTP configuration in .env file.",
              {
                duration: 8000,
                closeButton: true,
                style: { borderRadius: "8px", padding: "12px" },
              }
            );
          }
        }

      } catch (error) {
        console.error("Error processing file:", error);
        setEmailStatus('idle');
        setUploadStats(null);
        
        const errorMessage =
          error instanceof Error && error.message.includes("No tickets assigned")
            ? error.message
            : "Error processing file. Please check the format and data.";
        
        toast.error(errorMessage, {
          duration: 6000,
          closeButton: true,
          style: { borderRadius: "8px", padding: "12px" },
        });
      } finally {
        setIsProcessing(false);
      }
    },
  });

  const getEmailStatusIcon = () => {
    switch (emailStatus) {
      case 'sending':
        return <Mail className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getEmailStatusText = () => {
    switch (emailStatus) {
      case 'sending':
        return "Sending professional email alert...";
      case 'sent':
        return "Email notification sent successfully ✅";
      case 'failed':
        return "Email notification failed - Check SMTP config ❌";
      default:
        return "";
    }
  };

  return (
    <ContentCard title="Upload ITSM Data - Smart Email Alerts">
      <div className="space-y-6">
        {/* Main Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
            ${isProcessing 
              ? 'border-blue-400 bg-blue-50 cursor-not-allowed shadow-inner' 
              : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 hover:shadow-lg'
            }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <UploadCloud 
                className={`h-16 w-16 transition-all duration-300 ${
                  isProcessing ? 'text-blue-500 animate-bounce' : 'text-gray-400 group-hover:text-blue-500'
                }`} 
              />
              {isProcessing && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
              )}
            </div>
            <div>
              <p className={`text-lg font-semibold mb-2 ${isProcessing ? 'text-blue-700' : 'text-gray-900'}`}>
                {isProcessing 
                  ? "🔄 Processing ITSM data with smart analysis..." 
                  : "📊 Drop your ITSM Excel file here or click to browse"
                }
              </p>
              <p className="text-sm text-gray-600">
                Supports Excel files (.xlsx) • Auto-detects overdue tickets • Sends professional email alerts
              </p>
            </div>
          </div>
        </div>

        {/* Upload Stats */}
        {uploadStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">{uploadStats.totalTickets}</p>
              <p className="text-xs text-blue-700">Total Tickets</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-center">
              <Mail className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">{uploadStats.cesTeamTickets}</p>
              <p className="text-xs text-green-700">CES Team</p>
            </div>
            <div className={`bg-gradient-to-r rounded-xl p-4 text-center border ${
              uploadStats.overdueTickets > 0 
                ? 'from-amber-50 to-amber-100 border-amber-200' 
                : 'from-gray-50 to-gray-100 border-gray-200'
            }`}>
              <Clock className={`h-6 w-6 mx-auto mb-2 ${
                uploadStats.overdueTickets > 0 ? 'text-amber-600' : 'text-gray-400'
              }`} />
              <p className={`text-2xl font-bold ${
                uploadStats.overdueTickets > 0 ? 'text-amber-900' : 'text-gray-600'
              }`}>
                {uploadStats.overdueTickets}
              </p>
              <p className={`text-xs ${
                uploadStats.overdueTickets > 0 ? 'text-amber-700' : 'text-gray-500'
              }`}>
                Overdue
              </p>
            </div>
            <div className={`bg-gradient-to-r rounded-xl p-4 text-center border ${
              uploadStats.criticalTickets > 0 
                ? 'from-red-50 to-red-100 border-red-200' 
                : 'from-gray-50 to-gray-100 border-gray-200'
            }`}>
              <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${
                uploadStats.criticalTickets > 0 ? 'text-red-600' : 'text-gray-400'
              }`} />
              <p className={`text-2xl font-bold ${
                uploadStats.criticalTickets > 0 ? 'text-red-900' : 'text-gray-600'
              }`}>
                {uploadStats.criticalTickets}
              </p>
              <p className={`text-xs ${
                uploadStats.criticalTickets > 0 ? 'text-red-700' : 'text-gray-500'
              }`}>
                Critical (P1)
              </p>
            </div>
          </div>
        )}

        {/* Email Status Indicator */}
        {emailStatus !== 'idle' && (
          <div className={`flex items-center justify-center space-x-3 p-4 rounded-xl border transition-all duration-300 ${
            emailStatus === 'sending' ? 'bg-blue-50 border-blue-200 shadow-sm' :
            emailStatus === 'sent' ? 'bg-green-50 border-green-200 shadow-sm' :
            'bg-red-50 border-red-200 shadow-sm'
          }`}>
            {getEmailStatusIcon()}
            <span className={`font-medium ${
              emailStatus === 'sending' ? 'text-blue-700' :
              emailStatus === 'sent' ? 'text-green-700' :
              'text-red-700'
            }`}>
              {getEmailStatusText()}
            </span>
            {emailStatus === 'sending' && (
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
          </div>
        )}

        {/* Features Info */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
          <h4 className="font-bold text-indigo-900 mb-3 flex items-center text-lg">
            <Mail className="h-5 w-5 mr-2" />
            🚀 Smart Email Alert System
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <ul className="text-indigo-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Auto-detects overdue tickets (&gt;24h)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Professional HTML email to totocarabel@gmail.com</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Detailed priority breakdown & statistics</span>
              </li>
            </ul>
            <ul className="text-indigo-800 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Modern responsive email template</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Urgency indicators & visual alerts</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>Complete CES team dashboard included</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border-2 border-blue-400 opacity-20"></div>
              </div>
              <div className="text-blue-800">
                <p className="font-bold text-lg">🔄 Processing your ITSM data...</p>
                <p className="text-sm opacity-90">Analyzing tickets, detecting overdue items, and preparing email alerts</p>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Configuration Note */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h5 className="font-semibold text-gray-700 mb-2 text-sm">📧 Email Configuration</h5>
          <p className="text-xs text-gray-600">
            Emails sent via Gmail SMTP (nextrack.contact@gmail.com) to totocarabel@gmail.com
            <br />
            Ensure your .env file contains proper SMTP configuration for automatic alerts.
          </p>
        </div>
      </div>
    </ContentCard>
  );
};