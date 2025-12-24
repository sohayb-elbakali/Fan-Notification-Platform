const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { publishEvent, EventTypes } = require('../services/outbox');

const router = express.Router();

/**
 * Valid alert categories and severities
 */
const VALID_CATEGORIES = ['WEATHER', 'SECURITY', 'TRAFFIC', 'GENERAL'];
const VALID_SEVERITIES = ['INFO', 'WARN', 'CRITICAL'];
const VALID_SCOPE_TYPES = ['CITY', 'STADIUM', 'MATCH', 'ALL'];

/**
 * GET /alerts
 * List all alerts
 */
router.get('/', async (req, res, next) => {
    try {
        const { category, severity, scopeType } = req.query;

        let sqlQuery = `
      SELECT id, scope_type, scope_id, category, severity, message, created_at
      FROM alerts
      WHERE 1=1
    `;

        const params = {};

        if (category) {
            sqlQuery += ' AND category = @category';
            params.category = category;
        }
        if (severity) {
            sqlQuery += ' AND severity = @severity';
            params.severity = severity;
        }
        if (scopeType) {
            sqlQuery += ' AND scope_type = @scopeType';
            params.scopeType = scopeType;
        }

        sqlQuery += ' ORDER BY created_at DESC';

        const result = await query(sqlQuery, params);

        res.json({
            count: result.recordset.length,
            alerts: result.recordset.map(a => ({
                id: a.id,
                scopeType: a.scope_type,
                scopeId: a.scope_id,
                category: a.category,
                severity: a.severity,
                message: a.message,
                createdAt: a.created_at
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /alerts/:id
 * Get a specific alert
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT id, scope_type, scope_id, category, severity, message, created_at
      FROM alerts
      WHERE id = @id
    `, { id });

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const a = result.recordset[0];
        res.json({
            id: a.id,
            scopeType: a.scope_type,
            scopeId: a.scope_id,
            category: a.category,
            severity: a.severity,
            message: a.message,
            createdAt: a.created_at
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /alerts
 * Publish a new alert (triggers alert.published event)
 */
router.post('/', async (req, res, next) => {
    try {
        const { scopeType, scopeId, category, severity, message } = req.body;

        // Validate required fields
        if (!scopeType || !category || !severity || !message) {
            return res.status(400).json({
                error: 'scopeType, category, severity, and message are required'
            });
        }

        // Validate enum values
        if (!VALID_SCOPE_TYPES.includes(scopeType)) {
            return res.status(400).json({
                error: `Invalid scopeType. Must be one of: ${VALID_SCOPE_TYPES.join(', ')}`
            });
        }

        if (!VALID_CATEGORIES.includes(category)) {
            return res.status(400).json({
                error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
            });
        }

        if (!VALID_SEVERITIES.includes(severity)) {
            return res.status(400).json({
                error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`
            });
        }

        // scopeId is required unless scopeType is ALL
        if (scopeType !== 'ALL' && !scopeId) {
            return res.status(400).json({
                error: 'scopeId is required when scopeType is not ALL'
            });
        }

        const id = uuidv4();

        // Create alert
        await query(`
      INSERT INTO alerts (id, scope_type, scope_id, category, severity, message, created_at)
      VALUES (@id, @scopeType, @scopeId, @category, @severity, @message, GETUTCDATE())
    `, {
            id,
            scopeType,
            scopeId: scopeId || null,
            category,
            severity,
            message
        });

        // Publish alert.published event
        const eventPayload = {
            eventId: uuidv4(),
            type: EventTypes.ALERT_PUBLISHED,
            timestamp: new Date().toISOString(),
            data: {
                alertId: id,
                scopeType,
                scopeId: scopeId || null,
                category,
                severity,
                message
            }
        };

        const eventId = await publishEvent(EventTypes.ALERT_PUBLISHED, eventPayload);

        res.status(201).json({
            message: 'Alert published successfully',
            alert: {
                id,
                scopeType,
                scopeId: scopeId || null,
                category,
                severity,
                message
            },
            eventId
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /alerts/:id
 * Delete an alert
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(`DELETE FROM alerts WHERE id = @id`, { id });

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ message: 'Alert deleted successfully' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
