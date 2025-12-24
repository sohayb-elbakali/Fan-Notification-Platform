const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, sql } = require('../config/database');

const router = express.Router();

/**
 * GET /fans
 * List all fans
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await query(`
      SELECT f.id, f.email, f.language, f.created_at,
             STRING_AGG(t.name, ', ') as teams
      FROM fans f
      LEFT JOIN fan_teams ft ON f.id = ft.fan_id
      LEFT JOIN teams t ON ft.team_id = t.id
      GROUP BY f.id, f.email, f.language, f.created_at
      ORDER BY f.created_at DESC
    `);

        res.json({
            count: result.recordset.length,
            fans: result.recordset
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /fans/:id
 * Get a specific fan
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const fanResult = await query(`
      SELECT id, email, language, created_at
      FROM fans WHERE id = @id
    `, { id });

        if (fanResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Fan not found' });
        }

        const teamsResult = await query(`
      SELECT t.id, t.name, t.country
      FROM teams t
      INNER JOIN fan_teams ft ON t.id = ft.team_id
      WHERE ft.fan_id = @fanId
    `, { fanId: id });

        res.json({
            ...fanResult.recordset[0],
            teams: teamsResult.recordset
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /fans
 * Create a new fan
 */
router.post('/', async (req, res, next) => {
    try {
        const { email, language = 'fr' } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if email already exists
        const existingFan = await query(`
      SELECT id FROM fans WHERE email = @email
    `, { email });

        if (existingFan.recordset.length > 0) {
            return res.status(409).json({
                error: 'Email already registered',
                fanId: existingFan.recordset[0].id
            });
        }

        const id = uuidv4();

        await query(`
      INSERT INTO fans (id, email, language, created_at)
      VALUES (@id, @email, @language, GETUTCDATE())
    `, { id, email, language });

        res.status(201).json({
            message: 'Fan registered successfully',
            fan: { id, email, language }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /fans/:id/teams
 * Subscribe a fan to a team
 */
router.post('/:id/teams', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { teamId } = req.body;

        if (!teamId) {
            return res.status(400).json({ error: 'teamId is required' });
        }

        // Check if fan exists
        const fanResult = await query(`SELECT id FROM fans WHERE id = @id`, { id });
        if (fanResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Fan not found' });
        }

        // Check if team exists
        const teamResult = await query(`SELECT id, name FROM teams WHERE id = @teamId`, { teamId });
        if (teamResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Check if already subscribed
        const existingSub = await query(`
      SELECT 1 FROM fan_teams WHERE fan_id = @fanId AND team_id = @teamId
    `, { fanId: id, teamId });

        if (existingSub.recordset.length > 0) {
            return res.status(409).json({ error: 'Already subscribed to this team' });
        }

        // Create subscription
        await query(`
      INSERT INTO fan_teams (fan_id, team_id)
      VALUES (@fanId, @teamId)
    `, { fanId: id, teamId });

        res.status(201).json({
            message: 'Subscribed to team successfully',
            fanId: id,
            team: teamResult.recordset[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /fans/:id/teams/:teamId
 * Unsubscribe a fan from a team
 */
router.delete('/:id/teams/:teamId', async (req, res, next) => {
    try {
        const { id, teamId } = req.params;

        const result = await query(`
      DELETE FROM fan_teams 
      WHERE fan_id = @fanId AND team_id = @teamId
    `, { fanId: id, teamId });

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json({ message: 'Unsubscribed from team successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /fans/:id
 * Delete a fan
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Delete subscriptions first
        await query(`DELETE FROM fan_teams WHERE fan_id = @id`, { id });

        // Delete fan
        const result = await query(`DELETE FROM fans WHERE id = @id`, { id });

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Fan not found' });
        }

        res.json({ message: 'Fan deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
