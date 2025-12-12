const BUNGIE_API_ROOT = 'https://www.bungie.net';

export async function getDefinitions(tableName, hashes, env) {
    if (!hashes || hashes.length === 0) return {};

    const uniqueHashes = [...new Set(hashes)];
    const results = {};

    // Fetch in parallel
    // Batching to prevent Rate Limiting / 502s
    const BATCH_SIZE = 10;
    for (let i = 0; i < uniqueHashes.length; i += BATCH_SIZE) {
        const batch = uniqueHashes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (hash) => {
            try {
                const response = await fetch(`${BUNGIE_API_ROOT}/Platform/Destiny2/Manifest/${tableName}/${hash}/`, {
                    headers: { 'X-API-Key': env.BUNGIE_API_KEY }
                });

                if (response.ok) {
                    const data = await response.json();
                    results[hash] = data.Response;
                } else {
                    console.warn(`Failed to fetch definition ${hash}: ${response.status}`);
                }
            } catch (e) {
                console.error(`Error fetching definition ${hash}:`, e);
            }
        }));
    }

    return results;

}
