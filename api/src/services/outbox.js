const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { query, transaction, sql } = require('../config/database');

/**
 * Event types supported by the system
 */
const EventTypes = {
    MATCH_SCHEDULED: 'match.scheduled',
    GOAL_SCORED: 'goal.scored',
    ALERT_PUBLISHED: 'alert.published'
};

/**
 * Event statuses
 */
const EventStatus = {
    NEW: 'NEW',
    SENT: 'SENT',
    FAILED: 'FAILED',
    PROCESSED: 'PROCESSED'
};

/**
 * Create an event in the outbox table
 */
async function createEvent(type, payload, trans = null) {
    const eventId = uuidv4();
    const payloadJson = JSON.stringify(payload);

    const sqlQuery = `
    INSERT INTO outbox_events (id, type, payload_json, status, created_at)
    VALUES (@id, @type, @payload, @status, GETUTCDATE())
  `;

    if (trans) {
        const request = trans.request();
        request.input('id', sql.UniqueIdentifier, eventId);
        request.input('type', sql.NVarChar(50), type);
        request.input('payload', sql.NVarChar(sql.MAX), payloadJson);
        request.input('status', sql.NVarChar(20), EventStatus.NEW);
        await request.query(sqlQuery);
    } else {
        await query(sqlQuery, {
            id: eventId,
            type: type,
            payload: payloadJson,
            status: EventStatus.NEW
        });
    }

    return eventId;
}

/**
 * Trigger webhook to AWS Lambda
 */
async function triggerWebhook(eventId, eventType) {
    const lambdaUrl = process.env.AWS_LAMBDA_URL;
    const webhookToken = process.env.WEBHOOK_TOKEN;

    if (!lambdaUrl) {
        console.log('⚠️  AWS_LAMBDA_URL not configured, skipping webhook');
        console.log(`📤 Would send webhook for event: ${eventId} (${eventType})`);
        return { success: true, mock: true };
    }

    try {
        const response = await axios.post(
            lambdaUrl,
            {
                eventId: eventId,
                type: eventType
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-WEBHOOK-TOKEN': webhookToken
                },
                timeout: 10000 // 10 second timeout
            }
        );

        // Update event status to SENT
        await updateEventStatus(eventId, EventStatus.SENT);

        console.log(`✅ Webhook sent for event: ${eventId}`);
        return { success: true, response: response.data };
    } catch (error) {
        console.error(`❌ Webhook failed for event ${eventId}:`, error.message);

        // Update event status to FAILED
        await updateEventStatus(eventId, EventStatus.FAILED);

        return { success: false, error: error.message };
    }
}

/**
 * Update event status
 */
async function updateEventStatus(eventId, status) {
    const sqlQuery = `
    UPDATE outbox_events 
    SET status = @status,
        processed_at = CASE WHEN @status = 'PROCESSED' THEN GETUTCDATE() ELSE processed_at END
    WHERE id = @id
  `;

    await query(sqlQuery, { id: eventId, status: status });
}

/**
 * Get event by ID
 */
async function getEvent(eventId) {
    const sqlQuery = `
    SELECT id, type, payload_json, status, created_at, processed_at
    FROM outbox_events
    WHERE id = @id
  `;

    const result = await query(sqlQuery, { id: eventId });

    if (result.recordset.length === 0) {
        return null;
    }

    const event = result.recordset[0];
    return {
        id: event.id,
        type: event.type,
        payload: JSON.parse(event.payload_json),
        status: event.status,
        createdAt: event.created_at,
        processedAt: event.processed_at
    };
}

/**
 * Acknowledge event (mark as processed)
 */
async function acknowledgeEvent(eventId) {
    await updateEventStatus(eventId, EventStatus.PROCESSED);
    console.log(`✅ Event acknowledged: ${eventId}`);
}

/**
 * Get pending events (for retry mechanism)
 */
async function getPendingEvents() {
    const sqlQuery = `
    SELECT id, type, payload_json, status, created_at
    FROM outbox_events
    WHERE status IN ('NEW', 'FAILED')
    AND created_at > DATEADD(hour, -24, GETUTCDATE())
    ORDER BY created_at ASC
  `;

    const result = await query(sqlQuery);
    return result.recordset.map(event => ({
        id: event.id,
        type: event.type,
        payload: JSON.parse(event.payload_json),
        status: event.status,
        createdAt: event.created_at
    }));
}

/**
 * Publish an event: create in outbox and trigger webhook
 */
async function publishEvent(type, payload) {
    const eventId = await createEvent(type, payload);

    // Trigger webhook asynchronously (don't block the response)
    setImmediate(() => {
        triggerWebhook(eventId, type).catch(err => {
            console.error('Async webhook error:', err.message);
        });
    });

    return eventId;
}

module.exports = {
    EventTypes,
    EventStatus,
    createEvent,
    triggerWebhook,
    updateEventStatus,
    getEvent,
    acknowledgeEvent,
    getPendingEvents,
    publishEvent
};
