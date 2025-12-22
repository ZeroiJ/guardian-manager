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
            console.log(`Downloading manifest table: ${tableName}...`);
            table = await APIClient.getDefinitions(tableName);
            await set(key, table);
        }

        return table;
    }

    /**
     * Gets multiple definitions by their hashes from a specific table.
     */
    static async getDefinitions(tableName: string, hashes: (number | string)[]): Promise<Record<string, any>> {
        const table = await this.loadTable(tableName);
        const results: Record<string, any> = {};
        
        for (const hash of hashes) {
            const hashStr = hash.toString();
            if (table[hashStr]) {
                results[hashStr] = table[hashStr];
            }
        }
        
        return results;
    }
}
