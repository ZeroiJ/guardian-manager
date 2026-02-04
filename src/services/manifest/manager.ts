import { get, set, keys, del } from 'idb-keyval';
import { APIClient } from '../api/client';

const MANIFEST_VERSION_KEY = 'manifest_version';
const TABLE_PREFIX = 'def:';
// CACHE_BUSTER: Increment this to force all users to re-download manifest data
const CACHE_BUSTER_VERSION = 'v2';

// In-memory cache for O(1) synchronous lookups after first load
const memoryCache: Map<string, Record<string, any>> = new Map();

export class ManifestManager {
    /**
     * Initializes the manifest. Checks for version updates and clears cache if needed.
     */
    static async initialize(): Promise<void> {
        if (typeof window === 'undefined') return; // Server-side guard

        try {
            const localVersion = await get(MANIFEST_VERSION_KEY);
            const remoteManifest = await APIClient.getManifestVersion();
            const remoteVersion = `${remoteManifest.version}_${CACHE_BUSTER_VERSION}`;

            if (localVersion !== remoteVersion) {
                console.log(`Manifest update detected: ${localVersion} -> ${remoteVersion}. Clearing cache...`);

                // Clear all keys with our prefix
                const allKeys = await keys();
                for (const key of allKeys) {
                    if (typeof key === 'string' && key.startsWith(TABLE_PREFIX)) {
                        await del(key);
                        console.log(`[ManifestManager] Cleared cached table: ${key}`);
                    }
                }

                await set(MANIFEST_VERSION_KEY, remoteVersion);
                console.log(`[ManifestManager] Cache cleared. New version: ${remoteVersion}`);
            }
        } catch (error) {
            console.error('Failed to initialize manifest manager:', error);
        }
    }

    /**
     * Ensures a specific table is loaded in IndexedDB and memory cache.
     * Returns synchronously from memory if already cached.
     */
    static async loadTable(tableName: string): Promise<Record<string, any>> {
        if (typeof window === 'undefined') return {}; // Server-side guard

        // Check memory cache first (instant)
        if (memoryCache.has(tableName)) {
            return memoryCache.get(tableName)!;
        }

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

        // Store in memory cache for instant future access
        memoryCache.set(tableName, table);
        return table;
    }

    /**
     * Synchronous lookup from memory cache. Returns empty object if not cached.
     * Use this when you know the table has already been loaded.
     */
    static getDefinitionsSync(tableName: string, hashes: (number | string)[]): Record<string, any> {
        const table = memoryCache.get(tableName);
        if (!table) return {};

        const results: Record<string, any> = {};
        for (const hash of hashes) {
            const hashStr = hash.toString();
            if (table[hashStr]) {
                results[hashStr] = table[hashStr];
            }
        }
        return results;
    }

    /**
     * Gets multiple definitions by their hashes from a specific table.
     */
    static async getDefinitions(tableName: string, hashes: (number | string)[]): Promise<Record<string, any>> {
        if (typeof window === 'undefined') return {}; // Server-side guard

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
