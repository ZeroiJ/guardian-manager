const axios = require('axios');

const BUNGIE_API_ROOT = 'https://www.bungie.net';

// In-memory cache for the lifetime of the serverless function instance
const definitionCache = new Map();

async function getDefinition(tableName, hash) {
    // Check cache first
    const cacheKey = `${tableName}:${hash}`;
    if (definitionCache.has(cacheKey)) {
        return definitionCache.get(cacheKey);
    }

    try {
        const response = await axios.get(`${BUNGIE_API_ROOT}/Platform/Destiny2/Manifest/${tableName}/${hash}/`, {
            headers: { 'X-API-Key': process.env.BUNGIE_API_KEY }
        });

        const definition = response.data.Response;
        definitionCache.set(cacheKey, definition);
        return definition;
    } catch (error) {
        console.error(`Error fetching definition ${tableName}/${hash}:`, error.message);
        return null;
    }
}

async function getDefinitions(tableName, hashes) {
    if (!hashes || hashes.length === 0) return {};

    const uniqueHashes = [...new Set(hashes)];
    const results = {};

    // Fetch in parallel
    const promises = uniqueHashes.map(async (hash) => {
        const def = await getDefinition(tableName, hash);
        if (def) {
            results[hash] = def;
        }
    });

    await Promise.all(promises);
    return results;
}

// No-op for compatibility
async function checkAndDownloadManifest() {
    console.log('Using direct Bungie API for definitions. No download needed.');
}

module.exports = { checkAndDownloadManifest, getDefinition, getDefinitions };

