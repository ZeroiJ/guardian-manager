import { Env, getBungieConfig } from '../config';

/**
 * Refreshes the Bungie OAuth tokens using the provided Refresh Token.
 * @see https://github.com/Bungie-net/api/wiki/OAuth-Documentation#refreshing-the-access-token
 */
export async function refreshBungieTokens(refreshToken: string, env: Env) {
    const config = getBungieConfig(env);

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Auth] Token refresh failed: ${response.status} - ${errorText}`);
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json();
}
