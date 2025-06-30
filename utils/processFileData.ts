import { AllTickets, ClarifyTicket, ITSMChange, ITSMIncident, JiraTicket } from '@/app/dashboard/globale/types';
import { parseDate } from './parseDate';


export const processFileData = async (
  file: File,
  type: string,
  existingTickets: AllTickets[]
): Promise<{ data: AllTickets[]; errors: string[] }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, cellFormula: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        const processedData: AllTickets[] = [];
        const errors: string[] = [];
        const existingIds = new Set(existingTickets.map((t) => t.id));

        jsonData.forEach((row: any, index: number) => {
          const rowIndex = index + 1;
          try {
            let ticket: AllTickets;

            switch (type) {
              case 'clarify': {
                const clarifyId = row['ID cas']?.toString() || `clarify-${rowIndex}`;
                if (existingIds.has(clarifyId)) {
                  errors.push(`Ligne ${rowIndex}: ID cas ${clarifyId} déjà existant`);
                  return;
                }
                const createdAtResult = parseDate(row['Date de création'], rowIndex, 'Date de création', 'clarify');
                const incidentStartDateResult = parseDate(row['Date de Début d\'Incident'], rowIndex, 'Date de Début d\'Incident', 'clarify');
                const closedAtResult = parseDate(row['Date de clôture du cas'], rowIndex, 'Date de clôture du cas', 'clarify');
                const lastUpdatedAtResult = parseDate(row['Date de dernière mise à jour du cas'], rowIndex, 'Date de dernière mise à jour du cas', 'clarify');

                if (createdAtResult.error) errors.push(createdAtResult.error);
                if (incidentStartDateResult.error) errors.push(incidentStartDateResult.error);
                if (closedAtResult.error) errors.push(closedAtResult.error);
                if (lastUpdatedAtResult.error) errors.push(lastUpdatedAtResult.error);

                ticket = {
                  id: clarifyId,
                  source: 'clarify',
                  client: row['Raison sociale société']?.toString() || 'Client Inconnu',
                  createdAt: createdAtResult.date,
                  status: row['Statut'] || 'Inconnu',
                  severity: row['Sévérité']?.toString() || 'Inconnue',
                  priority: row['Priorité'] || 'Inconnue',
                  incidentStartDate: incidentStartDateResult.date,
                  closedAt: closedAtResult.date,
                  lastUpdatedAt: lastUpdatedAtResult.date,
                  owner: row['Propriétaire'] || 'Non assigné',
                  region: row['Région du site'] || 'Inconnue',
                  city: row['Ville du site'] || 'Inconnue',
                  rawData: row,
                } as ClarifyTicket;
                break;
              }

              case 'jira': {
                const jiraKey = row['Clé'] || row['Key'] || row['Issue key'] || `jira-${rowIndex}`;
                if (existingIds.has(jiraKey)) {
                  errors.push(`Ligne ${rowIndex}: Clé Jira ${jiraKey} déjà existante`);
                  return;
                }
                const createdAtResult = parseDate(row['Création'] || row['Created'], rowIndex, 'Création', 'jira');
                const updatedAtResult = parseDate(row['Mise à jour'] || row['Updated'], rowIndex, 'Mise à jour', 'jira');

                if (createdAtResult.error) errors.push(createdAtResult.error);
                if (updatedAtResult.error) errors.push(updatedAtResult.error);

                ticket = {
                  id: jiraKey.toString(),
                  key: jiraKey.toString(),
                  source: 'jira',
                  client: row['Organisations'] || row['Organizations'] || 'Organisation Inconnue',
                  createdAt: createdAtResult.date,
                  type: row['Type de ticket'] || row['Issue Type'] || 'Inconnu',
                  priority: row['Priorité'] || row['Priority'] || 'Inconnue',
                  status: row['État'] || row['Status'] || 'Inconnu',
                  updatedAt: updatedAtResult.date,
                  assignee: row['Responsable'] || row['Assignee'] || 'Non assigné',
                  reporter: row['Rapporteur'] || row['Reporter'] || 'Inconnu',
                  rawData: row,
                } as JiraTicket;
                break;
              }

              case 'itsm-change': {
                const changeId = row['ID de changement']?.toString() || `change-${rowIndex}`;
                if (existingIds.has(changeId)) {
                  errors.push(`Ligne ${rowIndex}: ID changement ${changeId} déjà existant`);
                  return;
                }
                const createdAtResult = parseDate(row['Date date creation CHG'], rowIndex, 'Date date creation CHG', 'itsm-change');
                const endDateResult = parseDate(row['Date date fin CHG'], rowIndex, 'Date date fin CHG', 'itsm-change');

                if (createdAtResult.error) errors.push(createdAtResult.error);
                if (endDateResult.error) errors.push(endDateResult.error);

                ticket = {
                  id: changeId,
                  source: 'itsm-change',
                  client: row['Lieu société'] || 'Société Inconnue',
                  createdAt: createdAtResult.date,
                  endDate: endDateResult.date,
                  rawData: row,
                } as ITSMChange;
                break;
              }

              case 'itsm-incident': {
                const incidentId = row['Id incident']?.toString() || `incident-${rowIndex}`;
                if (existingIds.has(incidentId)) {
                  errors.push(`Ligne ${rowIndex}: ID incident ${incidentId} déjà existant`);
                  return;
                }
                const createdAtResult = parseDate(row['Date de création'], rowIndex, 'Date de création', 'itsm-incident');
                const resolvedDateResult = parseDate(row['Last Resolved Date'], rowIndex, 'Last Resolved Date', 'itsm-incident');

                if (createdAtResult.error) errors.push(createdAtResult.error);
                if (resolvedDateResult.error) errors.push(resolvedDateResult.error);

                ticket = {
                  id: incidentId,
                  source: 'itsm-incident',
                  client: row['Client+'] || 'Client Inconnu',
                  createdAt: createdAtResult.date,
                  resolvedDate: resolvedDateResult.date,
                  rawData: row,
                } as ITSMIncident;
                break;
              }

              default:
                errors.push(`Ligne ${rowIndex}: Type de fichier non supporté: ${type}`);
                return;
            }

            if (!ticket.client || ticket.client.trim() === '') {
              ticket.client = 'Client Non Défini';
              errors.push(`Ligne ${rowIndex}: Client manquant`);
            }
            if (!ticket.createdAt) {
              errors.push(`Ligne ${rowIndex}: Date de création requise manquante`);
            }

            processedData.push(ticket);
          } catch (error) {
            errors.push(`Ligne ${rowIndex}: ${error instanceof Error ? error.message : 'Erreur de traitement'}`);
          }
        });

        resolve({ data: processedData, errors });
      } catch (error) {
        resolve({
          data: [],
          errors: [`Erreur de lecture du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`],
        });
      }
    };
    reader.readAsArrayBuffer(file);
  });
};