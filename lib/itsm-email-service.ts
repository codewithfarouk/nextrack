// lib/itsm-email-service.ts
import { differenceInHours, differenceInDays } from 'date-fns';

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

interface OverdueInfo {
  isOverdue: boolean;
  level: string;
  hoursOverdue: number;
  daysOverdue: number;
}

// ITSM Email Configuration
export const ITSM_EMAIL_CONFIG = {
  // Configure your ITSM email recipients here
  OVERDUE_ALERT_RECIPIENTS: [
    'totocarabel@gmail.com',
  ],
  
  // Email settings
  SEND_THRESHOLD: 1, // Send email if >= 1 overdue tickets
  
  // ITSM-specific thresholds
  INCIDENT_THRESHOLDS: {
    P1: { warning: 2, critical: 4, severe: 8 }, // Hours
    P2: { warning: 8, critical: 24, severe: 48 },
    P3: { warning: 24, critical: 72, severe: 168 }
  },
  
  CHANGE_REQUEST_THRESHOLDS: {
    P1: { warning: 8, critical: 24, severe: 72 }, // Hours
    P2: { warning: 24, critical: 72, severe: 168 },
    P3: { warning: 72, critical: 168, severe: 336 }
  }
};

// ITSM-specific overdue detection
export const getITSMOverdueInfo = (ticket: ITSMTicket): OverdueInfo => {
  const now = new Date();

  if (
    !ticket.createdAt ||
    !ticket.lastUpdatedAt ||
    !(ticket.createdAt instanceof Date) ||
    !(ticket.lastUpdatedAt instanceof Date) ||
    isNaN(ticket.createdAt.getTime()) ||
    isNaN(ticket.lastUpdatedAt.getTime())
  ) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  // Check if status indicates ticket is resolved/closed
  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = [
    "fermé", "closed", "résolu", "resolved", "terminé", "completed",
    "clos", "annulé", "cancelled", "rejected", "rejeté", "en attente de fermeture",
    "waiting for closure", "implementation completed", "implémentation terminée"
  ].includes(normalizedStatus);
  
  if (isClosedStatus) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
  const hoursSinceUpdated = differenceInHours(now, ticket.lastUpdatedAt);
  const daysSinceCreated = differenceInDays(now, ticket.createdAt);
  const daysSinceUpdated = differenceInDays(now, ticket.lastUpdatedAt);

  // ITSM-specific stagnation detection (longer for change requests)
  const stagnationThreshold = ticket.type === 'INC' ? 48 : 72; // Hours
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > stagnationThreshold;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // Get appropriate thresholds based on ticket type and priority
  const getThresholds = (priority: string, type: string) => {
    const thresholds = type === "INC" 
      ? ITSM_EMAIL_CONFIG.INCIDENT_THRESHOLDS 
      : ITSM_EMAIL_CONFIG.CHANGE_REQUEST_THRESHOLDS;
    
    switch (priority) {
      case "P1":
        return thresholds.P1;
      case "P2":
        return thresholds.P2;
      case "P3":
        return thresholds.P3;
      default:
        return thresholds.P3; // Default to P3 if priority is unknown
    }
  };

  const thresholds = getThresholds(ticket.priority, ticket.type);
  const isOverdueByTime = maxHours >= thresholds.warning;
  const isOverdue = isOverdueByTime || isStagnant;

  if (!isOverdue) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  // Determine overdue level - prioritize stagnant tickets
  if (isStagnant && !isOverdueByTime) {
    return {
      isOverdue: true,
      level: "stagnant",
      hoursOverdue: hoursBetweenCreationAndUpdate,
      daysOverdue: Math.floor(hoursBetweenCreationAndUpdate / 24),
    };
  }

  // Severity-based levels
  if (maxHours >= thresholds.severe) {
    return {
      isOverdue: true,
      level: "severe",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.critical) {
    return {
      isOverdue: true,
      level: "critical",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.warning) {
    return {
      isOverdue: true,
      level: "warning",
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  }

  return {
    isOverdue: false,
    level: "none",
    hoursOverdue: 0,
    daysOverdue: 0,
  };
};

// Send ITSM overdue tickets email
export const sendITSMOverdueTicketsEmail = async (
  tickets: ITSMTicket[],
  fileName: string,
  customRecipients?: string[]
): Promise<{ success: boolean; message: string; overdueCount: number; p1Count: number }> => {
  try {
    // Filter overdue tickets
    const overdueTickets = tickets
      .map(ticket => ({
        ...ticket,
        overdueInfo: getITSMOverdueInfo(ticket)
      }))
      .filter(ticket => ticket.overdueInfo.isOverdue);

    if (overdueTickets.length < ITSM_EMAIL_CONFIG.SEND_THRESHOLD) {
      return {
        success: true,
        message: `No email sent - only ${overdueTickets.length} overdue ITSM tickets (threshold: ${ITSM_EMAIL_CONFIG.SEND_THRESHOLD})`,
        overdueCount: overdueTickets.length,
        p1Count: 0
      };
    }

    const recipients = customRecipients || ITSM_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS;
    const p1Count = overdueTickets.filter(t => t.priority === 'P1').length;

    const response = await fetch('/api/send-itsm-overdue-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        overdueTickets,
        recipients,
        fileName
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send ITSM email');
    }

    return {
      success: true,
      message: result.message,
      overdueCount: overdueTickets.length,
      p1Count: p1Count
    };

  } catch (error) {
    console.error('Error sending ITSM overdue tickets email:', error);
    return {
      success: false,
      message: `Failed to send ITSM email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overdueCount: 0,
      p1Count: 0
    };
  }
};

// Enhanced Excel export function for ITSM tickets
export const exportITSMToExcel = (tickets: ITSMTicket[]) => {
  const BOM = "\uFEFF";
  const reportDate = new Date();

  const headers = [
    "Ticket ID",
    "Type",
    "Priority", 
    "Status",
    "Assignee",
    "Company",
    "Created Date",
    "Last Updated",
    "Hours Overdue",
    "Days Overdue",
    "Overdue Level",
    "SLA Status"
  ];

  const rows = tickets.map((ticket) => {
    const overdue = getITSMOverdueInfo(ticket);
    const slaStatus = overdue.isOverdue ? "BREACHED" : "WITHIN SLA";

    const safeValue = (value: string | number | null | undefined): string =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    return [
      safeValue(ticket.id),
      safeValue(ticket.type),
      safeValue(ticket.priority),
      safeValue(ticket.status),
      safeValue(ticket.assignee),
      safeValue(ticket.company),
      safeValue(ticket.createdAt.toLocaleString('fr-FR')),
      safeValue(ticket.lastUpdatedAt.toLocaleString('fr-FR')),
      safeValue(overdue.hoursOverdue),
      safeValue(overdue.daysOverdue),
      safeValue(overdue.level),
      safeValue(slaStatus)
    ].join(",");
  });

  const csv = [
    `"ITSM Overdue Tickets Export - ${reportDate.toLocaleDateString('fr-FR')} ${reportDate.toLocaleTimeString('fr-FR')}"`,
    "",
    headers.map((h) => `"${h}"`).join(","),
    ...rows,
  ].join("\n");

  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `itsm_overdue_tickets_${reportDate.toISOString().split('T')[0]}_${reportDate.getHours()}${reportDate.getMinutes().toString().padStart(2, '0')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Utility functions for ITSM validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEmails = (emails: string[]): { valid: string[]; invalid: string[] } => {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach(email => {
    const trimmedEmail = email.trim();
    if (validateEmail(trimmedEmail)) {
      valid.push(trimmedEmail);
    } else {
      invalid.push(trimmedEmail);
    }
  });

  return { valid, invalid };
};

// Get SLA breach analysis for ITSM tickets
export const getSLABreachAnalysis = (tickets: ITSMTicket[]) => {
  const analysis = {
    total: tickets.length,
    overdue: 0,
    withinSLA: 0,
    byPriority: {
      P1: { total: 0, overdue: 0 },
      P2: { total: 0, overdue: 0 },
      P3: { total: 0, overdue: 0 }
    },
    byType: {
      INC: { total: 0, overdue: 0 },
      CRQ: { total: 0, overdue: 0 }
    },
    severityLevels: {
      severe: 0,
      critical: 0,
      warning: 0,
      stagnant: 0
    }
  };

  tickets.forEach(ticket => {
    const overdueInfo = getITSMOverdueInfo(ticket);
    
    if (overdueInfo.isOverdue) {
      analysis.overdue++;
      analysis.severityLevels[overdueInfo.level as keyof typeof analysis.severityLevels]++;
    } else {
      analysis.withinSLA++;
    }

    // Priority analysis
    if (ticket.priority in analysis.byPriority) {
      analysis.byPriority[ticket.priority as keyof typeof analysis.byPriority].total++;
      if (overdueInfo.isOverdue) {
        analysis.byPriority[ticket.priority as keyof typeof analysis.byPriority].overdue++;
      }
    }

    // Type analysis
    analysis.byType[ticket.type].total++;
    if (overdueInfo.isOverdue) {
      analysis.byType[ticket.type].overdue++;
    }
  });

  return analysis;
};