
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ITSMTicket {
  id: string;
  type: 'CRQ' | 'INC';
  priority: 'P1' | 'P2' | 'P3';
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

interface ITSMAnalysis {
  total: number;
  overdue: number;
  onTime: number;
  byPriority: {
    p1: { total: number; overdue: number };
    p2: { total: number; overdue: number };
    p3: { total: number; overdue: number };
  };
  byAssignee: Record<string, { total: number; overdue: number }>;
  severityLevels: {
    severe: number;
    critical: number;
    warning: number;
    stagnant: number;
  };
  teamPerformance: {
    totalWorkload: number;
    averageAge: number;
    slaCompliance: number;
    topPerformer: string;
    mostOverdue: string;
  };
}

// CES Team Configuration for ITSM
export const CES_EMAIL_CONFIG = {
  // CES Team email recipients
  OVERDUE_ALERT_RECIPIENTS: [
    'farouqmanar3@gmail.com'
  ],
  
  // CES Team members mapping
  OWNER_NAME_MAPPING: {
    ee0023059: 'Nada BELMAATI',
    ee0023068: 'Mohamed AZFAR AZAMI',
    ee0023070: 'Youssef RAYOUD',
    ee0095270: 'Chafik ZARHOUR',
  },
  
  CES_TEAM_IDS: ['ee0023059', 'ee0023068', 'ee0023070', 'ee0095270'],
  
  CES_TEAM_NAMES: ['Nada BELMAATI', 'Mohamed AZFAR AZAMI', 'Youssef RAYOUD', 'Chafik ZARHOUR'],
  
  // Email settings
  SEND_THRESHOLD: 1, // Send email if >= 1 overdue tickets
  
  // CES-specific aggressive SLA thresholds (in hours) for ITSM
  ITSM_SLA_THRESHOLDS: {
    P1: { warning: 2, critical: 6, severe: 12 },   // P1: 2h warning, 6h critical, 12h severe
    P2: { warning: 4, critical: 12, severe: 24 },  // P2: 4h warning, 12h critical, 24h severe  
    P3: { warning: 8, critical: 24, severe: 48 },  // P3: 8h warning, 24h critical, 48h severe
    DEFAULT: { warning: 12, critical: 48, severe: 96 } // Default: 12h warning, 48h critical, 96h severe
  },
  
  // CES stagnation threshold
  STAGNATION_THRESHOLD: 24, // Hours
  
  // Closed status mappings
  CLOSED_STATUSES: [
    'fermé', 'closed', 'clot', 'résolu', 'resolved', 'terminé', 'completed',
    'clos', 'annulé', 'cancelled', 'rejected', 'rejeté'
  ]
};

// Normalize assignee ID to name
const normalizeAssigneeName = (assigneeId: string): string => {
  return CES_EMAIL_CONFIG.OWNER_NAME_MAPPING[assigneeId as keyof typeof CES_EMAIL_CONFIG.OWNER_NAME_MAPPING] || assigneeId;
};

// Check if ticket belongs to CES team
export const isCESTicket = (assigneeId: string): boolean => {
  return CES_EMAIL_CONFIG.CES_TEAM_IDS.includes(assigneeId);
};

// Check if ticket status indicates closure
const isTicketClosed = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase().trim();
  return CES_EMAIL_CONFIG.CLOSED_STATUSES.includes(normalizedStatus);
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
      level: 'none',
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  if (isTicketClosed(ticket.status)) {
    return {
      isOverdue: false,
      level: 'none',
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
  const hoursSinceUpdated = differenceInHours(now, ticket.lastUpdatedAt);
  const daysSinceCreated = differenceInDays(now, ticket.createdAt);
  const daysSinceUpdated = differenceInDays(now, ticket.lastUpdatedAt);

  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > CES_EMAIL_CONFIG.STAGNATION_THRESHOLD;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  const getThresholds = (priority: string) => {
    switch (priority) {
      case 'P1':
        return CES_EMAIL_CONFIG.ITSM_SLA_THRESHOLDS.P1;
      case 'P2':
        return CES_EMAIL_CONFIG.ITSM_SLA_THRESHOLDS.P2;
      case 'P3':
        return CES_EMAIL_CONFIG.ITSM_SLA_THRESHOLDS.P3;
      default:
        return CES_EMAIL_CONFIG.ITSM_SLA_THRESHOLDS.DEFAULT;
    }
  };

  const thresholds = getThresholds(ticket.priority);
  const isOverdueByTime = maxHours >= thresholds.warning;
  const isOverdue = isOverdueByTime || isStagnant;

  if (!isOverdue) {
    return {
      isOverdue: false,
      level: 'none',
      hoursOverdue: 0,
      daysOverdue: 0,
    };
  }

  if (isStagnant && !isOverdueByTime) {
    return {
      isOverdue: true,
      level: 'stagnant',
      hoursOverdue: hoursBetweenCreationAndUpdate,
      daysOverdue: Math.floor(hoursBetweenCreationAndUpdate / 24),
    };
  }

  if (maxHours >= thresholds.severe) {
    return {
      isOverdue: true,
      level: 'severe',
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.critical) {
    return {
      isOverdue: true,
      level: 'critical',
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  } else if (maxHours >= thresholds.warning) {
    return {
      isOverdue: true,
      level: 'warning',
      hoursOverdue: maxHours,
      daysOverdue: maxDays,
    };
  }

  return {
    isOverdue: false,
    level: 'none',
    hoursOverdue: 0,
    daysOverdue: 0,
  };
};

// Get comprehensive CES team analysis for ITSM
export const getCESTicketAnalysis = (tickets: ITSMTicket[]): ITSMAnalysis => {
  const analysis: ITSMAnalysis = {
    total: tickets.length,
    overdue: 0,
    onTime: 0,
    byPriority: {
      p1: { total: 0, overdue: 0 },
      p2: { total: 0, overdue: 0 },
      p3: { total: 0, overdue: 0 }
    },
    byAssignee: {},
    severityLevels: {
      severe: 0,
      critical: 0,
      warning: 0,
      stagnant: 0
    },
    teamPerformance: {
      totalWorkload: 0,
      averageAge: 0,
      slaCompliance: 0,
      topPerformer: '',
      mostOverdue: ''
    }
  };

  // Initialize assignee stats
  CES_EMAIL_CONFIG.CES_TEAM_NAMES.forEach(name => {
    analysis.byAssignee[name] = { total: 0, overdue: 0 };
  });

  const now = new Date();
  let totalAge = 0;

  tickets.forEach(ticket => {
    const overdueInfo = getITSMOverdueInfo(ticket);
    
    if (overdueInfo.isOverdue) {
      analysis.overdue++;
      analysis.severityLevels[overdueInfo.level as keyof typeof analysis.severityLevels]++;
    } else {
      analysis.onTime++;
    }

    // Calculate ticket age
    const ticketAge = differenceInHours(now, ticket.createdAt);
    totalAge += ticketAge;

    // Priority analysis
    const priorityKey = `p${ticket.priority.toLowerCase()}` as keyof typeof analysis.byPriority;
    if (analysis.byPriority[priorityKey]) {
      analysis.byPriority[priorityKey].total++;
      if (overdueInfo.isOverdue) {
        analysis.byPriority[priorityKey].overdue++;
      }
    }

    // Assignee analysis
    const assigneeName = normalizeAssigneeName(ticket.assignee) || ticket.assignee;
    if (!analysis.byAssignee[assigneeName]) {
      analysis.byAssignee[assigneeName] = { total: 0, overdue: 0 };
    }
    analysis.byAssignee[assigneeName].total++;
    if (overdueInfo.isOverdue) {
      analysis.byAssignee[assigneeName].overdue++;
    }
  });

  // Calculate team performance metrics
  analysis.teamPerformance.totalWorkload = tickets.length;
  analysis.teamPerformance.averageAge = tickets.length > 0 ? Math.round(totalAge / tickets.length) : 0;
  analysis.teamPerformance.slaCompliance = tickets.length > 0 ? Math.round((analysis.onTime / tickets.length) * 100) : 100;

  // Find top performer (lowest overdue ratio)
  let bestRatio = Infinity;
  let worstRatio = -1;
  
  Object.entries(analysis.byAssignee).forEach(([assignee, stats]) => {
    if (stats.total > 0) {
      const overdueRatio = stats.overdue / stats.total;
      if (overdueRatio < bestRatio) {
        bestRatio = overdueRatio;
        analysis.teamPerformance.topPerformer = assignee;
      }
      if (overdueRatio > worstRatio) {
        worstRatio = overdueRatio;
        analysis.teamPerformance.mostOverdue = assignee;
      }
    }
  });

  return analysis;
};

// Send CES ITSM overdue tickets email
export const sendCESOverdueTicketsEmail = async (
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

    if (overdueTickets.length < CES_EMAIL_CONFIG.SEND_THRESHOLD) {
      return {
        success: true,
        message: `No email sent - only ${overdueTickets.length} overdue CES ITSM tickets (threshold: ${CES_EMAIL_CONFIG.SEND_THRESHOLD})`,
        overdueCount: overdueTickets.length,
        p1Count: 0
      };
    }

    const recipients = customRecipients || CES_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS;
    const p1Count = overdueTickets.filter(t => t.priority === 'P1').length;

    // Generate team stats
    const analysis = getCESTicketAnalysis(tickets);
    const teamStats = {
      totalTickets: tickets.length,
      byAssignee: analysis.byAssignee
    };

    const response = await fetch('/api/send-ces-itsm-overdue-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        overdueTickets,
        recipients,
        fileName,
        teamStats
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send CES ITSM email');
    }

    return {
      success: true,
      message: result.message,
      overdueCount: overdueTickets.length,
      p1Count: p1Count
    };

  } catch (error) {
    console.error('Error sending CES ITSM overdue tickets email:', error);
    return {
      success: false,
      message: `Failed to send CES ITSM email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overdueCount: 0,
      p1Count: 0
    };
  }
};

// Enhanced Excel export function for CES ITSM tickets
export const exportCESToExcel = (tickets: ITSMTicket[]): void => {
  const BOM = '\uFEFF';
  const reportDate = new Date();

  const headers = [
    'Ticket ID',
    'Type',
    'Priority',
    'Status',
    'CES Assignee',
    'Company',
    'Created Date',
    'Last Updated',
    'Hours Since Created',
    'Hours Since Updated',
    'Hours Overdue',
    'Days Overdue',
    'Overdue Level',
    'SLA Status',
    'Is Stagnant',
    'CES SLA Compliance'
  ];

  const rows = tickets.map((ticket) => {
    const overdue = getITSMOverdueInfo(ticket);
    const slaStatus = overdue.isOverdue ? 'SLA_BREACH' : 'WITHIN_SLA';
    const isStagnant = overdue.level === 'stagnant';
    
    const now = new Date();
    const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
    const hoursSinceUpdated = differenceInHours(now, ticket.lastUpdatedAt);

    const safeValue = (value: string | number | boolean | null | undefined): string =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    return [
      safeValue(ticket.id),
      safeValue(ticket.type),
      safeValue(ticket.priority),
      safeValue(ticket.status),
      safeValue(normalizeAssigneeName(ticket.assignee) || ticket.assignee),
      safeValue(ticket.company),
      safeValue(format(ticket.createdAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(format(ticket.lastUpdatedAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(hoursSinceCreated),
      safeValue(hoursSinceUpdated),
      safeValue(overdue.hoursOverdue),
      safeValue(overdue.daysOverdue),
      safeValue(overdue.level),
      safeValue(slaStatus),
      safeValue(isStagnant),
      safeValue(overdue.isOverdue ? 'NON_COMPLIANT' : 'COMPLIANT')
    ].join(',');
  });

  const analysis = getCESTicketAnalysis(tickets);
  
  const csv = [
    `"CES Team - ITSM Tickets Export - ${format(reportDate, 'PPP \'at\' p', { locale: fr })}"`,
    '',
    `"Generated: ${format(reportDate, 'dd/MM/yyyy HH:mm:ss')}"`,
    `"Total CES Tickets: ${tickets.length}"`,
    `"Overdue Tickets: ${analysis.overdue}"`,
    `"SLA Compliance: ${analysis.teamPerformance.slaCompliance}%"`,
    `"P1 Overdue: ${analysis.byPriority.p1.overdue}"`,
    `"P2 Overdue: ${analysis.byPriority.p2.overdue}"`,
    `"P3 Overdue: ${analysis.byPriority.p3.overdue}"`,
    '',
    headers.map((h) => `"${h}"`).join(','),
    ...rows,
  ].join('\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `ces_itsm_tickets_${format(reportDate, 'yyyy-MM-dd_HHmm')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Utility functions
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

// Get CES team workload distribution
export const getCESWorkloadDistribution = (tickets: ITSMTicket[]): {
  [key: string]: {
    total: number;
    overdue: number;
    byPriority: Record<string, number>;
    avgAge: number;
    slaCompliance: number;
  };
} => {
  const workload: Record<string, any> = {};
  const now = new Date();

  // Initialize team members
  CES_EMAIL_CONFIG.CES_TEAM_NAMES.forEach(name => {
    workload[name] = {
      total: 0,
      overdue: 0,
      byPriority: { p1: 0, p2: 0, p3: 0 },
      totalAge: 0,
      avgAge: 0,
      slaCompliance: 0
    };
  });

  tickets.forEach(ticket => {
    const assigneeName = normalizeAssigneeName(ticket.assignee) || ticket.assignee;
    if (!workload[assigneeName]) return;

    const overdueInfo = getITSMOverdueInfo(ticket);
    const ticketAge = differenceInHours(now, ticket.createdAt);

    workload[assigneeName].total++;
    workload[assigneeName].totalAge += ticketAge;
    
    if (overdueInfo.isOverdue) {
      workload[assigneeName].overdue++;
    }

    // Priority distribution
    const priority = ticket.priority.toLowerCase();
    if (workload[assigneeName].byPriority[priority] !== undefined) {
      workload[assigneeName].byPriority[priority]++;
    }
  });

  // Calculate averages and compliance
  Object.keys(workload).forEach(assignee => {
    const data = workload[assignee];
    data.avgAge = data.total > 0 ? Math.round(data.totalAge / data.total) : 0;
    data.slaCompliance = data.total > 0 ? Math.round(((data.total - data.overdue) / data.total) * 100) : 100;
    delete data.totalAge; // Remove intermediate calculation
  });

  return workload;
};

// Get CES team performance summary
export const getCESTeamPerformanceSummary = (tickets: ITSMTicket[]): {
  teamSlaCompliance: number;
  totalWorkload: number;
  criticalTickets: number;
  avgResponseTime: number;
  topPerformer: string;
  areaForImprovement: string;
} => {
  const analysis = getCESTicketAnalysis(tickets);
  const workload = getCESWorkloadDistribution(tickets);

  const criticalTickets = analysis.byPriority.p1.total + analysis.byPriority.p2.total;
  
  // Find best and worst performers
  let topPerformer = '';
  let worstPerformer = '';
  let bestCompliance = -1;
  let worstCompliance = 101;

  Object.entries(workload).forEach(([assignee, data]) => {
    if (data.total > 0) {
      if (data.slaCompliance > bestCompliance) {
        bestCompliance = data.slaCompliance;
        topPerformer = assignee;
      }
      if (data.slaCompliance < worstCompliance) {
        worstCompliance = data.slaCompliance;
        worstPerformer = assignee;
      }
    }
  });

  return {
    teamSlaCompliance: analysis.teamPerformance.slaCompliance,
    totalWorkload: analysis.teamPerformance.totalWorkload,
    criticalTickets,
    avgResponseTime: analysis.teamPerformance.averageAge,
    topPerformer,
    areaForImprovement: worstPerformer
  };
};

// Check if ticket is critical for CES (P1 or P2)
export const isCriticalCESTicket = (ticket: ITSMTicket): boolean => {
  return ['P1', 'P2'].includes(ticket.priority);
};

// Get CES SLA status for a ticket
export const getCESSLAStatus = (ticket: ITSMTicket): {
  status: 'compliant' | 'warning' | 'critical' | 'severe' | 'stagnant';
  message: string;
  hoursRemaining?: number;
} => {
  const overdueInfo = getITSMOverdueInfo(ticket);
  
  if (!overdueInfo.isOverdue) {
    return {
      status: 'compliant',
      message: 'Ticket is within CES SLA timeframes'
    };
  }

  const levelMessages = {
    warning: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - CES attention needed`,
    critical: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - urgent CES action required`,
    severe: `Ticket is ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} overdue - critical CES escalation needed`,
    stagnant: `Ticket has been stagnant for ${overdueInfo.daysOverdue > 0 ? `${overdueInfo.daysOverdue} days` : `${overdueInfo.hoursOverdue} hours`} - immediate CES action required`
  };

  return {
    status: overdueInfo.level as any,
    message: levelMessages[overdueInfo.level as keyof typeof levelMessages] || 'Ticket status unknown'
  };
};
