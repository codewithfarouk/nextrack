// lib/email.ts
import nodemailer from 'nodemailer';
import { format, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface EmailStats {
  totalOverdue: number;
  criticalOverdue: number;
  byPriority: Record<string, number>;
  byAssignee: Record<string, number>;
  oldestTicket: {
    id: string;
    hoursOverdue: number;
  } | null;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Check if ticket is overdue
export const isTicketOverdue = (ticket: ITSMTicket): boolean => {
  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = ["fermé", "clos", "résolu", "closed", "resolved", "clot"].includes(normalizedStatus);
  
  if (isClosedStatus) {
    return false;
  }

  const now = new Date();
  return (
    differenceInHours(now, ticket.createdAt) > 24 ||
    differenceInHours(now, ticket.lastUpdatedAt) > 24
  );
};

// Calculate stats for overdue tickets
const calculateOverdueStats = (overdueTickets: ITSMTicket[]): EmailStats => {
  const stats: EmailStats = {
    totalOverdue: overdueTickets.length,
    criticalOverdue: overdueTickets.filter(t => t.priority === 'P1').length,
    byPriority: {},
    byAssignee: {},
    oldestTicket: null
  };

  // Count by priority
  overdueTickets.forEach(ticket => {
    stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
    stats.byAssignee[ticket.assignee] = (stats.byAssignee[ticket.assignee] || 0) + 1;
  });

  // Find oldest ticket
  if (overdueTickets.length > 0) {
    const oldest = overdueTickets.reduce((prev, current) => {
      return prev.createdAt < current.createdAt ? prev : current;
    });
    
    stats.oldestTicket = {
      id: oldest.id,
      hoursOverdue: Math.max(
        differenceInHours(new Date(), oldest.createdAt),
        differenceInHours(new Date(), oldest.lastUpdatedAt)
      )
    };
  }

  return stats;
};

// Generate modern HTML email template
const generateEmailTemplate = (overdueTickets: ITSMTicket[], stats: EmailStats): string => {
  const currentDate = format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr });
  
  const ticketRows = overdueTickets.map(ticket => {
    const hoursOverdue = Math.max(
      differenceInHours(new Date(), ticket.createdAt),
      differenceInHours(new Date(), ticket.lastUpdatedAt)
    );
    
    const priorityColor = ticket.priority === 'P1' ? '#ef4444' : 
                         ticket.priority === 'P2' ? '#f97316' : '#3b82f6';
    
    const urgencyBadge = hoursOverdue > 72 ? 
      '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">CRITIQUE</span>' :
      hoursOverdue > 48 ? 
      '<span style="background: #ea580c; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">URGENT</span>' :
      '<span style="background: #d97706; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">ATTENTION</span>';

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 12px; font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937;">
          ${ticket.id}
        </td>
        <td style="padding: 16px 12px; color: #374151;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">
              ${ticket.priority}
            </span>
            ${urgencyBadge}
          </div>
        </td>
        <td style="padding: 16px 12px; color: #374151; font-weight: 500;">
          ${ticket.assignee.split(' ')[0]}
        </td>
        <td style="padding: 16px 12px; color: #6b7280; font-size: 14px;">
          ${format(ticket.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
        </td>
        <td style="padding: 16px 12px; color: #6b7280; font-size: 14px;">
          ${format(ticket.lastUpdatedAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
        </td>
        <td style="padding: 16px 12px; color: ${hoursOverdue > 72 ? '#dc2626' : hoursOverdue > 48 ? '#ea580c' : '#d97706'}; font-weight: bold;">
          ${hoursOverdue}h
        </td>
        <td style="padding: 16px 12px; color: #6b7280; font-size: 14px;">
          ${ticket.company}
        </td>
      </tr>
    `;
  }).join('');

  const priorityStats = Object.entries(stats.byPriority)
    .map(([priority, count]) => {
      const color = priority === 'P1' ? '#ef4444' : priority === 'P2' ? '#f97316' : '#3b82f6';
      return `
        <div style="background: linear-gradient(135deg, ${color}15, ${color}25); border: 1px solid ${color}40; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: ${color}; font-size: 28px; font-weight: bold; margin-bottom: 4px;">${count}</div>
          <div style="color: #374151; font-size: 14px; font-weight: 600;">${priority}</div>
        </div>
      `;
    }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🚨 Alerte Tickets en Retard - CES Team</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 32px 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 8px;">🚨</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">ALERTE TICKETS EN RETARD</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Équipe CES - ${currentDate}</p>
        </div>

        <!-- Alert Summary -->
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-left: 4px solid #f59e0b; padding: 20px 24px; margin: 0;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 24px;">⚠️</span>
            <h2 style="margin: 0; color: #92400e; font-size: 20px; font-weight: bold;">
              ${stats.totalOverdue} ticket${stats.totalOverdue > 1 ? 's' : ''} en retard détecté${stats.totalOverdue > 1 ? 's' : ''}
            </h2>
          </div>
          ${stats.criticalOverdue > 0 ? `
            <div style="color: #dc2626; font-weight: 600; font-size: 16px;">
              🔥 ${stats.criticalOverdue} ticket${stats.criticalOverdue > 1 ? 's' : ''} critique${stats.criticalOverdue > 1 ? 's' : ''} (P1)
            </div>
          ` : ''}
          ${stats.oldestTicket ? `
            <div style="color: #92400e; font-size: 14px; margin-top: 8px;">
              📅 Ticket le plus ancien: <strong>${stats.oldestTicket.id}</strong> (${stats.oldestTicket.hoursOverdue}h de retard)
            </div>
          ` : ''}
        </div>

        <!-- Statistics -->
        <div style="padding: 24px;">
          <h3 style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            📊 Répartition par Priorité
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; margin-bottom: 32px;">
            ${priorityStats}
          </div>
        </div>

        <!-- Tickets Table -->
        <div style="padding: 0 24px 24px;">
          <h3 style="color: #1f2937; font-size: 18px; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            📋 Détail des Tickets en Retard
          </h3>
          <div style="overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 12px;">
            <table style="width: 100%; border-collapse: collapse; background: white;">
              <thead>
                <tr style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">ID Ticket</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Priorité</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Assigné</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Création</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Dernière MAJ</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Retard</th>
                  <th style="padding: 16px 12px; text-align: left; color: #374151; font-weight: bold; font-size: 14px;">Société</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Action Required -->
        <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border: 1px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 0 24px 24px;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            🎯 Actions Requises
          </h3>
          <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Vérifier le statut de chaque ticket en retard</li>
            <li>Mettre à jour les tickets avec les dernières informations</li>
            <li>Prioriser les tickets P1 critiques</li>
            <li>Contacter les clients si nécessaire</li>
            <li>Documenter les actions entreprises</li>
          </ul>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 20px 24px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0;">
            <strong>NexTrack ITSM Dashboard</strong> - Système d'alerte automatique
          </p>
          <p style="margin: 0; font-size: 12px;">
            📧 Envoyé automatiquement à ${currentDate} | 
            💻 Généré par le système de monitoring CES
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

// Send overdue tickets email
export const sendOverdueTicketsEmail = async (tickets: ITSMTicket[]): Promise<boolean> => {
  try {
    // Filter overdue tickets
    const overdueTickets = tickets.filter(isTicketOverdue);
    
    if (overdueTickets.length === 0) {
      console.log('No overdue tickets found, skipping email notification');
      return true;
    }

    // Calculate stats
    const stats = calculateOverdueStats(overdueTickets);
    
    // Generate email content
    const htmlContent = generateEmailTemplate(overdueTickets, stats);
    
    // Email options
    const mailOptions = {
      from: `"🚨 NexTrack ITSM Alert" <${process.env.SMTP_USER}>`,
      to: 'totocarabel@gmail.com',
      subject: `🚨 URGENT: ${stats.totalOverdue} ticket${stats.totalOverdue > 1 ? 's' : ''} en retard - CES Team ${format(new Date(), 'dd/MM/yyyy')}`,
      html: htmlContent,
      priority: 'high' as const,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Overdue tickets email sent successfully:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('Error sending overdue tickets email:', error);
    return false;
  }
};

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
};