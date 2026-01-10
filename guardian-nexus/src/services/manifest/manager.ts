import { get, set, keys, del } from 'idb-keyval';
import { APIClient } from '../api/client';

const MANIFEST_VERSION_KEY = 'manifest_version';
const TABLE_PREFIX = 'def:';

export class ManifestManager {
    /**
     * Initializes the manifest. Checks for version updates and clears cache if needed.
     */
    static async initialize(): Promise<void> {
        try {
            const localVersion = await get(MANIFEST_VERSION_KEY);
            const remoteManifest = await APIClient.getManifestVersion();
            const remoteVersion = remoteManifest.version;

            if (localVersion !== remoteVersion) {
                console.log(`Manifest update detected: ${localVersion} -> ${remoteVersion}. Clearing cache...`);

                // Clear all keys with our prefix
                const allKeys = await keys();
                for (const key of allKeys) {
                    if (typeof key === 'string' && key.startsWith(TABLE_PREFIX)) {
                        await del(key);
                    }
                }

                await set(MANIFEST_VERSION_KEY, remoteVersion);
            }
        } catch (error) {
            console.error('Failed to initialize manifest manager:', error);
        }
    }

    /**
     * Ensures a specific table is loaded in IndexedDB.
     * Caches the result in memory for the duration of the session if needed, 
     * but IndexedDB is fast enough for most lookups.
     */
    static async loadTable(tableName: string): Promise<Record<string, any>> {
        const key = `${TABLE_PREFIX}${tableName}`;
        let table = await get(key);

        if (!table) {
            console.log(`[ManifestManager] Downloading manifest table: ${tableName}...`);
            const startTime = performance.now();

            try {
                table = await APIClient.getDefinitions(tableName);
                const size = JSON.stringify(table).length;
                console.log(`[ManifestManager] Downloaded ${tableName} in ${(performance.now() - startTime).toFixed(0)}ms. Size: ${(size / 1024 / 1024).toFixed(2)} MB`);

                await set(key, table);
                console.log(`[ManifestManager] Saved ${tableName} to IndexedDB.`);
            } catch (err) {
                console.error(`[ManifestManager] FAILED to download/save ${tableName}:`, err);
                throw err;
            }
        } else {
            console.log(`[ManifestManager] Loaded ${tableName} from Cache.`);
        }

        return table;
    }

    /**
     * Gets multiple definitions by their hashes from a specific table.
     */
    static async getDefinitions(tableName: string, hashes: (number | string)[]): Promise<Record<string, any>> {
        console.log(`[ManifestManager] Looking up ${hashes.length} hashes from ${tableName}...`);
        const table = await this.loadTable(tableName);
        const results: Record<string, any> = {};

        // DEBUG: Log a sample of the table structure
        const tableKeys = Object.keys(table);
        console.log(`[ManifestManager] Table has ${tableKeys.length} entries. Sample keys:`, tableKeys.slice(0, 3));
        if (tableKeys.length > 0) {
            const sampleDef = table[tableKeys[0]];
            console.log(`[ManifestManager] Sample definition structure:`, {
                hash: sampleDef?.hash,
                name: sampleDef?.displayProperties?.name,
                icon: sampleDef?.displayProperties?.icon?.substring(0, 50)
            });
        }

        let foundCount = 0;
        for (const hash of hashes) {
            const hashStr = hash.toString();
            if (table[hashStr]) {
                results[hashStr] = table[hashStr];
                foundCount++;
            }
        }

        console.log(`[ManifestManager] Found ${foundCount} / ${hashes.length} definitions.`);
        return results;
    }
}
