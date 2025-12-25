const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { query, sql } = require('../config/database');

/**
 * Event types supported by the system
 */
const EventTypes = {
    MATCH_SCHEDULED: 'match.scheduled',
    GOAL_SCORED: 'goal.scored',
    ALERT_PUBLISHED: 'alert.published'
};

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
 * Publish event to AWS EventBridge
 */
async function publishToEventBridge(eventId, eventType, payload) {
    const eventBridgeEndpoint = process.env.AWS_EVENTBRIDGE_ENDPOINT;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const eventBusBus = process.env.AWS_EVENTBRIDGE_BUS || 'can2025-events';

    if (!eventBridgeEndpoint) {
        console.log('⚠️  AWS_EVENTBRIDGE_ENDPOINT not configured');
        console.log(`📤 Event [${eventType}]: ${eventId}`);
        console.log(`📦 Payload:`, JSON.stringify(payload.data, null, 2));
        return { success: true, mock: true };
    }

    try {
        // Format event for EventBridge
        const eventBridgeEvent = {
            Source: 'can2025.backend',
            DetailType: eventType,
            Detail: JSON.stringify(payload.data),
            EventBusName: eventBusBus
        };

        // Note: In production, use AWS SDK for proper signing
        // This is a simplified version for demonstration
        const response = await axios.post(
            eventBridgeEndpoint,
            { Entries: [eventBridgeEvent] },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': process.env.AWS_API_KEY || ''
                },
                timeout: 10000
            }
        );

        await updateEventStatus(eventId, EventStatus.SENT);
        console.log(`✅ Event published to EventBridge: ${eventId}`);
        return { success: true, response: response.data };
    } catch (error) {
        console.error(`❌ EventBridge publish failed: ${error.message}`);
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
    FROM outbox_events WHERE id = @id
  `;
    const result = await query(sqlQuery, { id: eventId });

    if (result.recordset.length === 0) return null;

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
 * Acknowledge event
 */
async function acknowledgeEvent(eventId) {
    await updateEventStatus(eventId, EventStatus.PROCESSED);
    console.log(`✅ Event acknowledged: ${eventId}`);
}

/**
 * Get pending events
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
 * Publish an event: create in outbox and publish to EventBridge
 */
async function publishEvent(type, payload) {
    const eventId = await createEvent(type, payload);

    // Publish to EventBridge asynchronously
    setImmediate(() => {
        publishToEventBridge(eventId, type, payload).catch(err => {
            console.error('Async EventBridge error:', err.message);
        });
    });

    return eventId;
}

module.exports = {
    EventTypes,
    EventStatus,
    createEvent,
    publishToEventBridge,
    updateEventStatus,
    getEvent,
    acknowledgeEvent,
    getPendingEvents,
    publishEvent
};
