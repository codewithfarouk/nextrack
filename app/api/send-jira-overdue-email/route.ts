// app/api/send-jira-overdue-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { format, differenceInHours, differenceInDays } from 'date-fns';
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

interface EmailRequest {
  overdueTickets: (JiraTicket & { overdueInfo: OverdueInfo })[];
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

// JIRA-specific overdue logic
const getJiraOverdueInfo = (ticket: JiraTicket): OverdueInfo => {
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
  const normalizedStatus = ticket.status?.toLowerCase() || "";
  const isClosedStatus = [
    "fermé", "closed", "résolu", "resolved", "terminé", "done", "completed",
    "clos", "annulé", "cancelled", "rejected", "rejeté", "delivered", "déployé"
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
  const hoursSinceUpdated = differenceInHours(now, ticket.updatedAt);
  const daysSinceCreated = differenceInDays(now, ticket.createdAt);
  const daysSinceUpdated = differenceInDays(now, ticket.updatedAt);

  // JIRA-specific stagnation detection
  const hoursBetweenCreationAndUpdate = differenceInHours(ticket.updatedAt, ticket.createdAt);
  const isStagnant = hoursBetweenCreationAndUpdate > 72; // 72h for JIRA tickets

  const maxHours = Math.max(hoursSinceCreated, hoursSinceUpdated);
  const maxDays = Math.max(daysSinceCreated, daysSinceUpdated);

  // JIRA Priority and Type-based thresholds
  const getThresholds = (priority: string, type: string) => {
    // Different thresholds based on ticket type
    const isHighPriorityType = ["bug", "incident", "story", "epic"].some(t => 
      type.toLowerCase().includes(t)
    );
    
    const normalizedPriority = priority.toLowerCase();
    
    if (isHighPriorityType) {
      // Stricter thresholds for important ticket types
      switch (normalizedPriority) {
        case "highest":
        case "critical":
        case "très haute":
          return { warning: 4, critical: 12, severe: 24 }; // Hours
        case "high":
        case "haute":
          return { warning: 12, critical: 24, severe: 72 };
        case "medium":
        case "moyenne":
          return { warning: 24, critical: 72, severe: 168 };
        case "low":
        case "basse":
          return { warning: 72, critical: 168, severe: 336 };
        default:
          return { warning: 48, critical: 120, severe: 240 };
      }
    } else {
      // More relaxed thresholds for regular tickets
      switch (normalizedPriority) {
        case "highest":
        case "critical":
        case "très haute":
          return { warning: 8, critical: 24, severe: 48 };
        case "high":
        case "haute":
          return { warning: 24, critical: 48, severe: 120 };
        case "medium":
        case "moyenne":
          return { warning: 48, critical: 120, severe: 240 };
        case "low":
        case "basse":
          return { warning: 120, critical: 240, severe: 480 };
        default:
          return { warning: 72, critical: 168, severe: 336 };
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

// Generate modern HTML email template for JIRA
const generateJiraEmailHTML = (
  overdueTickets: (JiraTicket & { overdueInfo: OverdueInfo })[],
  fileName: string
) => {
  const totalOverdue = overdueTickets.length;
  const severeCases = overdueTickets.filter(t => t.overdueInfo.level === 'severe').length;
  const criticalCases = overdueTickets.filter(t => t.overdueInfo.level === 'critical').length;
  const warningSases = overdueTickets.filter(t => t.overdueInfo.level === 'warning').length;
  const stagnantCases = overdueTickets.filter(t => t.overdueInfo.level === 'stagnant').length;

  // Statistics by type
  const bugCount = overdueTickets.filter(t => t.type.toLowerCase().includes('bug')).length;
  const storyCount = overdueTickets.filter(t => t.type.toLowerCase().includes('story')).length;
  const taskCount = overdueTickets.filter(t => t.type.toLowerCase().includes('task')).length;

  // Statistics by priority
  const criticalPriorityCount = overdueTickets.filter(t => 
    ['highest', 'critical', 'très haute'].includes(t.priority.toLowerCase())
  ).length;
  const highPriorityCount = overdueTickets.filter(t => 
    ['high', 'haute'].includes(t.priority.toLowerCase())
  ).length;

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
    const lowerType = type.toLowerCase();
    if (lowerType.includes('bug')) return '🐛';
    if (lowerType.includes('story')) return '📖';
    if (lowerType.includes('epic')) return '🏔️';
    if (lowerType.includes('task')) return '✅';
    if (lowerType.includes('sub-task')) return '🔗';
    return '🎫';
  };

  const getPriorityIcon = (priority: string) => {
    const lowerPriority = priority.toLowerCase();
    if (['highest', 'critical', 'très haute'].includes(lowerPriority)) return '🔥';
    if (['high', 'haute'].includes(lowerPriority)) return '⚠️';
    if (['medium', 'moyenne'].includes(lowerPriority)) return '📋';
    if (['low', 'basse'].includes(lowerPriority)) return '📝';
    return '❓';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JIRA Overdue Tickets Alert</title>
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
            background: linear-gradient(135deg, #0052cc 0%, #0065ff 100%);
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
            background: linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%);
            border-radius: 12px;
            border-left: 4px solid #0052cc;
        }
        
        .summary-title {
            font-size: 20px;
            font-weight: 600;
            color: #0052cc;
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
        
        .ticket-key {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-weight: 600;
            font-size: 16px;
            color: #0052cc;
            text-decoration: none;
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
        
        .badge-priority-highest,
        .badge-priority-critical { background: #fee2e2; color: #991b1b; }
        .badge-priority-high { background: #fed7aa; color: #9a3412; }
        .badge-priority-medium { background: #fef3c7; color: #92400e; }
        .badge-priority-low { background: #f3f4f6; color: #374151; }
        
        .badge-type-bug { background: #fef2f2; color: #dc2626; }
        .badge-type-story { background: #f0f9ff; color: #0369a1; }
        .badge-type-task { background: #f0fdf4; color: #166534; }
        .badge-type-epic { background: #faf5ff; color: #7c3aed; }
        
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
            <div class="alert-icon">🎫</div>
            <h1>JIRA Overdue Tickets Alert</h1>
            <p>JIRA Service Desk - ${totalOverdue} tickets require immediate attention</p>
        </div>
        
        <div class="content">
            <div class="summary-section">
                <h2 class="summary-title">
                    📊 JIRA Dashboard Summary
                </h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${totalOverdue}</div>
                        <div class="stat-label">Total Overdue</div>
                    </div>
                    ${criticalPriorityCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${criticalPriorityCount}</div>
                        <div class="stat-label">Critical Priority</div>
                    </div>
                    ` : ''}
                    ${bugCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${bugCount}</div>
                        <div class="stat-label">Bugs</div>
                    </div>
                    ` : ''}
                    ${storyCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #0052cc;">${storyCount}</div>
                        <div class="stat-label">Stories</div>
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
                <p style="color: #0052cc; font-weight: 500;">
                    📁 Source File: <strong>${fileName}</strong><br>
                    📅 Generated: ${format(new Date(), 'PPP \'at\' HH:mm', { locale: fr })}
                </p>
            </div>
            
            <div class="tickets-section">
                <h2 class="section-title">🎫 Detailed JIRA Ticket Information</h2>
                
                ${overdueTickets.map(ticket => {
                  const colors = getLevelColor(ticket.overdueInfo.level);
                  const typeClass = ticket.type.toLowerCase().replace(/[^a-z]/g, '');
                  const priorityClass = ticket.priority.toLowerCase().replace(/[^a-z]/g, '');
                  
                  return `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-key">${getTypeIcon(ticket.type)} ${ticket.key}</div>
                        <div class="badges">
                            <span class="badge badge-type-${typeClass}">${ticket.type}</span>
                            <span class="badge badge-priority-${priorityClass}">${getPriorityIcon(ticket.priority)} ${ticket.priority}</span>
                        </div>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-info">
                            <div class="info-item">
                                <div class="info-label">👤 Assignee</div>
                                <div class="info-value">${ticket.assignee}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">📝 Reporter</div>
                                <div class="info-value">${ticket.reporter}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">📅 Created</div>
                                <div class="info-value">${format(ticket.createdAt, 'dd/MM/yyyy HH:mm')}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🔄 Last Updated</div>
                                <div class="info-value">${format(ticket.updatedAt, 'dd/MM/yyyy HH:mm')}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">⚡ Status</div>
                                <div class="info-value">${ticket.status}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🎯 Type</div>
                                <div class="info-value">${ticket.type}</div>
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
            <p><strong>JIRA Service Desk Management System</strong></p>
            <p>This is an automated alert generated from your JIRA data upload.</p>
            <div class="footer-note">
                💡 <strong>Action Required:</strong> Please review these overdue JIRA tickets and take appropriate action to resolve them promptly.<br>
                🔥 <strong>Priority Focus:</strong> Critical and High priority items require immediate attention.
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
        { error: 'No overdue JIRA tickets provided' },
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
    const htmlContent = generateJiraEmailHTML(overdueTickets, fileName);
    
    // Count critical priority tickets for subject urgency
    const criticalTickets = overdueTickets.filter(t => 
      ['highest', 'critical', 'très haute'].includes(t.priority.toLowerCase())
    ).length;
    const urgencyLevel = criticalTickets > 0 ? '🔥 CRITICAL' : '🚨 URGENT';
    
    const mailOptions = {
      from: {
        name: 'JIRA Alert System',
        address: process.env.SMTP_USER!,
      },
      to: recipients,
      subject: `${urgencyLevel}: ${overdueTickets.length} Overdue JIRA Tickets${criticalTickets > 0 ? ` (${criticalTickets} Critical Priority)` : ''} - Action Required`,
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
      message: `JIRA email sent successfully to ${recipients.length} recipient(s)`,
      messageId: info.messageId,
      overdueCount: overdueTickets.length,
      criticalCount: criticalTickets,
    });

  } catch (error) {
    console.error('JIRA email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send JIRA email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}