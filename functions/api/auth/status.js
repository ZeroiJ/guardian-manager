import { getSession } from '../../utils/session';

export async function onRequest(context) {
    const { request, env } = context;
    const session = await getSession(request, env);

    if (session && session.accessToken) {
        return new Response(JSON.stringify({
            isAuthenticated: true,
            membershipId: session.membershipId
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } else {
        return new Response(JSON.stringify({ isAuthenticated: false }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
