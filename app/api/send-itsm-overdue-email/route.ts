// app/api/send-itsm-overdue-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { format, differenceInHours, differenceInDays } from 'date-fns';
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

interface OverdueInfo {
  isOverdue: boolean;
  level: string;
  hoursOverdue: number;
  daysOverdue: number;
}

interface EmailRequest {
  overdueTickets: (ITSMTicket & { overdueInfo: OverdueInfo })[];
  recipients: string[];
  fileName: string;
}

// Configure nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// ITSM-specific overdue logic
const getITSMOverdueInfo = (ticket: ITSMTicket): OverdueInfo => {
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
    "clos", "annulé", "cancelled", "rejected", "rejeté"
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

  // ITSM-specific stagnation detection
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > 48; // 48h for ITSM

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // ITSM Priority-based thresholds
  const getThresholds = (priority: string, type: string) => {
    if (type === "INC") { // Incident thresholds
      switch (priority) {
        case "P1":
          return { warning: 2, critical: 4, severe: 8 }; // Hours
        case "P2":
          return { warning: 8, critical: 24, severe: 48 };
        case "P3":
          return { warning: 24, critical: 72, severe: 168 };
        default:
          return { warning: 48, critical: 168, severe: 336 };
      }
    } else { // CRQ (Change Request) thresholds - generally longer
      switch (priority) {
        case "P1":
          return { warning: 8, critical: 24, severe: 72 };
        case "P2":
          return { warning: 24, critical: 72, severe: 168 };
        case "P3":
          return { warning: 72, critical: 168, severe: 336 };
        default:
          return { warning: 168, critical: 336, severe: 720 };
      }
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

  // Determine overdue level
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

// Generate modern HTML email template for ITSM
const generateITSMEmailHTML = (
  overdueTickets: (ITSMTicket & { overdueInfo: OverdueInfo })[],
  fileName: string
) => {
  const totalOverdue = overdueTickets.length;
  const severeCases = overdueTickets.filter(t => t.overdueInfo.level === 'severe').length;
  const criticalCases = overdueTickets.filter(t => t.overdueInfo.level === 'critical').length;
  const warningSases = overdueTickets.filter(t => t.overdueInfo.level === 'warning').length;
  const stagnantCases = overdueTickets.filter(t => t.overdueInfo.level === 'stagnant').length;

  // Statistics by type
  const incidentCount = overdueTickets.filter(t => t.type === 'INC').length;
  const changeRequestCount = overdueTickets.filter(t => t.type === 'CRQ').length;

  // Statistics by priority
  const p1Count = overdueTickets.filter(t => t.priority === 'P1').length;
  const p2Count = overdueTickets.filter(t => t.priority === 'P2').length;
  const p3Count = overdueTickets.filter(t => t.priority === 'P3').length;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return { bg: '#7c3aed', text: '#ffffff', badge: '#a855f7' };
      case 'critical': return { bg: '#dc2626', text: '#ffffff', badge: '#ef4444' };
      case 'warning': return { bg: '#d97706', text: '#ffffff', badge: '#f59e0b' };
      case 'stagnant': return { bg: '#0891b2', text: '#ffffff', badge: '#06b6d4' };
      default: return { bg: '#6b7280', text: '#ffffff', badge: '#9ca3af' };
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'INC' ? '🚨' : '🔄';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'P1': return '🔥';
      case 'P2': return '⚠️';
      case 'P3': return '📋';
      default: return '📝';
    }
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ITSM Overdue Tickets Alert</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f9fafb;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 32px;
            text-align: center;
            border-radius: 12px 12px 0 0;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .alert-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .content {
            padding: 32px;
        }
        
        .summary-section {
            margin-bottom: 32px;
            padding: 24px;
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-radius: 12px;
            border-left: 4px solid #3b82f6;
        }
        
        .summary-title {
            font-size: 20px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
        }
        
        .tickets-section {
            margin-top: 32px;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #111827;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .ticket-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            transition: transform 0.2s ease;
        }
        
        .ticket-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        
        .ticket-header {
            padding: 16px 20px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .ticket-id {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-weight: 600;
            font-size: 16px;
            color: #111827;
        }
        
        .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-type-inc { background: #fee2e2; color: #991b1b; }
        .badge-type-crq { background: #dbeafe; color: #1e40af; }
        
        .badge-priority-p1 { background: #fee2e2; color: #991b1b; }
        .badge-priority-p2 { background: #fed7aa; color: #9a3412; }
        .badge-priority-p3 { background: #fef3c7; color: #92400e; }
        
        .ticket-body {
            padding: 20px;
        }
        
        .ticket-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .info-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-value {
            font-size: 14px;
            color: #111827;
            font-weight: 500;
        }
        
        .overdue-alert {
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
        }
        
        .footer {
            background: #f9fafb;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        
        .footer-note {
            margin-top: 16px;
            padding: 16px;
            background: #eff6ff;
            border-radius: 8px;
            color: #1e40af;
            font-size: 13px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            
            .header, .content {
                padding: 20px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .ticket-header {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .ticket-info {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="alert-icon">🎯</div>
            <h1>ITSM Overdue Tickets Alert</h1>
            <p>Cloud ITSM - ${totalOverdue} tickets require immediate attention</p>
        </div>
        
        <div class="content">
            <div class="summary-section">
                <h2 class="summary-title">
                    📊 ITSM Dashboard Summary
                </h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${totalOverdue}</div>
                        <div class="stat-label">Total Overdue</div>
                    </div>
                    ${incidentCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${incidentCount}</div>
                        <div class="stat-label">Incidents (INC)</div>
                    </div>
                    ` : ''}
                    ${changeRequestCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #1e40af;">${changeRequestCount}</div>
                        <div class="stat-label">Change Requests (CRQ)</div>
                    </div>
                    ` : ''}
                    ${p1Count > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${p1Count}</div>
                        <div class="stat-label">Priority P1</div>
                    </div>
                    ` : ''}
                    ${severeCases > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #7c3aed;">${severeCases}</div>
                        <div class="stat-label">Severe Cases</div>
                    </div>
                    ` : ''}
                    ${criticalCases > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${criticalCases}</div>
                        <div class="stat-label">Critical Cases</div>
                    </div>
                    ` : ''}
                </div>
                <p style="color: #1e40af; font-weight: 500;">
                    📁 Source File: <strong>${fileName}</strong><br>
                    📅 Generated: ${format(new Date(), 'PPP \'at\' HH:mm', { locale: fr })}
                </p>
            </div>
            
            <div class="tickets-section">
                <h2 class="section-title">🎫 Detailed ITSM Ticket Information</h2>
                
                ${overdueTickets.map(ticket => {
                  const colors = getLevelColor(ticket.overdueInfo.level);
                  return `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-id">${getTypeIcon(ticket.type)} ${ticket.id}</div>
                        <div class="badges">
                            <span class="badge badge-type-${ticket.type.toLowerCase()}">${ticket.type}</span>
                            <span class="badge badge-priority-${ticket.priority.toLowerCase()}">${getPriorityIcon(ticket.priority)} ${ticket.priority}</span>
                        </div>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-info">
                            <div class="info-item">
                                <div class="info-label">👤 Assignee</div>
                                <div class="info-value">${ticket.assignee}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🏢 Company</div>
                                <div class="info-value">${ticket.company}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">📅 Created</div>
                                <div class="info-value">${format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🔄 Last Updated</div>
                                <div class="info-value">${format(ticket.lastUpdatedAt, 'dd/MM/yyyy HH:mm')}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">⚡ Status</div>
                                <div class="info-value">${ticket.status}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🎯 Type</div>
                                <div class="info-value">${ticket.type === 'INC' ? 'Incident' : 'Change Request'}</div>
                            </div>
                        </div>
                        <div class="overdue-alert" style="background-color: ${colors.bg}20; color: ${colors.bg}; border-left: 4px solid ${colors.bg};">
                            <span style="font-size: 20px;">${getTypeIcon(ticket.type)}</span>
                            <div>
                                <strong>${ticket.overdueInfo.level.toUpperCase()}</strong> - 
                                ${ticket.overdueInfo.daysOverdue > 0 
                                  ? `${ticket.overdueInfo.daysOverdue} days overdue`
                                  : `${ticket.overdueInfo.hoursOverdue} hours overdue`
                                }
                            </div>
                        </div>
                    </div>
                </div>
                `;
                }).join('')}
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Cloud ITSM Ticket Management System</strong></p>
            <p>This is an automated alert generated from your ITSM data upload.</p>
            <div class="footer-note">
                💡 <strong>Action Required:</strong> Please review these overdue ITSM tickets and take appropriate action to resolve them promptly.<br>
                🚨 <strong>Priority Focus:</strong> P1 incidents require immediate attention within SLA timeframes.
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();
    const { overdueTickets, recipients, fileName } = body;

    if (!overdueTickets?.length) {
      return NextResponse.json(
        { error: 'No overdue ITSM tickets provided' },
        { status: 400 }
      );
    }

    if (!recipients?.length) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      );
    }

    // Validate environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return NextResponse.json(
        { error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    const transporter = createTransporter();

    // Generate email content
    const htmlContent = generateITSMEmailHTML(overdueTickets, fileName);
    
    // Count P1 incidents for subject urgency
    const p1Incidents = overdueTickets.filter(t => t.priority === 'P1' && t.type === 'INC').length;
    const urgencyLevel = p1Incidents > 0 ? '🔥 CRITICAL' : '🚨 URGENT';
    
    const mailOptions = {
      from: {
        name: 'Cloud ITSM Alert System',
        address: process.env.SMTP_USER!,
      },
      to: recipients,
      subject: `${urgencyLevel}: ${overdueTickets.length} Overdue ITSM Tickets${p1Incidents > 0 ? ` (${p1Incidents} P1 Incidents)` : ''} - Action Required`,
      html: htmlContent,
      priority: 'high' as const,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `ITSM email sent successfully to ${recipients.length} recipient(s)`,
      messageId: info.messageId,
      overdueCount: overdueTickets.length,
      p1Count: p1Incidents,
    });

  } catch (error) {
    console.error('ITSM email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send ITSM email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}