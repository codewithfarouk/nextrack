// lib/email-service.ts
import { EMAIL_CONFIG } from './email-config';
import { differenceInHours, differenceInDays } from 'date-fns';

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

interface OverdueInfo {
  isOverdue: boolean;
  level: string;
  hoursOverdue: number;
  daysOverdue: number;
}

// Copy the getOverdueInfo function from your component
export const getOverdueInfo = (ticket: ClarifyTicket): OverdueInfo => {
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

  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = ["fermé", "closed", "clot", "résolu"].includes(normalizedStatus);
  
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

  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > 24;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  const getThresholds = (severity: string) => {
    switch (severity) {
      case "1":
        return { warning: 4, critical: 12, severe: 24 };
      case "2":
        return { warning: 8, critical: 24, severe: 48 };
      case "3":
        return { warning: 24, critical: 72, severe: 168 };
      default:
        return { warning: 48, critical: 168, severe: 336 };
    }
  };

  const thresholds = getThresholds(ticket.severity);
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

  if (isStagnant && !isOverdueByTime) {
    return {
      isOverdue: true,
      level: "stagnant",
      hoursOverdue: hoursBetweenCreationAndUpdate,
      daysOverdue: Math.floor(hoursBetweenCreationAndUpdate / 24),
    };
  }

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

export const sendOverdueTicketsEmail = async (
  tickets: ClarifyTicket[],
  fileName: string,
  customRecipients?: string[]
): Promise<{ success: boolean; message: string; overdueCount: number }> => {
  try {
    // Filter overdue tickets
    const overdueTickets = tickets
      .map(ticket => ({
        ...ticket,
        overdueInfo: getOverdueInfo(ticket)
      }))
      .filter(ticket => ticket.overdueInfo.isOverdue);

    if (overdueTickets.length < EMAIL_CONFIG.SEND_THRESHOLD) {
      return {
        success: true,
        message: `No email sent - only ${overdueTickets.length} overdue tickets (threshold: ${EMAIL_CONFIG.SEND_THRESHOLD})`,
        overdueCount: overdueTickets.length
      };
    }

    const recipients = customRecipients || EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS;

    const response = await fetch('/api/send-overdue-email', {
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
      throw new Error(result.error || 'Failed to send email');
    }

    return {
      success: true,
      message: result.message,
      overdueCount: overdueTickets.length
    };

  } catch (error) {
    console.error('Error sending overdue tickets email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overdueCount: 0
    };
  }
};

// Utility to validate email addresses
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility to validate multiple emails
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