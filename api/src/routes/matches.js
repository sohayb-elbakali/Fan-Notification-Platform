const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction, sql } = require('../config/database');
const { publishEvent, EventTypes } = require('../services/outbox');

const router = express.Router();

/**
 * GET /matches
 * List all matches
 */
router.get('/', async (req, res, next) => {
    try {
        const { status } = req.query;

        let sqlQuery = `
      SELECT m.id, m.stadium, m.city, m.kickoff_time, m.status,
             ta.id as team_a_id, ta.name as team_a_name, ta.country as team_a_country,
             tb.id as team_b_id, tb.name as team_b_name, tb.country as team_b_country,
             (SELECT COUNT(*) FROM goals g WHERE g.match_id = m.id AND g.team_id = ta.id) as team_a_goals,
             (SELECT COUNT(*) FROM goals g WHERE g.match_id = m.id AND g.team_id = tb.id) as team_b_goals
      FROM matches m
      INNER JOIN teams ta ON m.team_a_id = ta.id
      INNER JOIN teams tb ON m.team_b_id = tb.id
    `;

        const params = {};
        if (status) {
            sqlQuery += ' WHERE m.status = @status';
            params.status = status;
        }

        sqlQuery += ' ORDER BY m.kickoff_time';

        const result = await query(sqlQuery, params);

        const matches = result.recordset.map(m => ({
            id: m.id,
            stadium: m.stadium,
            city: m.city,
            kickoffTime: m.kickoff_time,
            status: m.status,
            teamA: {
                id: m.team_a_id,
                name: m.team_a_name,
                country: m.team_a_country,
                goals: m.team_a_goals
            },
            teamB: {
                id: m.team_b_id,
                name: m.team_b_name,
                country: m.team_b_country,
                goals: m.team_b_goals
            }
        }));

        res.json({
            count: matches.length,
            matches
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /matches/:id
 * Get a specific match with goals
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const matchResult = await query(`
      SELECT m.id, m.stadium, m.city, m.kickoff_time, m.status,
             ta.id as team_a_id, ta.name as team_a_name, ta.country as team_a_country,
             tb.id as team_b_id, tb.name as team_b_name, tb.country as team_b_country
      FROM matches m
      INNER JOIN teams ta ON m.team_a_id = ta.id
      INNER JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = @id
    `, { id });

        if (matchResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const goalsResult = await query(`
      SELECT g.id, g.team_id, t.name as team_name, g.minute, g.player, g.created_at
      FROM goals g
      INNER JOIN teams t ON g.team_id = t.id
      WHERE g.match_id = @matchId
      ORDER BY g.minute
    `, { matchId: id });

        const m = matchResult.recordset[0];
        const goals = goalsResult.recordset;

        res.json({
            id: m.id,
            stadium: m.stadium,
            city: m.city,
            kickoffTime: m.kickoff_time,
            status: m.status,
            teamA: {
                id: m.team_a_id,
                name: m.team_a_name,
                country: m.team_a_country,
                goals: goals.filter(g => g.team_id === m.team_a_id).length
            },
            teamB: {
                id: m.team_b_id,
                name: m.team_b_name,
                country: m.team_b_country,
                goals: goals.filter(g => g.team_id === m.team_b_id).length
            },
            goals: goals
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches
 * Create a new match (triggers match.scheduled event)
 */
router.post('/', async (req, res, next) => {
    try {
        const { teamAId, teamBId, stadium, city, kickoffTime } = req.body;

        // Validate required fields
        if (!teamAId || !teamBId || !stadium || !city || !kickoffTime) {
            return res.status(400).json({
                error: 'teamAId, teamBId, stadium, city, and kickoffTime are required'
            });
        }

        if (teamAId === teamBId) {
            return res.status(400).json({ error: 'A team cannot play against itself' });
        }

        // Verify teams exist
        const teamsResult = await query(`
      SELECT id, name, country FROM teams WHERE id IN (@teamAId, @teamBId)
    `, { teamAId, teamBId });

        if (teamsResult.recordset.length !== 2) {
            return res.status(404).json({ error: 'One or both teams not found' });
        }

        const teamA = teamsResult.recordset.find(t => t.id === teamAId);
        const teamB = teamsResult.recordset.find(t => t.id === teamBId);

        const id = uuidv4();

        // Create match
        await query(`
      INSERT INTO matches (id, team_a_id, team_b_id, stadium, city, kickoff_time, status)
      VALUES (@id, @teamAId, @teamBId, @stadium, @city, @kickoffTime, 'SCHEDULED')
    `, { id, teamAId, teamBId, stadium, city, kickoffTime });

        // Publish match.scheduled event
        const eventPayload = {
            eventId: uuidv4(),
            type: EventTypes.MATCH_SCHEDULED,
            timestamp: new Date().toISOString(),
            data: {
                matchId: id,
                teamAId,
                teamAName: teamA.name,
                teamBId,
                teamBName: teamB.name,
                kickoffTime,
                stadium,
                city
            }
        };

        const eventId = await publishEvent(EventTypes.MATCH_SCHEDULED, eventPayload);

        res.status(201).json({
            message: 'Match created successfully',
            match: {
                id,
                teamA: teamA,
                teamB: teamB,
                stadium,
                city,
                kickoffTime,
                status: 'SCHEDULED'
            },
            eventId
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /matches/:id
 * Update match status
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, kickoffTime, stadium, city } = req.body;

        const validStatuses = ['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'CANCELLED'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const updates = [];
        const params = { id };

        if (status) { updates.push('status = @status'); params.status = status; }
        if (kickoffTime) { updates.push('kickoff_time = @kickoffTime'); params.kickoffTime = kickoffTime; }
        if (stadium) { updates.push('stadium = @stadium'); params.stadium = stadium; }
        if (city) { updates.push('city = @city'); params.city = city; }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await query(`
      UPDATE matches SET ${updates.join(', ')} WHERE id = @id
    `, params);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        res.json({ message: 'Match updated successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /matches/:id/goals
 * Add a goal to a match (triggers goal.scored event)
 */
router.post('/:id/goals', async (req, res, next) => {
    try {
        const { id: matchId } = req.params;
        const { teamId, minute, player } = req.body;

        if (!teamId || minute === undefined) {
            return res.status(400).json({ error: 'teamId and minute are required' });
        }

        // Get match details
        const matchResult = await query(`
      SELECT m.id, m.team_a_id, m.team_b_id, m.status,
             ta.name as team_a_name, tb.name as team_b_name
      FROM matches m
      INNER JOIN teams ta ON m.team_a_id = ta.id
      INNER JOIN teams tb ON m.team_b_id = tb.id
      WHERE m.id = @matchId
    `, { matchId });

        if (matchResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matchResult.recordset[0];

        // Verify team is playing in this match
        if (teamId !== match.team_a_id && teamId !== match.team_b_id) {
            return res.status(400).json({ error: 'Team is not playing in this match' });
        }

        const goalId = uuidv4();

        // Insert goal
        await query(`
      INSERT INTO goals (id, match_id, team_id, minute, player, created_at)
      VALUES (@id, @matchId, @teamId, @minute, @player, GETUTCDATE())
    `, { id: goalId, matchId, teamId, minute, player: player || null });

        // Calculate new score
        const scoresResult = await query(`
      SELECT team_id, COUNT(*) as goals
      FROM goals
      WHERE match_id = @matchId
      GROUP BY team_id
    `, { matchId });

        const scores = {};
        scores[match.team_a_id] = 0;
        scores[match.team_b_id] = 0;
        scoresResult.recordset.forEach(s => {
            scores[s.team_id] = s.goals;
        });

        // Publish goal.scored event
        const eventPayload = {
            eventId: uuidv4(),
            type: EventTypes.GOAL_SCORED,
            timestamp: new Date().toISOString(),
            data: {
                matchId,
                teamId,
                teamName: teamId === match.team_a_id ? match.team_a_name : match.team_b_name,
                minute,
                player: player || 'Unknown',
                score: {
                    teamA: scores[match.team_a_id],
                    teamB: scores[match.team_b_id]
                },
                teamAId: match.team_a_id,
                teamBId: match.team_b_id,
                teamAName: match.team_a_name,
                teamBName: match.team_b_name
            }
        };

        const eventId = await publishEvent(EventTypes.GOAL_SCORED, eventPayload);

        res.status(201).json({
            message: 'Goal added successfully',
            goal: {
                id: goalId,
                matchId,
                teamId,
                minute,
                player: player || null
            },
            score: {
                [match.team_a_name]: scores[match.team_a_id],
                [match.team_b_name]: scores[match.team_b_id]
            },
            eventId
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /matches/:id
 * Delete a match
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Delete goals first
        await query(`DELETE FROM goals WHERE match_id = @id`, { id });

        // Delete match
        const result = await query(`DELETE FROM matches WHERE id = @id`, { id });

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
