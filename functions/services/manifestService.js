const BUNGIE_API_ROOT = 'https://www.bungie.net';

export async function getDefinitions(tableName, hashes, env) {
    if (!hashes || hashes.length === 0) return {};

    const uniqueHashes = [...new Set(hashes)];
    const results = {};

    // Fetch in parallel
    const promises = uniqueHashes.map(async (hash) => {
        try {
            const response = await fetch(`${BUNGIE_API_ROOT}/Platform/Destiny2/Manifest/${tableName}/${hash}/`, {
                headers: { 'X-API-Key': env.BUNGIE_API_KEY }
            });

            if (response.ok) {
                const data = await response.json();
                results[hash] = data.Response;
            }
        } catch (e) {
            console.error(`Error fetching definition ${hash}:`, e);
        }
    });

    await Promise.all(promises);
    return results;
}
