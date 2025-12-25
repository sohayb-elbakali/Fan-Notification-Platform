const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

/**
 * GET /matches/:matchId/recipients
 * Get list of fans to notify for a match (used by AWS Lambda)
 */
router.get('/:matchId/recipients', async (req, res, next) => {
    try {
        const { matchId } = req.params;

        // Get match details
        const matchResult = await query(`
      SELECT m.id, m.team_a_id, m.team_b_id
      FROM matches m
      WHERE m.id = @matchId
    `, { matchId });

        if (matchResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matchResult.recordset[0];

        // Get fans subscribed to either team
        const fansResult = await query(`
      SELECT DISTINCT f.id, f.email, f.language
      FROM fans f
      INNER JOIN fan_teams ft ON f.id = ft.fan_id
      WHERE ft.team_id IN (@teamA, @teamB)
    `, { teamA: match.team_a_id, teamB: match.team_b_id });

        res.json({
            matchId,
            count: fansResult.recordset.length,
            recipients: fansResult.recordset.map(f => ({
                id: f.id,
                email: f.email,
                language: f.language
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /alerts/:alertId/recipients
 * Get list of fans to notify for an alert (used by AWS Lambda)
 */
router.get('/alerts/:alertId/recipients', async (req, res, next) => {
    try {
        const { alertId } = req.params;

        // Get alert details
        const alertResult = await query(`
      SELECT id, scope_type, scope_id
      FROM alerts WHERE id = @alertId
    `, { alertId });

        if (alertResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const alert = alertResult.recordset[0];
        let fansResult;

        if (alert.scope_type === 'ALL') {
            fansResult = await query(`SELECT id, email, language FROM fans`);
        } else if (alert.scope_type === 'CITY') {
            fansResult = await query(`
        SELECT DISTINCT f.id, f.email, f.language
        FROM fans f
        INNER JOIN fan_teams ft ON f.id = ft.fan_id
        INNER JOIN matches m ON (ft.team_id = m.team_a_id OR ft.team_id = m.team_b_id)
        WHERE m.city = @city
      `, { city: alert.scope_id });
        } else {
            fansResult = { recordset: [] };
        }

        res.json({
            alertId,
            count: fansResult.recordset.length,
            recipients: fansResult.recordset.map(f => ({
                id: f.id,
                email: f.email,
                language: f.language
            }))
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
