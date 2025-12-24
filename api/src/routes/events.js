const express = require('express');
const { query } = require('../config/database');
const { getEvent, acknowledgeEvent, getPendingEvents } = require('../services/outbox');

const router = express.Router();

function verifyApiToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.AZURE_EVENT_API_TOKEN || 'demo-token';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    if (token !== expectedToken) {
        return res.status(403).json({ error: 'Invalid API token' });
    }
    next();
}

router.get('/:id', verifyApiToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await getEvent(id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const recipients = await getRecipientsForEvent(event);
        res.json({ event, recipients });
    } catch (error) {
        next(error);
    }
});

router.post('/:id/ack', verifyApiToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await getEvent(id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        await acknowledgeEvent(id);
        res.json({ message: 'Event acknowledged', eventId: id });
    } catch (error) {
        next(error);
    }
});

router.get('/status/pending', async (req, res, next) => {
    try {
        const events = await getPendingEvents();
        res.json({ count: events.length, events });
    } catch (error) {
        next(error);
    }
});

async function getRecipientsForEvent(event) {
    const data = event.payload.data;
    let recipients = [];

    if (event.type === 'match.scheduled' || event.type === 'goal.scored') {
        const teamIds = [data.teamAId, data.teamBId].filter(Boolean);
        if (teamIds.length > 0) {
            const result = await query(`
        SELECT DISTINCT f.id, f.email, f.language FROM fans f
        INNER JOIN fan_teams ft ON f.id = ft.fan_id
        WHERE ft.team_id IN (@teamA, @teamB)
      `, { teamA: teamIds[0], teamB: teamIds[1] || teamIds[0] });
            recipients = result.recordset;
        }
    } else if (event.type === 'alert.published') {
        if (data.scopeType === 'ALL') {
            const result = await query(`SELECT id, email, language FROM fans`);
            recipients = result.recordset;
        } else if (data.scopeType === 'CITY') {
            const result = await query(`
        SELECT DISTINCT f.id, f.email, f.language FROM fans f
        INNER JOIN fan_teams ft ON f.id = ft.fan_id
        INNER JOIN matches m ON (ft.team_id = m.team_a_id OR ft.team_id = m.team_b_id)
        WHERE m.city = @city
      `, { city: data.scopeId });
            recipients = result.recordset;
        }
    }
    return recipients;
}

module.exports = router;
