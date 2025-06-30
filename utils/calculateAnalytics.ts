import { AllTickets, ClarifyTicket, ClientAnalytics, GlobalAnalytics, JiraTicket } from "@/app/dashboard/globale/types";


export const calculateAnalytics = (allTickets: AllTickets[], filters: any): GlobalAnalytics => {
  const filteredTickets = allTickets.filter((ticket) => {
    if (filters.dateStart && ticket.createdAt && ticket.createdAt < new Date(filters.dateStart)) return false;
    if (filters.dateEnd && ticket.createdAt && ticket.createdAt > new Date(filters.dateEnd)) return false;
    if (filters.sources.length > 0 && !filters.sources.includes(ticket.source)) return false;
    if (filters.clients.length > 0 && !filters.clients.includes(ticket.client)) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchFields = [ticket.id, ticket.client];
      if (ticket.source === 'jira') searchFields.push((ticket as JiraTicket).key);
      return searchFields.some((field) => field.toLowerCase().includes(searchLower));
    }
    return true;
  });

  const totalTickets = filteredTickets.length;
  const totalIncidents = filteredTickets.filter((t) => t.source === 'clarify' || t.source === 'itsm-incident').length;
  const totalChanges = filteredTickets.filter((t) => t.source === 'jira' || t.source === 'itsm-change').length;

  const clientMap = new Map<string, ClientAnalytics>();
  filteredTickets.forEach((ticket) => {
    const clientName = ticket.client.toLowerCase();
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, {
        name: ticket.client,
        totalTickets: 0,
        incidents: 0,
        changes: 0,
        clarifyTickets: 0,
        jiraTickets: 0,
        itsmChangeTickets: 0,
        itsmIncidentTickets: 0,
        lastActivity: null,
        riskScore: 0,
      });
    }

    const clientAnalytics = clientMap.get(clientName)!;
    clientAnalytics.totalTickets++;

    if (ticket.createdAt && (!clientAnalytics.lastActivity || ticket.createdAt > clientAnalytics.lastActivity)) {
      clientAnalytics.lastActivity = ticket.createdAt;
    }

    switch (ticket.source) {
      case 'clarify':
        clientAnalytics.clarifyTickets++;
        clientAnalytics.incidents++;
        break;
      case 'jira':
        clientAnalytics.jiraTickets++;
        clientAnalytics.changes++;
        break;
      case 'itsm-change':
        clientAnalytics.itsmChangeTickets++;
        clientAnalytics.changes++;
        break;
      case 'itsm-incident':
        clientAnalytics.itsmIncidentTickets++;
        clientAnalytics.incidents++;
        break;
    }

    clientAnalytics.riskScore = Math.min(100, (clientAnalytics.incidents / Math.max(clientAnalytics.totalTickets, 1)) * 100);
  });

  const clientAnalytics = Array.from(clientMap.values()).sort((a, b) => b.totalTickets - a.totalTickets);
  const totalClients = clientAnalytics.length;

  const monthlyMap = new Map<string, any>();
  filteredTickets.forEach((ticket) => {
    if (ticket.createdAt) {
      const monthKey = `${ticket.createdAt.getFullYear()}-${String(ticket.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          total: 0,
          incidents: 0,
          changes: 0,
          clarify: 0,
          jira: 0,
          itsmChange: 0,
          itsmIncident: 0,
        });
      }

      const monthData = monthlyMap.get(monthKey);
      monthData.total++;
      monthData[ticket.source.replace('-', '')]++;
      if (ticket.source === 'clarify' || ticket.source === 'itsm-incident') {
        monthData.incidents++;
      } else {
        monthData.changes++;
      }
    }
  });

  const byMonth = Array.from(monthlyMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      month: new Date(item.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    }));

  const bySource = {
    clarify: filteredTickets.filter((t) => t.source === 'clarify').length,
    jira: filteredTickets.filter((t) => t.source === 'jira').length,
    'itsm-change': filteredTickets.filter((t) => t.source === 'itsm-change').length,
    'itsm-incident': filteredTickets.filter((t) => t.source === 'itsm-incident').length,
  };

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  filteredTickets.forEach((ticket) => {
    if (ticket.source === 'clarify') {
      const clarifyTicket = ticket as ClarifyTicket;
      byStatus[clarifyTicket.status] = (byStatus[clarifyTicket.status] || 0) + 1;
      byPriority[clarifyTicket.priority] = (byPriority[clarifyTicket.priority] || 0) + 1;
    } else if (ticket.source === 'jira') {
      const jiraTicket = ticket as JiraTicket;
      byStatus[jiraTicket.status] = (byStatus[jiraTicket.status] || 0) + 1;
      byPriority[jiraTicket.priority] = (byPriority[jiraTicket.priority] || 0) + 1;
    }
  });

  const dates = filteredTickets.map((t) => t.createdAt).filter(Boolean) as Date[];
  const activePeriod = {
    start: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null,
    end: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
  };

  return {
    totalTickets,
    totalIncidents,
    totalChanges,
    totalClients,
    activePeriod,
    bySource,
    byMonth,
    byStatus,
    byPriority,
    clientAnalytics,
    topClients: clientAnalytics.slice(0, 15),
    riskClients: clientAnalytics.filter((c) => c.riskScore > 70).slice(0, 5),
    performanceMetrics: {
      incidentRate: totalTickets > 0 ? (totalIncidents / totalTickets) * 100 : 0,
      changeRate: totalTickets > 0 ? (totalChanges / totalTickets) * 100 : 0,
      avgTicketsPerClient: totalClients > 0 ? totalTickets / totalClients : 0,
    },
  };
};