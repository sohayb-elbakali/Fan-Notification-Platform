require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;
const NOTIFY_TOKEN = process.env.NOTIFY_TOKEN || 'dev-secret-token';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Email Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'CAN 2025 <noreply@can2025.com>';

// Create email transporter
let transporter = null;
if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
    console.log('📧 Email transporter configured');
} else {
    console.log('⚠️ Email not configured (SMTP_USER/SMTP_PASS missing)');
}

// Middleware
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    if (LOG_LEVEL === 'debug') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CAN 2025 Notify Service',
        emailConfigured: !!transporter,
        timestamp: new Date().toISOString()
    });
});

// Send email function
async function sendEmail(to, subject, message, eventType) {
    if (!transporter) {
        console.log('📧 Email skipped (not configured)');
        return { success: false, reason: 'Email not configured' };
    }

    // Create HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #009639 0%, #CE1126 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header .emoji { font-size: 40px; }
            .content { padding: 30px; }
            .event-badge { display: inline-block; background: #CE1126; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-bottom: 15px; }
            .message { font-size: 18px; color: #333; line-height: 1.6; padding: 20px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #009639; }
            .footer { background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px; }
            .footer a { color: #CE1126; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="emoji">⚽🏆</div>
                <h1>CAN 2025</h1>
                <p>Coupe d'Afrique des Nations - Morocco</p>
            </div>
            <div class="content">
                <span class="event-badge">${eventType || 'NOTIFICATION'}</span>
                <div class="message">
                    ${message}
                </div>
            </div>
            <div class="footer">
                <p>Vous recevez cet email car vous êtes inscrit aux notifications CAN 2025.</p>
                <p>© 2025 CAN 2025 Fan Notification Platform</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: to,
            subject: `🏆 CAN 2025 - ${subject}`,
            text: message,
            html: htmlContent
        });
        console.log(`✅ Email sent to ${to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ Email failed to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Notify endpoint - receives notifications from Lambda
app.post('/notify', async (req, res) => {
    try {
        // Validate token
        const token = req.headers['x-notify-token'];
        if (token !== NOTIFY_TOKEN) {
            console.error('Invalid X-Notify-Token received');
            return res.status(401).json({ error: 'Invalid X-Notify-Token' });
        }

        // Extract payload
        const {
            channel,
            recipients,
            message,
            eventType,
            timestamp,
            metadata
        } = req.body;

        // Validate required fields
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Recipients array is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Log the notification
        console.log('═══════════════════════════════════════════════════');
        console.log('📱 NOTIFICATION RECEIVED');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Channel: ${channel || 'email'}`);
        console.log(`Event Type: ${eventType}`);
        console.log(`Timestamp: ${timestamp}`);
        console.log(`Message: ${message}`);
        console.log(`Recipients (${recipients.length}):`)
        recipients.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
        if (metadata) {
            console.log('Metadata:', JSON.stringify(metadata, null, 2));
        }
        console.log('═══════════════════════════════════════════════════');

        // Send emails to all recipients
        const emailResults = [];
        const subject = getSubjectFromEventType(eventType);

        for (const recipient of recipients) {
            // Check if recipient is an email address
            if (recipient.includes('@')) {
                const result = await sendEmail(recipient, subject, message, eventType);
                emailResults.push({ recipient, ...result });
            } else {
                // For phone numbers, just log (SMS not implemented)
                console.log(`📱 SMS would be sent to: ${recipient}`);
                emailResults.push({ recipient, success: true, channel: 'sms-logged' });
            }
        }

        // Store notification
        const notification = {
            id: `notif-${Date.now()}`,
            channel: channel || 'email',
            recipients,
            message,
            eventType,
            timestamp: timestamp || new Date().toISOString(),
            metadata,
            processedAt: new Date().toISOString(),
            emailResults,
            status: 'processed'
        };

        const successCount = emailResults.filter(r => r.success).length;
        console.log(`📊 Notification summary: ${successCount}/${recipients.length} sent successfully`);

        res.status(200).json({
            success: true,
            notification: {
                id: notification.id,
                recipients_count: recipients.length,
                emails_sent: successCount,
                status: 'processed',
                results: emailResults,
                message: `Notification processed: ${successCount}/${recipients.length} emails sent`
            }
        });

    } catch (error) {
        console.error('Error processing notification:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Helper function to get email subject from event type
function getSubjectFromEventType(eventType) {
    const subjects = {
        'goal.scored': '⚽ BUT! Nouveau but marqué!',
        'match.scheduled': '📅 Match programmé',
        'match.started': '🏟️ Le match commence!',
        'match.ended': '🏁 Fin du match',
        'alert.published': '📢 Alerte importante',
        'team.update': '📋 Mise à jour équipe'
    };
    return subjects[eventType] || '📢 Notification CAN 2025';
}

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🔔 CAN 2025 Notify Service running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📨 Notify endpoint: http://localhost:${PORT}/notify`);
    console.log(`📧 Email configured: ${!!transporter}`);
});
