const BUNGIE_API_ROOT = 'https://www.bungie.net/Platform';

export async function getDestinyMemberships(accessToken, env) {
    const response = await fetch(`${BUNGIE_API_ROOT}/User/GetMembershipsForCurrentUser/`, {
        headers: {
            'X-API-Key': env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch memberships');
    }

    const data = await response.json();
    const responseData = data.Response;

    const primary = responseData.primaryDestinyMembership;

    if (primary) {
        return {
            membershipId: primary.membershipId,
            membershipType: primary.membershipType
        };
    } else if (responseData.destinyMemberships && responseData.destinyMemberships.length > 0) {
        return {
            membershipId: responseData.destinyMemberships[0].membershipId,
            membershipType: responseData.destinyMemberships[0].membershipType
        };
    }
    return null;
}

export async function getProfile(accessToken, membershipId, membershipType, env) {
    const components = '100,102,200,201,205,300';
    const url = `${BUNGIE_API_ROOT}/Destiny2/${membershipType}/Profile/${membershipId}/?components=${components}`;

    const response = await fetch(url, {
        headers: {
            'X-API-Key': env.BUNGIE_API_KEY,
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('TokenExpired');
        }
        throw new Error('Failed to fetch profile');
    }

    const data = await response.json();
    return data.Response;
}
