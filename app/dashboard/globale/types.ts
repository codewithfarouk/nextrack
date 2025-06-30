export interface BaseTicket {
  id: string;
  source: 'clarify' | 'jira' | 'itsm-change' | 'itsm-incident';
  client: string;
  createdAt: Date | null;
  rawData: any;
}

export interface ClarifyTicket extends BaseTicket {
  source: 'clarify';
  status: string;
  severity: string;
  priority: string;
  incidentStartDate: Date | null;
  closedAt: Date | null;
  lastUpdatedAt: Date | null;
  owner: string;
  region: string;
  city: string;
}

export interface JiraTicket extends BaseTicket {
  source: 'jira';
  key: string;
  type: string;
  priority: string;
  status: string;
  updatedAt: Date | null;
  assignee: string;
  reporter: string;
}

export interface ITSMChange extends BaseTicket {
  source: 'itsm-change';
  endDate: Date | null;
}

export interface ITSMIncident extends BaseTicket {
  source: 'itsm-incident';
  resolvedDate: Date | null;
}

export type AllTickets = ClarifyTicket | JiraTicket | ITSMChange | ITSMIncident;

export interface FileUpload {
  id: string;
  file: File;
  type: 'clarify' | 'jira' | 'itsm-change' | 'itsm-incident';
  processed: boolean;
  data?: AllTickets[];
  uploadDate: Date;
  recordCount: number;
  errors: string[];
}

export interface ClientAnalytics {
  name: string;
  totalTickets: number;
  incidents: number;
  changes: number;
  clarifyTickets: number;
  jiraTickets: number;
  itsmChangeTickets: number;
  itsmIncidentTickets: number;
  lastActivity: Date | null;
  riskScore: number;
}

export interface GlobalAnalytics {
  totalTickets: number;
  totalIncidents: number;
  totalChanges: number;
  totalClients: number;
  activePeriod: { start: Date | null; end: Date | null };
  bySource: Record<string, number>;
  byMonth: Array<{
    month: string;
    total: number;
    incidents: number;
    changes: number;
    clarify: number;
    jira: number;
    itsmChange: number;
    itsmIncident: number;
  }>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  clientAnalytics: ClientAnalytics[];
  topClients: ClientAnalytics[];
  riskClients: ClientAnalytics[];
  performanceMetrics: {
    incidentRate: number;
    changeRate: number;
    avgTicketsPerClient: number;
  };
}