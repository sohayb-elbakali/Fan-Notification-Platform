const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { query, sql } = require('../config/database');

/**
 * Event types supported by the system
 */
const EventTypes = {
    MATCH_SCHEDULED: 'match.scheduled',
    GOAL_SCORED: 'goal.scored',
    MATCH_ENDED: 'match.ended',
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
 * Get recipients for a match (fans subscribed to either team)
 */
async function getMatchRecipients(matchId) {
    try {
        const matchResult = await query(`
            SELECT m.id, m.team_a_id, m.team_b_id
            FROM matches m
            WHERE m.id = @matchId
        `, { matchId });

        if (matchResult.recordset.length === 0) {
            return [];
        }

        const match = matchResult.recordset[0];

        // Get phone numbers from fans subscribed to either team
        const fansResult = await query(`
            SELECT DISTINCT f.id, f.email, f.phone, f.language
            FROM fans f
            INNER JOIN fan_teams ft ON f.id = ft.fan_id
            WHERE ft.team_id IN (@teamA, @teamB)
            AND f.phone IS NOT NULL
        `, { teamA: match.team_a_id, teamB: match.team_b_id });

        return fansResult.recordset.map(f => f.phone).filter(Boolean);
    } catch (error) {
        console.error('Error fetching match recipients:', error.message);
        return [];
    }
}

/**
 * Get recipients for an alert
 */
async function getAlertRecipients(alertId) {
    try {
        const alertResult = await query(`
            SELECT id, scope_type, scope_id
            FROM alerts WHERE id = @alertId
        `, { alertId });

        if (alertResult.recordset.length === 0) {
            return [];
        }

        const alert = alertResult.recordset[0];
        let fansResult;

        if (alert.scope_type === 'ALL') {
            fansResult = await query(`SELECT id, phone FROM fans WHERE phone IS NOT NULL`);
        } else if (alert.scope_type === 'CITY') {
            fansResult = await query(`
                SELECT DISTINCT f.id, f.phone
                FROM fans f
                INNER JOIN fan_teams ft ON f.id = ft.fan_id
                INNER JOIN matches m ON (ft.team_id = m.team_a_id OR ft.team_id = m.team_b_id)
                WHERE m.city = @city AND f.phone IS NOT NULL
            `, { city: alert.scope_id });
        } else {
            return [];
        }

        return fansResult.recordset.map(f => f.phone).filter(Boolean);
    } catch (error) {
        console.error('Error fetching alert recipients:', error.message);
        return [];
    }
}

/**
 * Publish event to AWS Lambda Function URL
 */
async function publishToLambda(eventId, eventType, payload) {
    const lambdaFunctionUrl = process.env.LAMBDA_FUNCTION_URL;

    if (!lambdaFunctionUrl) {
        console.log('⚠️  LAMBDA_FUNCTION_URL not configured');
        console.log(`📤 Event [${eventType}]: ${eventId}`);
        console.log(`📦 Payload:`, JSON.stringify(payload.data, null, 2));
        return { success: true, mock: true };
    }

    try {
        // Get recipients based on event type
        let recipients = [];
        if (eventType === EventTypes.MATCH_SCHEDULED || eventType === EventTypes.GOAL_SCORED || eventType === EventTypes.MATCH_ENDED) {
            recipients = await getMatchRecipients(payload.data.matchId);
        } else if (eventType === EventTypes.ALERT_PUBLISHED) {
            recipients = await getAlertRecipients(payload.data.alertId);
        }

        if (recipients.length === 0) {
            console.log(`⚠️  No recipients found for event: ${eventId}`);
            await updateEventStatus(eventId, EventStatus.PROCESSED);
            return { success: true, recipients: 0 };
        }

        // Build Lambda payload
        const lambdaPayload = {
            type: eventType,
            matchId: payload.data.matchId,
            minute: payload.data.minute,
            player: payload.data.player,
            score: payload.data.score,
            teamAName: payload.data.teamAName,
            teamBName: payload.data.teamBName,
            stadium: payload.data.stadium,
            city: payload.data.city,
            kickoffTime: payload.data.kickoffTime,
            message: payload.data.message,
            category: payload.data.category,
            severity: payload.data.severity,
            recipients: recipients
        };

        console.log(`📤 Calling Lambda Function URL for event: ${eventId}`);
        console.log(`📱 Recipients: ${recipients.length}`);

        const response = await axios.post(
            lambdaFunctionUrl,
            lambdaPayload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        await updateEventStatus(eventId, EventStatus.SENT);
        console.log(`✅ Event sent to Lambda: ${eventId}`);
        return { success: true, response: response.data, recipients: recipients.length };
    } catch (error) {
        console.error(`❌ Lambda call failed: ${error.message}`);
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
 * Publish an event: create in outbox and call Lambda Function URL
 */
async function publishEvent(type, payload) {
    const eventId = await createEvent(type, payload);

    // Publish to Lambda asynchronously
    setImmediate(() => {
        publishToLambda(eventId, type, payload).catch(err => {
            console.error('Async Lambda call error:', err.message);
        });
    });

    return eventId;
}

module.exports = {
    EventTypes,
    EventStatus,
    createEvent,
    publishToLambda,
    updateEventStatus,
    getEvent,
    acknowledgeEvent,
    getPendingEvents,
    publishEvent
};
