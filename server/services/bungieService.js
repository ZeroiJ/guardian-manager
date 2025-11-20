const axios = require('axios');
const { refreshAccessToken } = require('./authService');

const BUNGIE_API_ROOT = 'https://www.bungie.net/Platform';

async function getProfile(accessToken, membershipId, refreshToken) {
    const components = '100,200,201,205,300'; // Profiles, Characters, CharacterInventories, CharacterEquipment, ItemInstancedData
    const url = `${BUNGIE_API_ROOT}/Destiny2/3/Profile/${membershipId}/?components=${components}`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-API-Key': process.env.BUNGIE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.Response;
    } catch (error) {
        // Handle 401 Unauthorized (Token Expired)
        if (error.response && error.response.status === 401 && refreshToken) {
            console.log('Access token expired. Refreshing...');
            try {
                const newTokens = await refreshAccessToken(refreshToken);
                // Retry the request with the new token
                // Note: In a real app, you'd want to update the session with the new tokens here or in the route handler.
                // For simplicity, we'll return a special object indicating a refresh is needed, or just throw and let the route handle it.
                // Better approach: Let the route handler manage the refresh flow to update the session.
                throw { status: 401, message: 'TokenExpired', newTokens };
            } catch (refreshError) {
                console.error('Error refreshing token during profile fetch:', refreshError);
                throw refreshError;
            }
        }
        console.error('Error fetching profile:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getProfile };
