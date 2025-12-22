import { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

export const API_BASE_URL = 'https://guardian-nexus-api.zeroij.workers.dev';

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
                window.location.href = `${API_BASE_URL}/auth/login`;
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
}
