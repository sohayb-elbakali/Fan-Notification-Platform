require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;
const NOTIFY_TOKEN = process.env.NOTIFY_TOKEN || 'dev-secret-token';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

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
        timestamp: new Date().toISOString()
    });
});

// Notify endpoint - receives notifications from Lambda
app.post('/notify', (req, res) => {
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

        // Log the notification (in production, this would send actual SMS)
        console.log('═══════════════════════════════════════════════════');
        console.log('📱 NOTIFICATION RECEIVED');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Channel: ${channel || 'sms'}`);
        console.log(`Event Type: ${eventType}`);
        console.log(`Timestamp: ${timestamp}`);
        console.log(`Message: ${message}`);
        console.log(`Recipients (${recipients.length}):`);
        recipients.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
        if (metadata) {
            console.log('Metadata:', JSON.stringify(metadata, null, 2));
        }
        console.log('═══════════════════════════════════════════════════');

        // Store notification (optional - could store in database)
        const notification = {
            id: `notif-${Date.now()}`,
            channel: channel || 'sms',
            recipients,
            message,
            eventType,
            timestamp: timestamp || new Date().toISOString(),
            metadata,
            processedAt: new Date().toISOString(),
            status: 'logged'
        };

        // In production, you would:
        // 1. Store to database
        // 2. Send actual SMS via Twilio, AWS SNS, or similar
        // 3. Return delivery status

        res.status(200).json({
            success: true,
            notification: {
                id: notification.id,
                recipients_count: recipients.length,
                status: 'logged',
                message: 'Notification received and logged successfully'
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
});
