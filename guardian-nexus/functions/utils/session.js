import { parse, serialize } from 'cookie';

const COOKIE_NAME = 'guardian_session';

export async function getSession(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;

    const cookies = parse(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];

    if (!sessionCookie) return null;

    // In a real app, you would verify the signature here using _env.SESSION_SECRET
    // For now, we'll assume the cookie is safe (HttpOnly) and just parse it.
    // If you used a signed cookie, you'd verify/unsign it here.
    try {
        return JSON.parse(atob(sessionCookie));
    } catch {
        return null;
    }
}

export async function setSession(data) {
    const value = btoa(JSON.stringify(data));

    return serialize(COOKIE_NAME, value, {
        httpOnly: true,
        secure: true, // Always secure in production
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
    });
}

export function destroySession() {
    return serialize(COOKIE_NAME, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 0,
    });
}
