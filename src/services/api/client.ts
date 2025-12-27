import { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

// Use relative path for all environments (Cloudflare Pages Functions or Vite Proxy)
export const API_BASE_URL = '';

export class APIClient {
    private static async request<T>(path: string, options?: RequestInit): Promise<T> {
        // Construct URL
        const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
        
        const response = await fetch(url, {
            ...options,
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
                // If unauthorized, redirect to login
                window.location.href = `/api/auth/login`;
                throw new Error('Unauthorized');
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
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
        // TODO: Implement the backend endpoint for this
        // return this.request('/api/metadata');
        return { tags: {}, notes: {} }; // Stub for now
    }

    /**
     * Updates user metadata for an item.
     */
    static async updateMetadata(itemId: string, type: 'tag' | 'note', value: string | null): Promise<void> {
        // TODO: Implement the backend endpoint for this
        // return this.request('/api/metadata', {
        //     method: 'POST',
        //     body: JSON.stringify({ itemId, type, value })
        // });
        console.log(`[Stub] Updating ${type} for ${itemId} to ${value}`);
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
