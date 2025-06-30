// app/api/send-overdue-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendOverdueTicketsEmail, verifyEmailConfig } from '@/lib/email';

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

export async function POST(request: NextRequest) {
  try {
    // Verify email configuration first
    const isEmailConfigValid = await verifyEmailConfig();
    if (!isEmailConfigValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email configuration verification failed. Please check SMTP settings.' 
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tickets } = body;

    if (!tickets || !Array.isArray(tickets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tickets data provided' },
        { status: 400 }
      );
    }

    // Convert string dates back to Date objects
    const processedTickets: ITSMTicket[] = tickets.map((ticket: any) => ({
      ...ticket,
      createdAt: new Date(ticket.createdAt),
      lastUpdatedAt: new Date(ticket.lastUpdatedAt)
    }));

    // Send email notification
    const emailSent = await sendOverdueTicketsEmail(processedTickets);

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Overdue tickets email notification sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send email notification' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while sending email notification' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to test email configuration
export async function GET() {
  try {
    const isEmailConfigValid = await verifyEmailConfig();
    
    return NextResponse.json({
      success: true,
      emailConfigValid: isEmailConfigValid,
      message: isEmailConfigValid 
        ? 'Email configuration is valid' 
        : 'Email configuration verification failed'
    });
  } catch (error) {
    console.error('Email config test error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test email configuration' },
      { status: 500 }
    );
  }
}