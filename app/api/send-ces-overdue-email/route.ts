// app/api/send-ces-overdue-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { format, differenceInHours, differenceInDays } from 'date-fns';
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

interface EmailRequest {
  overdueTickets: (ClarifyTicket & { overdueInfo: OverdueInfo })[];
  recipients: string[];
  fileName: string;
  teamStats: {
    totalTickets: number;
    byOwner: Record<string, { total: number; overdue: number }>;
  };
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

// CES-specific overdue logic
const getCESOverdueInfo = (ticket: ClarifyTicket): OverdueInfo => {
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
    "fermé", "closed", "clot", "résolu", "resolved", "terminé", "completed",
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

  // CES-specific stagnation detection
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.lastUpdatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > 24; // 24h for CES team

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // CES Severity-based thresholds (more aggressive than regular Clarify)
  const getThresholds = (severity: string) => {
    switch (severity) {
      case "1":
        return { warning: 2, critical: 6, severe: 12 }; // S1: 2h warning, 6h critical, 12h severe
      case "2":
        return { warning: 4, critical: 12, severe: 24 }; // S2: 4h warning, 12h critical, 24h severe
      case "3":
        return { warning: 8, critical: 24, severe: 48 }; // S3: 8h warning, 24h critical, 48h severe
      default:
        return { warning: 12, critical: 48, severe: 96 }; // Default: 12h warning, 48h critical, 96h severe
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

// Generate modern HTML email template for CES
const generateCESEmailHTML = (
  overdueTickets: (ClarifyTicket & { overdueInfo: OverdueInfo })[],
  fileName: string,
  teamStats: { totalTickets: number; byOwner: Record<string, { total: number; overdue: number }> }
) => {
  const totalOverdue = overdueTickets.length;
  const severeCases = overdueTickets.filter(t => t.overdueInfo.level === 'severe').length;
  const criticalCases = overdueTickets.filter(t => t.overdueInfo.level === 'critical').length;
  const warningSases = overdueTickets.filter(t => t.overdueInfo.level === 'warning').length;
  const stagnantCases = overdueTickets.filter(t => t.overdueInfo.level === 'stagnant').length;

  // CES Team-specific statistics
  const s1Count = overdueTickets.filter(t => t.severity === '1').length;
  const s2Count = overdueTickets.filter(t => t.severity === '2').length;
  const s3Count = overdueTickets.filter(t => t.severity === '3').length;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return { bg: '#7c3aed', text: '#ffffff', badge: '#a855f7' };
      case 'critical': return { bg: '#dc2626', text: '#ffffff', badge: '#ef4444' };
      case 'warning': return { bg: '#d97706', text: '#ffffff', badge: '#f59e0b' };
      case 'stagnant': return { bg: '#0891b2', text: '#ffffff', badge: '#06b6d4' };
      default: return { bg: '#6b7280', text: '#ffffff', badge: '#9ca3af' };
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case '1': return '🚨';
      case '2': return '⚠️';
      case '3': return '📋';
      default: return '📝';
    }
  };

  const getOwnerIcon = (owner: string) => {
    const ownerIcons: Record<string, string> = {
      'Nada BELMAATI': '👩‍💻',
      'Mohamed AZFAR AZAMI': '👨‍💻',
      'Youssef RAYOUD': '👨‍🔧',
      'Chafik ZARHOUR': '👨‍💼'
    };
    return ownerIcons[owner] || '👤';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CES Team - Clarify Overdue Tickets Alert</title>
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
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border-radius: 12px;
            border-left: 4px solid #059669;
        }
        
        .summary-title {
            font-size: 20px;
            font-weight: 600;
            color: #047857;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
        
        .team-section {
            margin-bottom: 24px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .team-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .team-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        
        .team-member {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .member-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .member-stats {
            font-size: 14px;
            color: #6b7280;
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
        
        .badge-severity-1 { background: #fee2e2; color: #991b1b; }
        .badge-severity-2 { background: #fed7aa; color: #9a3412; }
        .badge-severity-3 { background: #fef3c7; color: #92400e; }
        
        .badge-priority-haute { background: #fee2e2; color: #991b1b; }
        .badge-priority-moyenne { background: #fed7aa; color: #9a3412; }
        .badge-priority-basse { background: #dbeafe; color: #1e40af; }
        
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
            <div class="alert-icon">🛠️</div>
            <h1>CES Team - Clarify Alert</h1>
            <p>Customer Expert Support - ${totalOverdue} tickets require attention</p>
        </div>
        
        <div class="content">
            <div class="summary-section">
                <h2 class="summary-title">
                    📊 CES Team Dashboard Summary
                </h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${totalOverdue}</div>
                        <div class="stat-label">Total Overdue</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #059669;">${teamStats.totalTickets}</div>
                        <div class="stat-label">Total CES Tickets</div>
                    </div>
                    ${s1Count > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${s1Count}</div>
                        <div class="stat-label">S1 Overdue</div>
                    </div>
                    ` : ''}
                    ${s2Count > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #d97706;">${s2Count}</div>
                        <div class="stat-label">S2 Overdue</div>
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
                <p style="color: #047857; font-weight: 500;">
                    📁 Source File: <strong>${fileName}</strong><br>
                    📅 Generated: ${format(new Date(), 'PPP \'at\' HH:mm', { locale: fr })}
                </p>
            </div>

            <div class="team-section">
                <h3 class="team-title">
                    👥 CES Team Workload Distribution
                </h3>
                <div class="team-stats">
                    ${Object.entries(teamStats.byOwner).map(([owner, stats]) => `
                    <div class="team-member">
                        <div class="member-info">
                            <span style="font-size: 18px;">${getOwnerIcon(owner)}</span>
                            <strong>${owner}</strong>
                        </div>
                        <div class="member-stats">
                            <span style="color: ${stats.overdue > 0 ? '#dc2626' : '#059669'}; font-weight: 600;">
                                ${stats.overdue}/${stats.total}
                            </span>
                            <span style="font-size: 12px; color: #6b7280;">overdue</span>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="tickets-section">
                <h2 class="section-title">🎫 Detailed CES Ticket Information</h2>
                
                ${overdueTickets.map(ticket => {
                  const colors = getLevelColor(ticket.overdueInfo.level);
                  return `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-id">${getSeverityIcon(ticket.severity)} ${ticket.id}</div>
                        <div class="badges">
                            <span class="badge badge-severity-${ticket.severity}">S${ticket.severity}</span>
                            <span class="badge badge-priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                        </div>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-info">
                            <div class="info-item">
                                <div class="info-label">👤 CES Owner</div>
                                <div class="info-value">${getOwnerIcon(ticket.owner)} ${ticket.owner}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🏢 Company</div>
                                <div class="info-value">${ticket.company}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">📍 Location</div>
                                <div class="info-value">${ticket.city}, ${ticket.region}</div>
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
                        </div>
                        <div class="overdue-alert" style="background-color: ${colors.bg}20; color: ${colors.bg}; border-left: 4px solid ${colors.bg};">
                            <span style="font-size: 20px;">${getSeverityIcon(ticket.severity)}</span>
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
            <p><strong>CES Team - Customer Expert Support</strong></p>
            <p>This is an automated alert generated from your Clarify data upload.</p>
            <div class="footer-note">
                💡 <strong>Action Required:</strong> Please review these overdue Clarify tickets and take appropriate action to resolve them promptly.<br>
                🚨 <strong>CES Priority:</strong> S1 and S2 tickets require immediate attention within CES SLA timeframes.
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
    const { overdueTickets, recipients, fileName, teamStats } = body;

    if (!overdueTickets?.length) {
      return NextResponse.json(
        { error: 'No overdue CES tickets provided' },
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
    const htmlContent = generateCESEmailHTML(overdueTickets, fileName, teamStats);
    
    // Count S1 tickets for subject urgency
    const s1Count = overdueTickets.filter(t => t.severity === '1').length;
    const urgencyLevel = s1Count > 0 ? '🚨 CRITICAL' : '⚠️ URGENT';
    
    const mailOptions = {
      from: {
        name: 'CES Team - Clarify Alert System',
        address: process.env.SMTP_USER!,
      },
      to: recipients,
      subject: `${urgencyLevel}: CES Team - ${overdueTickets.length} Overdue Clarify Tickets${s1Count > 0 ? ` (${s1Count} S1 Critical)` : ''} - Action Required`,
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
      message: `CES email sent successfully to ${recipients.length} recipient(s)`,
      messageId: info.messageId,
      overdueCount: overdueTickets.length,
      s1Count: s1Count,
    });

  } catch (error) {
    console.error('CES email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send CES email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}