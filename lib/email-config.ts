// lib/email-config.ts
export const EMAIL_CONFIG = {
  // Configure your email recipients here
  OVERDUE_ALERT_RECIPIENTS: [
    'totocarabel@gmail.com',
  ],
  
  // Email settings
  SEND_THRESHOLD: 1, // Send email if >= 1 overdue tickets
  PRIORITY_LEVELS: {
    severe: { hours: 24 },
    critical: { hours: 12 },
    warning: { hours: 4 }
  }
};

// .env.local template (add these to your .env.local file):
/*
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# For Gmail:
# 1. Enable 2-factor authentication
# 2. Generate an App Password
# 3. Use the App Password as SMTP_PASSWORD

# For Outlook/Hotmail:
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_PORT=587

# For custom SMTP:
# SMTP_HOST=mail.yourdomain.com
# SMTP_PORT=587 or 465
# SMTP_SECURE=true (for port 465) or false (for port 587)
*/