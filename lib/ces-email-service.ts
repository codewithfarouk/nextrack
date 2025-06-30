// lib/ces-email-service.ts
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface CESAnalysis {
  total: number;
  overdue: number;
  onTime: number;
  bySeverity: {
    s1: { total: number; overdue: number };
    s2: { total: number; overdue: number };
    s3: { total: number; overdue: number };
  };
  byPriority: {
    haute: { total: number; overdue: number };
    moyenne: { total: number; overdue: number };
    basse: { total: number; overdue: number };
  };
  byOwner: Record<string, { total: number; overdue: number }>;
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

// CES Team Configuration
export const CES_EMAIL_CONFIG = {
  // CES Team email recipients
  OVERDUE_ALERT_RECIPIENTS: [
    'farouqmanar3@gmail.com'
  ],
  
  // CES Team members mapping
  OWNER_NAME_MAPPING: {
    ee0023059: "Nada BELMAATI",
    ee0023068: "Mohamed AZFAR AZAMI", 
    ee0023070: "Youssef RAYOUD",
    ee0095270: "Chafik ZARHOUR",
  },
  
  CES_TEAM_IDS: ["ee0023059", "ee0023068", "ee0023070", "ee0095270"],
  
  CES_TEAM_NAMES: ["Nada BELMAATI", "Mohamed AZFAR AZAMI", "Youssef RAYOUD", "Chafik ZARHOUR"],
  
  // Email settings
  SEND_THRESHOLD: 1, // Send email if >= 1 overdue tickets
  
  // CES-specific aggressive SLA thresholds (in hours)
  CES_SLA_THRESHOLDS: {
    S1: { warning: 2, critical: 6, severe: 12 },   // S1: 2h warning, 6h critical, 12h severe
    S2: { warning: 4, critical: 12, severe: 24 },  // S2: 4h warning, 12h critical, 24h severe  
    S3: { warning: 8, critical: 24, severe: 48 },  // S3: 8h warning, 24h critical, 48h severe
    DEFAULT: { warning: 12, critical: 48, severe: 96 } // Default: 12h warning, 48h critical, 96h severe
  },
  
  // CES stagnation threshold (more aggressive than regular teams)
  STAGNATION_THRESHOLD: 24, // Hours
  
  // Closed status mappings
  CLOSED_STATUSES: [
    'fermé', 'closed', 'clot', 'résolu', 'resolved', 'terminé', 'completed',
    'clos', 'annulé', 'cancelled', 'rejected', 'rejeté'
  ]
};

// Normalize owner ID to name
const normalizeOwnerName = (ownerId: string): string => {
  return CES_EMAIL_CONFIG.OWNER_NAME_MAPPING[ownerId as keyof typeof CES_EMAIL_CONFIG.OWNER_NAME_MAPPING] || ownerId;
};

// Check if ticket belongs to CES team
export const isCESTicket = (ownerId: string): boolean => {
  return CES_EMAIL_CONFIG.CES_TEAM_IDS.includes(ownerId);
};

// Check if ticket status indicates closure
const isTicketClosed = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase().trim();
  return CES_EMAIL_CONFIG.CLOSED_STATUSES.includes(normalizedStatus);
};

// CES-specific overdue detection with aggressive thresholds
export const getCESOverdueInfo = (ticket: ClarifyTicket): OverdueInfo => {
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
  if (isTicketClosed(ticket.status)) {
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

  // CES-specific stagnation detection (more aggressive)
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > CES_EMAIL_CONFIG.STAGNATION_THRESHOLD;

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // Get CES-specific thresholds based on severity
  const getThresholds = (severity: string) => {
    switch (severity) {
      case "1":
        return CES_EMAIL_CONFIG.CES_SLA_THRESHOLDS.S1;
      case "2":
        return CES_EMAIL_CONFIG.CES_SLA_THRESHOLDS.S2;
      case "3":
        return CES_EMAIL_CONFIG.CES_SLA_THRESHOLDS.S3;
      default:
        return CES_EMAIL_CONFIG.CES_SLA_THRESHOLDS.DEFAULT;
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

// Get comprehensive CES team analysis
export const getCESTicketAnalysis = (tickets: ClarifyTicket[]): CESAnalysis => {
  const analysis: CESAnalysis = {
    total: tickets.length,
    overdue: 0,
    onTime: 0,
    bySeverity: {
      s1: { total: 0, overdue: 0 },
      s2: { total: 0, overdue: 0 },
      s3: { total: 0, overdue: 0 }
    },
    byPriority: {
      haute: { total: 0, overdue: 0 },
      moyenne: { total: 0, overdue: 0 },
      basse: { total: 0, overdue: 0 }
    },
    byOwner: {},
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

  // Initialize owner stats
  CES_EMAIL_CONFIG.CES_TEAM_NAMES.forEach(name => {
    analysis.byOwner[name] = { total: 0, overdue: 0 };
  });

  const now = new Date();
  let totalAge = 0;

  tickets.forEach(ticket => {
    const overdueInfo = getCESOverdueInfo(ticket);
    
    if (overdueInfo.isOverdue) {
      analysis.overdue++;
      analysis.severityLevels[overdueInfo.level as keyof typeof analysis.severityLevels]++;
    } else {
      analysis.onTime++;
    }

    // Calculate ticket age
    const ticketAge = differenceInHours(now, ticket.createdAt);
    totalAge += ticketAge;

    // Severity analysis
    const severityKey = `s${ticket.severity}` as keyof typeof analysis.bySeverity;
    if (analysis.bySeverity[severityKey]) {
      analysis.bySeverity[severityKey].total++;
      if (overdueInfo.isOverdue) {
        analysis.bySeverity[severityKey].overdue++;
      }
    }

    // Priority analysis
    const normalizedPriority = ticket.priority.toLowerCase() as keyof typeof analysis.byPriority;
    if (analysis.byPriority[normalizedPriority]) {
      analysis.byPriority[normalizedPriority].total++;
      if (overdueInfo.isOverdue) {
        analysis.byPriority[normalizedPriority].overdue++;
      }
    }

    // Owner analysis
    const ownerName = normalizeOwnerName(ticket.owner) || ticket.owner;
    if (!analysis.byOwner[ownerName]) {
      analysis.byOwner[ownerName] = { total: 0, overdue: 0 };
    }
    analysis.byOwner[ownerName].total++;
    if (overdueInfo.isOverdue) {
      analysis.byOwner[ownerName].overdue++;
    }
  });

  // Calculate team performance metrics
  analysis.teamPerformance.totalWorkload = tickets.length;
  analysis.teamPerformance.averageAge = tickets.length > 0 ? Math.round(totalAge / tickets.length) : 0;
  analysis.teamPerformance.slaCompliance = tickets.length > 0 ? Math.round((analysis.onTime / tickets.length) * 100) : 100;

  // Find top performer (lowest overdue ratio)
  let bestRatio = Infinity;
  let worstRatio = -1;
  
  Object.entries(analysis.byOwner).forEach(([owner, stats]) => {
    if (stats.total > 0) {
      const overdueRatio = stats.overdue / stats.total;
      if (overdueRatio < bestRatio) {
        bestRatio = overdueRatio;
        analysis.teamPerformance.topPerformer = owner;
      }
      if (overdueRatio > worstRatio) {
        worstRatio = overdueRatio;
        analysis.teamPerformance.mostOverdue = owner;
      }
    }
  });

  return analysis;
};

// Send CES overdue tickets email
export const sendCESOverdueTicketsEmail = async (
  tickets: ClarifyTicket[],
  fileName: string,
  customRecipients?: string[]
): Promise<{ success: boolean; message: string; overdueCount: number; s1Count: number }> => {
  try {
    // Filter overdue tickets
    const overdueTickets = tickets
      .map(ticket => ({
        ...ticket,
        overdueInfo: getCESOverdueInfo(ticket)
      }))
      .filter(ticket => ticket.overdueInfo.isOverdue);

    if (overdueTickets.length < CES_EMAIL_CONFIG.SEND_THRESHOLD) {
      return {
        success: true,
        message: `No email sent - only ${overdueTickets.length} overdue CES tickets (threshold: ${CES_EMAIL_CONFIG.SEND_THRESHOLD})`,
        overdueCount: overdueTickets.length,
        s1Count: 0
      };
    }

    const recipients = customRecipients || CES_EMAIL_CONFIG.OVERDUE_ALERT_RECIPIENTS;
    const s1Count = overdueTickets.filter(t => t.severity === '1').length;

    // Generate team stats
    const analysis = getCESTicketAnalysis(tickets);
    const teamStats = {
      totalTickets: tickets.length,
      byOwner: analysis.byOwner
    };

    const response = await fetch('/api/send-ces-overdue-email', {
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
      throw new Error(result.error || 'Failed to send CES email');
    }

    return {
      success: true,
      message: result.message,
      overdueCount: overdueTickets.length,
      s1Count: s1Count
    };

  } catch (error) {
    console.error('Error sending CES overdue tickets email:', error);
    return {
      success: false,
      message: `Failed to send CES email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      overdueCount: 0,
      s1Count: 0
    };
  }
};

// Enhanced Excel export function for CES tickets
export const exportCESToExcel = (tickets: ClarifyTicket[]): void => {
  const BOM = "\uFEFF";
  const reportDate = new Date();

  const headers = [
    "Ticket ID",
    "CES Owner",
    "Severity",
    "Priority", 
    "Status",
    "Company",
    "Region",
    "City",
    "Created Date",
    "Last Updated",
    "Incident Start Date",
    "Closed Date",
    "Hours Since Created",
    "Hours Since Updated",
    "Hours Overdue",
    "Days Overdue",
    "Overdue Level",
    "SLA Status",
    "Is Stagnant",
    "CES SLA Compliance"
  ];

  const rows = tickets.map((ticket) => {
    const overdue = getCESOverdueInfo(ticket);
    const slaStatus = overdue.isOverdue ? "SLA_BREACH" : "WITHIN_SLA";
    const isStagnant = overdue.level === "stagnant";
    
    const now = new Date();
    const hoursSinceCreated = differenceInHours(now, ticket.createdAt);
    const hoursSinceUpdated = differenceInHours(now, ticket.lastUpdatedAt);

    const safeValue = (value: string | number | boolean | null | undefined): string =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    return [
      safeValue(ticket.id),
      safeValue(normalizeOwnerName(ticket.owner) || ticket.owner),
      safeValue(`S${ticket.severity}`),
      safeValue(ticket.priority),
      safeValue(ticket.status),
      safeValue(ticket.company),
      safeValue(ticket.region),
      safeValue(ticket.city),
      safeValue(format(ticket.createdAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(format(ticket.lastUpdatedAt, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(format(ticket.incidentStartDate, 'dd/MM/yyyy HH:mm:ss')),
      safeValue(ticket.closedAt ? format(ticket.closedAt, 'dd/MM/yyyy HH:mm:ss') : ''),
      safeValue(hoursSinceCreated),
      safeValue(hoursSinceUpdated),
      safeValue(overdue.hoursOverdue),
      safeValue(overdue.daysOverdue),
      safeValue(overdue.level),
      safeValue(slaStatus),
      safeValue(isStagnant),
      safeValue(overdue.isOverdue ? 'NON_COMPLIANT' : 'COMPLIANT')
    ].join(",");
  });

  const analysis = getCESTicketAnalysis(tickets);
  
  const csv = [
    `"CES Team - Clarify Tickets Export - ${format(reportDate, 'PPP \'at\' p', { locale: fr })}"`,
    "",
    `"Generated: ${format(reportDate, 'dd/MM/yyyy HH:mm:ss')}"`,
    `"Total CES Tickets: ${tickets.length}"`,
    `"Overdue Tickets: ${analysis.overdue}"`,
    `"SLA Compliance: ${analysis.teamPerformance.slaCompliance}%"`,
    `"S1 Overdue: ${analysis.bySeverity.s1.overdue}"`,
    `"S2 Overdue: ${analysis.bySeverity.s2.overdue}"`,
    `"S3 Overdue: ${analysis.bySeverity.s3.overdue}"`,
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
    `ces_clarify_tickets_${format(reportDate, 'yyyy-MM-dd_HHmm')}.csv`
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
export const getCESWorkloadDistribution = (tickets: ClarifyTicket[]): {
  [key: string]: {
    total: number;
    overdue: number;
    byPriority: Record<string, number>;
    bySeverity: Record<string, number>;
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
      byPriority: { haute: 0, moyenne: 0, basse: 0 },
      bySeverity: { s1: 0, s2: 0, s3: 0 },
      totalAge: 0,
      avgAge: 0,
      slaCompliance: 0
    };
  });

  tickets.forEach(ticket => {
    const ownerName = normalizeOwnerName(ticket.owner) || ticket.owner;
    if (!workload[ownerName]) return;

    const overdueInfo = getCESOverdueInfo(ticket);
    const ticketAge = differenceInHours(now, ticket.createdAt);

    workload[ownerName].total++;
    workload[ownerName].totalAge += ticketAge;
    
    if (overdueInfo.isOverdue) {
      workload[ownerName].overdue++;
    }

    // Priority distribution
    const priority = ticket.priority.toLowerCase();
    if (workload[ownerName].byPriority[priority] !== undefined) {
      workload[ownerName].byPriority[priority]++;
    }

    // Severity distribution
    const severity = `s${ticket.severity}`;
    if (workload[ownerName].bySeverity[severity] !== undefined) {
      workload[ownerName].bySeverity[severity]++;
    }
  });

  // Calculate averages and compliance
  Object.keys(workload).forEach(owner => {
    const data = workload[owner];
    data.avgAge = data.total > 0 ? Math.round(data.totalAge / data.total) : 0;
    data.slaCompliance = data.total > 0 ? Math.round(((data.total - data.overdue) / data.total) * 100) : 100;
    delete data.totalAge; // Remove intermediate calculation
  });

  return workload;
};

// Get CES team performance summary
export const getCESTeamPerformanceSummary = (tickets: ClarifyTicket[]): {
  teamSlaCompliance: number;
  totalWorkload: number;
  criticalTickets: number;
  avgResponseTime: number;
  topPerformer: string;
  areaForImprovement: string;
} => {
  const analysis = getCESTicketAnalysis(tickets);
  const workload = getCESWorkloadDistribution(tickets);

  const criticalTickets = analysis.bySeverity.s1.total + analysis.bySeverity.s2.total;
  
  // Find best and worst performers
  let topPerformer = '';
  let worstPerformer = '';
  let bestCompliance = -1;
  let worstCompliance = 101;

  Object.entries(workload).forEach(([owner, data]) => {
    if (data.total > 0) {
      if (data.slaCompliance > bestCompliance) {
        bestCompliance = data.slaCompliance;
        topPerformer = owner;
      }
      if (data.slaCompliance < worstCompliance) {
        worstCompliance = data.slaCompliance;
        worstPerformer = owner;
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

// Check if ticket is critical for CES (S1 or S2)
export const isCriticalCESTicket = (ticket: ClarifyTicket): boolean => {
  return ['1', '2'].includes(ticket.severity);
};

// Get CES SLA status for a ticket
export const getCESSLAStatus = (ticket: ClarifyTicket): {
  status: 'compliant' | 'warning' | 'critical' | 'severe' | 'stagnant';
  message: string;
  hoursRemaining?: number;
} => {
  const overdueInfo = getCESOverdueInfo(ticket);
  
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