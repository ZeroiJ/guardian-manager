export async function onRequest(context) {
    const { env } = context;
    const authUrl = `https://www.bungie.net/en/OAuth/Authorize?client_id=${env.BUNGIE_CLIENT_ID}&response_type=code`;

    return Response.redirect(authUrl, 302);
}
