const express = require('express');
const router = express.Router();
const { getDefinitions } = require('../services/manifestService');

// Batch fetch definitions
// POST /api/manifest/definitions
// Body: { hashes: [123, 456], tableName: 'DestinyInventoryItemDefinition' }
router.post('/definitions', async (req, res) => {
    const { hashes, tableName } = req.body;

    if (!hashes || !Array.isArray(hashes)) {
        return res.status(400).json({ error: 'Invalid hashes provided' });
    }

    const table = tableName || 'DestinyInventoryItemDefinition';

    try {
        const definitions = await getDefinitions(table, hashes);
        res.json(definitions);
    } catch (error) {
        console.error('Error fetching definitions:', error);
        res.status(500).json({
            error: 'Failed to fetch definitions',
            details: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
