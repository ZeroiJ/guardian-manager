export async function getTokensFromCode(code, env) {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: env.BUNGIE_CLIENT_ID,
        client_secret: env.BUNGIE_CLIENT_SECRET
    });

    const response = await fetch('https://www.bungie.net/Platform/App/OAuth/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch tokens: ${error}`);
    }

    return response.json();
}

export async function refreshAccessToken(refreshToken, env) {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.BUNGIE_CLIENT_ID,
        client_secret: env.BUNGIE_CLIENT_SECRET
    });

    const response = await fetch('https://www.bungie.net/Platform/App/OAuth/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    });

    if (!response.ok) {
        throw new Error('Failed to refresh token');
    }

    return response.json();
}
