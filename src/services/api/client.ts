import { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

// Use relative path for all environments (Cloudflare Pages Functions or Vite Proxy)
export const API_BASE_URL = '';

export class APIClient {
    private static async request<T>(path: string, options?: RequestInit): Promise<T> {
        // Construct URL
        const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

        console.log(`[APIClient] Requesting: ${options?.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include',
            });

            console.log(`[APIClient] Response status: ${response.status} for ${url}`);

            if (!response.ok) {
                // Try to get error details
                let errorBody = '';
                try {
                    errorBody = await response.text();
                    console.error(`[APIClient] Error response body:`, errorBody);
                } catch (e) {
                    console.error(`[APIClient] Could not read error body`);
                }

                if (response.status === 401) {
                    console.warn('[APIClient] Unauthorized - redirecting to login');
                    // If unauthorized, redirect to login
                    // if (typeof window !== 'undefined') {
                    //     window.location.href = `/api/auth/login`;
                    // }
                    throw new Error('Unauthorized - redirecting to login');
                }

                throw new Error(`API Error ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`);
            }

            const data = await response.json();
            console.log(`[APIClient] Success response for ${url}:`, data);
            return data as T;
        } catch (err) {
            console.error(`[APIClient] Request failed for ${url}:`, err);
            throw err;
        }
    }

    /**
     * Fetches the full Destiny profile for the authenticated user.
     * Proxies through our Cloudflare Worker to include metadata.
     */
    static async getProfile(): Promise<DestinyProfileResponse> {
        return this.request<DestinyProfileResponse>('/api/profile');
    }

    /**
     * Fetches the current Bungie manifest metadata.
     */
    static async getManifestVersion(): Promise<any> {
        return this.request('/api/manifest/version');
    }

    /**
     * Fetches a specific definition table from the manifest.
     */
    static async getDefinitions(table: string): Promise<Record<string, any>> {
        return this.request(`/api/manifest/definitions/${table}`);
    }

    /**
     * Fetches user metadata (tags, notes) from our D1 database.
     */
    static async getMetadata(): Promise<{ tags: Record<string, string>, notes: Record<string, string> }> {
        return this.request('/api/metadata');
    }

    /**
     * Updates user metadata for an item.
     */
    static async updateMetadata(itemId: string, type: 'tag' | 'note', value: string | null): Promise<void> {
        return this.request('/api/metadata', {
            method: 'POST',
            body: JSON.stringify({ itemId, type, value }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Transfers an item from source to destination.
     * Uses the Bungie API /Actions/Items/TransferItem/ endpoint.
     */
    static async transferItem(
        itemHash: number,
        itemInstanceId: string,
        characterId: string,
        transferToVault: boolean,
        stackSize: number = 1
    ): Promise<void> {
        // Bungie API Body Format
        const body = {
            itemReferenceHash: itemHash,
            stackSize: stackSize,
            transferToVault: transferToVault,
            itemId: itemInstanceId,
            characterId: characterId,
            membershipType: 3 // BungieMembershipType.TigerSteam (Hardcoded for now, should be dynamic)
        };

        // TODO: Get membershipType from profile/auth context
        // For now, most PC players are 3. Consoles are 1/2.
        // We'll trust the API works or fix this later.

        return this.request('/api/actions/transfer', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
