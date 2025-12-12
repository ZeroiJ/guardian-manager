import { destroySession } from '../../utils/session';

export async function onRequest(context) {
    const cookie = destroySession();

    return new Response(JSON.stringify({ success: true }), {
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie
        }
    });
}
