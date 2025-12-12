import { getTokensFromCode } from '../../services/authService';
import { getDestinyMemberships } from '../../services/bungieService';
import { setSession } from '../../utils/session';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return new Response('No code provided', { status: 400 });
    }

    try {
        const tokenData = await getTokensFromCode(code, env);
        const destinyMemberships = await getDestinyMemberships(tokenData.access_token, env);

        if (!destinyMemberships) {
            return new Response('No Destiny 2 account found', { status: 400 });
        }

        const sessionData = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            membershipId: destinyMemberships.membershipId,
            membershipType: destinyMemberships.membershipType,
            expiresAt: Date.now() + (tokenData.expires_in * 1000)
        };

        const cookie = await setSession(sessionData, env);

        return new Response(null, {
            status: 302,
            headers: {
                'Location': '/dashboard',
                'Set-Cookie': cookie
            }
        });

    } catch (error) {
        return new Response(`Authentication failed: ${error.message}`, { status: 500 });
    }
}
