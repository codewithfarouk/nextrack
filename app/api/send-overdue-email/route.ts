// app/api/send-overdue-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';
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

// Generate modern HTML email template
const generateEmailHTML = (
  overdueTickets: (ClarifyTicket & { overdueInfo: OverdueInfo })[],
  fileName: string
) => {
  const totalOverdue = overdueTickets.length;
  const severeCases = overdueTickets.filter(t => t.overdueInfo.level === 'severe').length;
  const criticalCases = overdueTickets.filter(t => t.overdueInfo.level === 'critical').length;
  const warningSases = overdueTickets.filter(t => t.overdueInfo.level === 'warning').length;
  const stagnantCases = overdueTickets.filter(t => t.overdueInfo.level === 'stagnant').length;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'severe': return { bg: '#7c3aed', text: '#ffffff', badge: '#a855f7' };
      case 'critical': return { bg: '#dc2626', text: '#ffffff', badge: '#ef4444' };
      case 'warning': return { bg: '#d97706', text: '#ffffff', badge: '#f59e0b' };
      case 'stagnant': return { bg: '#0891b2', text: '#ffffff', badge: '#06b6d4' };
      default: return { bg: '#6b7280', text: '#ffffff', badge: '#9ca3af' };
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level) {
      case 'severe': return '🚨';
      case 'critical': return '⚠️';
      case 'warning': return '⏰';
      case 'stagnant': return '🔄';
      default: return '📋';
    }
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Overdue Tickets Alert</title>
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
            background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
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
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 12px;
            border-left: 4px solid #f59e0b;
        }
        
        .summary-title {
            font-size: 20px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
            <div class="alert-icon">🚨</div>
            <h1>Overdue Tickets Alert</h1>
            <p>Critical attention required for ${totalOverdue} overdue tickets</p>
        </div>
        
        <div class="content">
            <div class="summary-section">
                <h2 class="summary-title">
                    📊 Summary Report
                </h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #dc2626;">${totalOverdue}</div>
                        <div class="stat-label">Total Overdue</div>
                    </div>
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
                    ${warningSases > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #d97706;">${warningSases}</div>
                        <div class="stat-label">Warning Cases</div>
                    </div>
                    ` : ''}
                    ${stagnantCases > 0 ? `
                    <div class="stat-card">
                        <div class="stat-number" style="color: #0891b2;">${stagnantCases}</div>
                        <div class="stat-label">Stagnant Cases</div>
                    </div>
                    ` : ''}
                </div>
                <p style="color: #92400e; font-weight: 500;">
                    📁 Source File: <strong>${fileName}</strong><br>
                    📅 Generated: ${format(new Date(), 'PPP \'at\' HH:mm', { locale: fr })}
                </p>
            </div>
            
            <div class="tickets-section">
                <h2 class="section-title">📋 Detailed Ticket Information</h2>
                
                ${overdueTickets.map(ticket => {
                  const colors = getLevelColor(ticket.overdueInfo.level);
                  return `
                <div class="ticket-card">
                    <div class="ticket-header">
                        <div class="ticket-id">${ticket.id}</div>
                        <div class="badges">
                            <span class="badge badge-severity-${ticket.severity}">S${ticket.severity}</span>
                            <span class="badge badge-priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                        </div>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-info">
                            <div class="info-item">
                                <div class="info-label">👤 Owner</div>
                                <div class="info-value">${ticket.owner}</div>
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
                            <span style="font-size: 20px;">${getSeverityIcon(ticket.overdueInfo.level)}</span>
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
            <p><strong>Clarify Ticket Management System</strong></p>
            <p>This is an automated alert generated from your ticket upload.</p>
            <div class="footer-note">
                💡 <strong>Action Required:</strong> Please review these overdue tickets and take appropriate action to resolve them promptly.
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
        { error: 'No overdue tickets provided' },
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
    const htmlContent = generateEmailHTML(overdueTickets, fileName);
    
    const mailOptions = {
      from: {
        name: 'Clarify Ticket System',
        address: process.env.SMTP_USER!,
      },
      to: recipients,
      subject: `🚨 URGENT: ${overdueTickets.length} Overdue Tickets Detected - Action Required`,
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
      message: `Email sent successfully to ${recipients.length} recipient(s)`,
      messageId: info.messageId,
      overdueCount: overdueTickets.length,
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}