const axios = require('axios');
const { refreshAccessToken } = require('./authService');

const BUNGIE_API_ROOT = 'https://www.bungie.net/Platform';

// Helper to handle API errors and token refresh
async function bungieRequest(url, accessToken, refreshToken, retry = true) {
    try {
        const response = await axios.get(url, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.Response;
    } catch (error) {
        if (retry && error.response && error.response.status === 401 && refreshToken) {
            console.log('Access token expired. Refreshing...');
            try {
                const newTokens = await refreshAccessToken(refreshToken);
                // We return the new tokens so the caller can update the session
                // But here we just retry the request with the new token
                // Note: The caller won't know the token changed unless we return it.
                // For now, let's just throw a specific error that the route handler can catch to refresh.
                throw { status: 401, message: 'TokenExpired', newTokens };
            } catch (refreshError) {
                throw refreshError;
            }
        }
        throw error;
    }
}

async function getDestinyMemberships(accessToken) {
    const url = `${BUNGIE_API_ROOT}/User/GetMembershipsForCurrentUser/`;
    try {
        const response = await axios.get(url, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = response.data.Response;
        // Find the primary membership (Cross Save) or the first Destiny membership
        const primary = data.primaryDestinyMembership;

        if (primary) {
            return {
                membershipId: primary.membershipId,
                membershipType: primary.membershipType
            };
        } else if (data.destinyMemberships && data.destinyMemberships.length > 0) {
            // Fallback to first membership
            return {
                membershipId: data.destinyMemberships[0].membershipId,
                membershipType: data.destinyMemberships[0].membershipType
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching memberships:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getProfile(accessToken, membershipId, membershipType, refreshToken) {
    const components = '100,200,201,205,300';
    const url = `${BUNGIE_API_ROOT}/Destiny2/${membershipType}/Profile/${membershipId}/?components=${components}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.Response;
    } catch (error) {
        console.error('Error fetching profile:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getProfile, getDestinyMemberships };
