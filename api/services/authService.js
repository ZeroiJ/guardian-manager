const axios = require('axios');
const qs = require('qs');

const TOKEN_URL = 'https://www.bungie.net/Platform/App/OAuth/token/';

async function getTokensFromCode(code) {
    const data = qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.BUNGIE_CLIENT_ID,
        client_secret: process.env.BUNGIE_CLIENT_SECRET
    });

    try {
        const response = await axios.post(TOKEN_URL, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching tokens:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function refreshAccessToken(refreshToken) {
    const data = qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.BUNGIE_CLIENT_ID,
        client_secret: process.env.BUNGIE_CLIENT_SECRET
    });

    try {
        const response = await axios.post(TOKEN_URL, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getTokensFromCode, refreshAccessToken };
