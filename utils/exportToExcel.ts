import { AllTickets, ClarifyTicket, GlobalAnalytics, JiraTicket } from '@/app/dashboard/globale/types';


export const exportToExcel = async (analytics: GlobalAnalytics, allTickets: AllTickets[]) => {
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Métrique', 'Valeur'],
      ['Total Tickets', analytics.totalTickets],
      ['Total Incidents', analytics.totalIncidents],
      ['Total Changements', analytics.totalChanges],
      ['Total Clients', analytics.totalClients],
      ['Taux d\'Incidents (%)', analytics.performanceMetrics.incidentRate.toFixed(2)],
      ['Taux de Changements (%)', analytics.performanceMetrics.changeRate.toFixed(2)],
      ['Tickets par Client', analytics.performanceMetrics.avgTicketsPerClient.toFixed(2)],
      ['Période Début', analytics.activePeriod.start?.toLocaleDateString('fr-FR') || 'N/A'],
      ['Période Fin', analytics.activePeriod.end?.toLocaleDateString('fr-FR') || 'N/A'],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

    // Client analytics sheet
    const clientData = analytics.clientAnalytics.map((client) => ({
      'Nom du Client': client.name,
      'Total Tickets': client.totalTickets,
      'Incidents': client.incidents,
      'Changements': client.changes,
      'Clarify': client.clarifyTickets,
      'Jira': client.jiraTickets,
      'ITSM Change': client.itsmChangeTickets,
      'ITSM Incident': client.itsmIncidentTickets,
      'Score de Risque': client.riskScore.toFixed(1),
      'Dernière Activité': client.lastActivity?.toLocaleDateString('fr-FR') || 'N/A',
    }));
    const clientWs = XLSX.utils.json_to_sheet(clientData);
    XLSX.utils.book_append_sheet(wb, clientWs, 'Analyse Clients');

    // Raw ticket data
    const ticketData = allTickets.map((ticket) => ({
      ID: ticket.id,
      Source: ticket.source,
      Client: ticket.client,
      'Date de Création': ticket.createdAt?.toLocaleDateString('fr-FR') || 'N/A',
      Statut: (ticket as ClarifyTicket | JiraTicket).status || 'N/A',
      Priorité: (ticket as ClarifyTicket | JiraTicket).priority || 'N/A',
    }));
    const ticketWs = XLSX.utils.json_to_sheet(ticketData);
    XLSX.utils.book_append_sheet(wb, ticketWs, 'Données Brutes');

    XLSX.writeFile(wb, `rapport-tickets-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
  }
};