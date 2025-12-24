const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const router = express.Router();

/**
 * GET /teams
 * List all teams
 */
router.get('/', async (req, res, next) => {
    try {
        const result = await query(`
      SELECT t.id, t.name, t.country,
             (SELECT COUNT(*) FROM fan_teams ft WHERE ft.team_id = t.id) as fan_count
      FROM teams t
      ORDER BY t.name
    `);

        res.json({
            count: result.recordset.length,
            teams: result.recordset
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /teams/:id
 * Get a specific team
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT t.id, t.name, t.country,
             (SELECT COUNT(*) FROM fan_teams ft WHERE ft.team_id = t.id) as fan_count
      FROM teams t
      WHERE t.id = @id
    `, { id });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /teams
 * Create a new team
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, country } = req.body;

        if (!name || !country) {
            return res.status(400).json({ error: 'Name and country are required' });
        }

        // Check if team already exists
        const existingTeam = await query(`
      SELECT id FROM teams WHERE name = @name OR country = @country
    `, { name, country });

        if (existingTeam.recordset.length > 0) {
            return res.status(409).json({ error: 'Team with this name or country already exists' });
        }

        const id = uuidv4();

        await query(`
      INSERT INTO teams (id, name, country)
      VALUES (@id, @name, @country)
    `, { id, name, country });

        res.status(201).json({
            message: 'Team created successfully',
            team: { id, name, country }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /teams/:id
 * Update a team
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, country } = req.body;

        if (!name && !country) {
            return res.status(400).json({ error: 'Name or country is required' });
        }

        // Build dynamic update query
        const updates = [];
        const params = { id };

        if (name) {
            updates.push('name = @name');
            params.name = name;
        }
        if (country) {
            updates.push('country = @country');
            params.country = country;
        }

        const result = await query(`
      UPDATE teams SET ${updates.join(', ')}
      WHERE id = @id
    `, params);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ message: 'Team updated successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /teams/:id
 * Delete a team
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check for existing subscriptions
        const subscriptions = await query(`
      SELECT COUNT(*) as count FROM fan_teams WHERE team_id = @id
    `, { id });

        if (subscriptions.recordset[0].count > 0) {
            return res.status(409).json({
                error: 'Cannot delete team with active fan subscriptions',
                fanCount: subscriptions.recordset[0].count
            });
        }

        const result = await query(`DELETE FROM teams WHERE id = @id`, { id });

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /teams/:id/fans
 * Get all fans of a team
 */
router.get('/:id/fans', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT f.id, f.email, f.language
      FROM fans f
      INNER JOIN fan_teams ft ON f.id = ft.fan_id
      WHERE ft.team_id = @teamId
    `, { teamId: id });

        res.json({
            teamId: id,
            count: result.recordset.length,
            fans: result.recordset
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
