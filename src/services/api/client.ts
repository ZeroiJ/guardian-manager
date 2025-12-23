import { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

// In development, use relative path to use Vite proxy. In production, use full Worker URL.
export const API_BASE_URL = import.meta.env.PROD 
    ? 'https://guardian-nexus-api.zeroij.workers.dev'
    : '';

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
                // For login, we ALWAYS want the full backend URL, even in dev (to init OAuth)
                const authBase = 'https://guardian-nexus-api.zeroij.workers.dev';
                window.location.href = `${authBase}/auth/login`;
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
}
