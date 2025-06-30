// lib/jira-email-service.ts
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface OverdueInfo {
  isOverdue: boolean;
  level: string;
  hoursOverdue: number;
  daysOverdue: number;
}

interface JiraAnalysis {
  total: number;
  overdue: number;
  onTime: number;
  byPriority: {
    highest: { total: number; overdue: number };
    critical: { total: number; overdue: number };
    high: { total: number; overdue: number };
    medium: { total: number; overdue: number };
    low: { total: number; overdue: number };
  };
  byType: {
    bug: { total: number; overdue: number };
    story: { total: number; overdue: number };
    task: { total: number; overdue: number };
    epic: { total: number; overdue: number };
    subtask: { total: number; overdue: number };
    other: { total: number; overdue: number };
  };
  severityLevels: {
    severe: number;
    critical: number;
    warning: number;
    stagnant: number;
  };
  assigneeWorkload: Map<string, { total: number; overdue: number }>;
  topOverdueAssignees: Array<{ assignee: string; count: number }>;
  criticalPriorityOverdue: number;
  highPriorityTypeOverdue: number;
}

// JIRA Email Configuration
export const JIRA_EMAIL_CONFIG = {
  // Configure your JIRA email recipients here
  OVERDUE_ALERT_RECIPIENTS: [
    'farouqmanar3@gmail.com',
  ],
  
  // Email settings
  SEND_THRESHOLD: 1, // Send email if >= 1 overdue tickets
  
  // JIRA Priority-based thresholds for high-priority ticket types (Bug, Story, Epic, Incident)
  HIGH_PRIORITY_TYPE_THRESHOLDS: {
    HIGHEST: { warning: 4, critical: 12, severe: 24 }, // Hours
    CRITICAL: { warning: 4, critical: 12, severe: 24 },
    HIGH: { warning: 12, critical: 24, severe: 72 },
    MEDIUM: { warning: 24, critical: 72, severe: 168 },
    LOW: { warning: 72, critical: 168, severe: 336 }
  },
  
  // JIRA Priority-based thresholds for regular ticket types (Task, Sub-task, etc.)
  REGULAR_TYPE_THRESHOLDS: {
    HIGHEST: { warning: 8, critical: 24, severe: 48 },
    CRITICAL: { warning: 8, critical: 24, severe: 48 },
    HIGH: { warning: 24, critical: 48, severe: 120 },
    MEDIUM: { warning: 48, critical: 120, severe: 240 },
    LOW: { warning: 120, critical: 240, severe: 480 }
  },
  
  // High priority ticket types that need faster response
  HIGH_PRIORITY_TYPES: ['bug', 'incident', 'story', 'epic'],
  
  // Stagnation threshold for JIRA tickets
  STAGNATION_THRESHOLD: 72, // Hours
  
  // Status mappings for closed/resolved tickets
  CLOSED_STATUSES: [
    'fermé', 'closed', 'résolu', 'resolved', 'terminé', 'done', 'completed',
    'clos', 'annulé', 'cancelled', 'rejected', 'rejeté', 'delivered', 'déployé',
    'testing', 'test', 'review', 'code review', 'peer review', 'deployed',
    'live', 'production', 'released', 'shipped', 'verified', 'accepted'
  ],
  
  // Priority mappings for different languages
  PRIORITY_MAPPINGS: {
    'highest': ['highest', 'très haute', 'très élevée', 'blocker', 'bloquant'],
    'critical': ['critical', 'critique', 'urgent'],
    'high': ['high', 'haute', 'élevée', 'major', 'majeur'],
    'medium': ['medium', 'moyenne', 'normal', 'normale', 'minor', 'mineur'],
    'low': ['low', 'basse', 'faible', 'trivial', 'triviale']
  }
};

// Normalize priority for consistent processing
const normalizePriority = (priority: string): string => {
  const normalizedInput = priority.toLowerCase().trim();
  
  for (const [standardPriority, variations] of Object.entries(JIRA_EMAIL_CONFIG.PRIORITY_MAPPINGS)) {
    if (variations.includes(normalizedInput)) {
      return standardPriority;
    }
  }
  
  // Default to medium if not found
  return 'medium';
};

// Normalize ticket type for consistent processing
const normalizeTicketType = (type: string): string => {
  const lowerType = type.toLowerCase().trim();
  
  if (lowerType.includes('bug') || lowerType.includes('défaut') || lowerType.includes('bogue')) {
    return 'bug';
  } else if (lowerType.includes('story') || lowerType.includes('histoire') || lowerType.includes('user story')) {
    return 'story';
  } else if (lowerType.includes('epic') || lowerType.includes('épique')) {
    return 'epic';
  } else if (lowerType.includes('task') || lowerType.includes('tâche')) {
    return 'task';
  } else if (lowerType.includes('sub-task') || lowerType.includes('sous-tâche') || lowerType.includes('subtask')) {
    return 'subtask';
  } else if (lowerType.includes('incident')) {
    return 'bug'; // Treat incidents as bugs for SLA purposes
  }
  
  return 'other';
};

// Check if ticket status indicates closure
const isTicketClosed = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase().trim();
  return JIRA_EMAIL_CONFIG.CLOSED_STATUSES.includes(normalizedStatus);
};

// JIRA-specific overdue detection
export const getJiraOverdueInfo = (ticket: JiraTicket): OverdueInfo => {
  const now = new Date();

  if (
    !ticket.createdAt ||
    !ticket.updatedAt ||
    !(ticket.createdAt instanceof Date) ||
    !(ticket.updatedAt instanceof Date) ||
    isNaN(ticket.createdAt.getTime()) ||
    isNaN(ticket.updatedAt.getTime())
  ) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  // Check if status indicates ticket is resolved/closed
  if (isTicketClosed(ticket.status)) {
    return {
      isOverdue: false,
      level: "none",
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
  const hoursSinceUpdated = differenceInHours(now, ticket.updatedAt);
  const daysSinceCreated = differenceInDays(now, ticket.createdAt);
  const daysSinceUpdated = differenceInDays(now, ticket.updatedAt);

  // JIRA-specific stagnation detection
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.updatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > JIRA_EMAIL_CONFIG.STAGNATION_THRESHOLD;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // Get appropriate thresholds based on ticket type and priority
  const getThresholds = (priority: string, type: string) => {
    // Check if this is a high-priority ticket type
    const normalizedType = normalizeTicketType(type);
    const isHighPriorityType = JIRA_EMAIL_CONFIG.HIGH_PRIORITY_TYPES.includes(normalizedType);
    
    const normalizedPriority = normalizePriority(priority);
    const thresholdSet = isHighPriorityType 
      ? JIRA_EMAIL_CONFIG.HIGH_PRIORITY_TYPE_THRESHOLDS 
      : JIRA_EMAIL_CONFIG.REGULAR_TYPE_THRESHOLDS;
    
    // Map priority to threshold keys
    switch (normalizedPriority) {
      case 'highest':
        return thresholdSet.HIGHEST;
      case 'critical':
        return thresholdSet.CRITICAL;
      case 'high':
        return thresholdSet.HIGH;
      case 'medium':
        return thresholdSet.MEDIUM;
      case 'low':
        return thresholdSet.LOW;
      default:
        return thresholdSet.MEDIUM;
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

// Get comprehensive analysis for JIRA tickets
export const getJiraTicketAnalysis = (tickets: JiraTicket[]): JiraAnalysis => {
  const analysis: JiraAnalysis = {
    total: tickets.length,
    overdue: 0,
    onTime: 0,
    byPriority: {
      highest: { total: 0, overdue: 0 },
      critical: { total: 0, overdue: 0 },
      high: { total: 0, overdue: 0 },
      medium: { total: 0, overdue: 0 },
      low: { total: 0, overdue: 0 }
    },
    byType: {
      bug: { total: 0, overdue: 0 },
      story: { total: 0, overdue: 0 },
      task: { total: 0, overdue: 0 },
      epic: { total: 0, overdue: 0 },
      subtask: { total: 0, overdue: 0 },
      other: { total: 0, overdue: 0 }
    },
    severityLevels: {
      severe: 0,
      critical: 0,
      warning: 0,
      stagnant: 0
    },
    assigneeWorkload: new Map<string, { total: number; overdue: number }>(),
    topOverdueAssignees: [],
    criticalPriorityOverdue: 0,
    highPriorityTypeOverdue: 0
  };

  tickets.forEach(ticket => {
    const overdueInfo = getJiraOverdueInfo(ticket);
    
    if (overdueInfo.isOverdue) {
      analysis.overdue++;
      analysis.severityLevels[overdueInfo.level as keyof typeof analysis.severityLevels]++;
    } else {
      analysis.onTime++;
    }

    // Priority analysis
    const normalizedPriority = normalizePriority(ticket.priority);
    const priorityKey = normalizedPriority as keyof typeof analysis.byPriority;
    
    if (analysis.byPriority[priorityKey]) {
      analysis.byPriority[priorityKey].total++;
      if (overdueInfo.isOverdue) {
        analysis.byPriority[priorityKey].overdue++;
      }
    }

    // Critical priority tracking
    if (['highest', 'critical'].includes(normalizedPriority) && overdueInfo.isOverdue) {
      analysis.criticalPriorityOverdue++;
    }

    // Type analysis
    const normalizedType = normalizeTicketType(ticket.type);
    const typeKey = normalizedType as keyof typeof analysis.byType;
    
    if (analysis.byType[typeKey]) {
      analysis.byType[typeKey].total++;
      if (overdueInfo.isOverdue) {
        analysis.byType[typeKey].overdue++;
      }
    }

    // High priority type tracking
    if (JIRA_EMAIL_CONFIG.HIGH_PRIORITY_TYPES.includes(normalizedType) && overdueInfo.isOverdue) {
      analysis.highPriorityTypeOverdue++;
    }

    // Assignee workload analysis
    const assignee = ticket.assignee || 'Unassigned';
    const currentWorkload = analysis.assigneeWorkload.get(assignee) || { total: 0, overdue: 0 };
    currentWorkload.total++;
    if (overdueInfo.isOverdue) {
      currentWorkload.overdue++;
    }
    analysis.assigneeWorkload.set(assignee, currentWorkload);
  });

  // Generate top overdue assignees
  analysis.topOverdueAssignees = Array.from(analysis.assigneeWorkload.entries())
    .filter(([_, workload]) => workload.overdue > 0)
    .sort((a, b) => b[1].overdue - a[1].overdue)
    .slice(0, 5)
    .map(([assignee, workload]) => ({ assignee, count: workload.overdue }));

  return analysis;
};

// Send JIRA overdue tickets email
export const sendJiraOverdueTicketsEmail = async (
  tickets: JiraTicket[],
  fileName: string,
  customRecipients?: string[]
): Promise<{ success: boolean; message: string; overdueCount: number; criticalCount: number }> => {
  try {
    // Filter overdue tickets
    const overdueTickets = tickets
      .map(ticket => ({
        ...ticket,
        overdueInfo: getJiraOverdueInfo(ticket)
      }))
      .filter(ticket => ticket.overdueInfo.isOverdue);

    if (overdueTickets.length < JIRA_EMAIL_CONFIG.SEND_THRESHOLD) {
      return {
        success: true,
        message: `No email sent - only ${overdueTickets.length} overdue JIRA tickets (threshold: ${JIRA_EMAIL_CONFIG.SEND_THRESHOLD})`,
        overdueCount: overdueTickets.length,
        criticalCount: 0
      };
    }

    const recipients = customRecipients || JIRA_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS;
    const criticalCount = overdueTickets.filter(t => 
      ['highest', 'critical'].includes(normalizePriority(t.priority))
    ).length;

    const response = await fetch('/api/send-jira-overdue-email', {
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
      throw new Error(result.error || 'Failed to send JIRA email');
    }

    return {
      success: true,
      message: result.message,
      overdueCount: overdueTickets.length,
      criticalCount: criticalCount
    };

  } catch (error) {
    console.error('Error sending JIRA overdue tickets email:', error);
    return {
      success: false,
      message: `Failed to send JIRA email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overdueCount: 0,
      criticalCount: 0
    };
  }
};

// Enhanced Excel export function for JIRA tickets
export const exportJiraToExcel = (tickets: JiraTicket[]): void => {
  const BOM = "\uFEFF";
  const reportDate = new Date();

  const headers = [
    "Ticket Key",
    "Type",
    "Normalized Type",
    "Priority", 
    "Normalized Priority",
    "Status",
    "Assignee",
    "Reporter",
    "Created Date",
    "Last Updated",
    "Hours Since Created",
    "Hours Since Updated",
    "Hours Overdue",
    "Days Overdue",
    "Overdue Level",
    "SLA Status",
    "Is High Priority Type",
    "Is Critical Priority"
  ];

  const rows = tickets.map((ticket) => {
    const overdue = getJiraOverdueInfo(ticket);
    const slaStatus = overdue.isOverdue ? "OVERDUE" : "ON_TIME";
    const normalizedType = normalizeTicketType(ticket.type);
    const normalizedPriority = normalizePriority(ticket.priority);
    const isHighPriorityType = JIRA_EMAIL_CONFIG.HIGH_PRIORITY_TYPES.includes(normalizedType);
    const isCriticalPriority = ['highest', 'critical'].includes(normalizedPriority);
    
    const now = new Date();
    const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
    const hoursSinceUpdated = differenceInHours(now, ticket.updatedAt);

    const safeValue = (value: string | number | boolean | null | undefined): string =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    return [
      safeValue(ticket.key),
      safeValue(ticket.type),
      safeValue(normalizedType),
      safeValue(ticket.priority),
      safeValue(normalizedPriority),
      safeValue(ticket.status),
      safeValue(ticket.assignee),
      safeValue(ticket.reporter),
      safeValue(format(ticket.createdAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(format(ticket.updatedAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(hoursSinceCreated),
      safeValue(hoursSinceUpdated),
      safeValue(overdue.hoursOverdue),
      safeValue(overdue.daysOverdue),
      safeValue(overdue.level),
      safeValue(slaStatus),
      safeValue(isHighPriorityType),
      safeValue(isCriticalPriority)
    ].join(",");
  });

  const csv = [
    `"JIRA Overdue Tickets Export - ${format(reportDate, 'PPP \'at\' p', { locale: fr })}"`,
    "",
    `"Generated: ${format(reportDate, 'dd/MM/yyyy HH:mm:ss')}"`,
    `"Total Tickets: ${tickets.length}"`,
    `"Overdue Tickets: ${tickets.filter(t => getJiraOverdueInfo(t).isOverdue).length}"`,
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
    `jira_overdue_tickets_${format(reportDate, 'yyyy-MM-dd_HHmm')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Utility functions for JIRA validation
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

// Get tickets by assignee for workload distribution
export const getTicketsByAssignee = (tickets: JiraTicket[]): Map<string, JiraTicket[]> => {
  const assigneeMap = new Map<string, JiraTicket[]>();
  
  tickets.forEach(ticket => {
    const assignee = ticket.assignee || 'Unassigned';
    const currentTickets = assigneeMap.get(assignee) || [];
    currentTickets.push(ticket);
    assigneeMap.set(assignee, currentTickets);
  });

  return assigneeMap;
};

// Get overdue tickets by severity level
export const getOverdueTicketsBySeverity = (tickets: JiraTicket[]): {
  severe: JiraTicket[];
  critical: JiraTicket[];
  warning: JiraTicket[];
  stagnant: JiraTicket[];
} => {
  const result = {
    severe: [] as JiraTicket[],
    critical: [] as JiraTicket[],
    warning: [] as JiraTicket[],
    stagnant: [] as JiraTicket[]
  };

  tickets.forEach(ticket => {
    const overdueInfo = getJiraOverdueInfo(ticket);
    if (overdueInfo.isOverdue) {
      const level = overdueInfo.level as keyof typeof result;
      if (result[level]) {
        result[level].push(ticket);
      }
    }
  });

  return result;
};

// Priority helper functions
export const isPriorityHigh = (priority: string): boolean => {
  const normalizedPriority = normalizePriority(priority);
  return ['highest', 'critical', 'high'].includes(normalizedPriority);
};

export const isPrioritycritical = (priority: string): boolean => {
  const normalizedPriority = normalizePriority(priority);
  return ['highest', 'critical'].includes(normalizedPriority);
};

export const isHighPriorityTicketType = (type: string): boolean => {
  const normalizedType = normalizeTicketType(type);
  return JIRA_EMAIL_CONFIG.HIGH_PRIORITY_TYPES.includes(normalizedType);
};

// Get JIRA ticket URL (if base URL is configured)
export const getJiraTicketUrl = (ticketKey: string, jiraBaseUrl?: string): string => {
  const baseUrl = jiraBaseUrl || process.env.NEXT_PUBLIC_JIRA_BASE_URL || process.env.JIRA_BASE_URL;
  if (!baseUrl) {
    return `#${ticketKey}`; // Fallback to anchor if no URL configured
  }
  return `${baseUrl}/browse/${ticketKey}`;
};

// Get SLA status for a ticket
export const getTicketSLAStatus = (ticket: JiraTicket): {
  status: 'on_time' | 'warning' | 'critical' | 'severe' | 'stagnant';
  hoursRemaining?: number;
  message: string;
} => {
  const overdueInfo = getJiraOverdueInfo(ticket);
  
  if (!overdueInfo.isOverdue) {
    return {
      status: 'on_time',
      message: 'Ticket is within SLA timeframes'
    };
  }

  const levelMessages = {
    warning: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - attention needed`,
    critical: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - urgent action required`,
    severe: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - critical escalation needed`,
    stagnant: `Ticket has been stagnant for ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} - needs immediate attention`
  };

  return {
    status: overdueInfo.level as any,
    message: levelMessages[overdueInfo.level as keyof typeof levelMessages] || 'Ticket status unknown'
  };
};

// Generate summary statistics for reporting
export const generateJiraSummaryStats = (tickets: JiraTicket[]): {
  totalTickets: number;
  overdueTickets: number;
  slaCompliance: number;
  averageAge: number;
  criticalIssues: number;
  topAssignees: Array<{ name: string; tickets: number; overdue: number }>;
} => {
  const analysis = getJiraTicketAnalysis(tickets);
  const now = new Date();
  
  const totalAge = tickets.reduce((sum, ticket) => {
    return sum + differenceInHours(now, ticket.createdAt);
  }, 0);
  
  const averageAge = tickets.length > 0 ? Math.round(totalAge / tickets.length) : 0;
  const slaCompliance = tickets.length > 0 ? Math.round((analysis.onTime / tickets.length) * 100) : 100;
  
  const topAssignees = Array.from(analysis.assigneeWorkload.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, workload]) => ({
      name,
      tickets: workload.total,
      overdue: workload.overdue
    }));

  return {
    totalTickets: analysis.total,
    overdueTickets: analysis.overdue,
    slaCompliance,
    averageAge,
    criticalIssues: analysis.criticalPriorityOverdue,
    topAssignees
  };
};