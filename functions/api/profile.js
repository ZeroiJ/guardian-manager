import { getSession, setSession } from '../utils/session';
import { getProfile } from '../services/bungieService';
import { refreshAccessToken } from '../services/authService';

export async function onRequest(context) {
    const { request, env } = context;
    const session = await getSession(request, env);

    if (!session || !session.accessToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const profileData = await getProfile(
            session.accessToken,
            session.membershipId,
            session.membershipType,
            env
        );
        return new Response(JSON.stringify(profileData), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        if (error.message === 'TokenExpired' && session.refreshToken) {
            try {
                const newTokens = await refreshAccessToken(session.refreshToken, env);

                // Update Session
                session.accessToken = newTokens.access_token;
                session.refreshToken = newTokens.refresh_token;
                session.expiresAt = Date.now() + (newTokens.expires_in * 1000);

                const cookie = await setSession(session, env);

                // Retry Profile Fetch
                const profileData = await getProfile(
                    session.accessToken,
                    session.membershipId,
                    session.membershipType,
                    env
                );

                return new Response(JSON.stringify(profileData), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': cookie
                    }
                });

            } catch (refreshErr) {
                return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });
            }
        }

        return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), { status: 500 });
    }
}
