export interface Env {
	BUNGIE_API_KEY: string;
	BUNGIE_CLIENT_ID: string;
	BUNGIE_CLIENT_SECRET: string;
}

export const getBungieConfig = (env: Env) => {
	return {
		apiKey: env.BUNGIE_API_KEY,
		clientId: env.BUNGIE_CLIENT_ID,
		clientSecret: env.BUNGIE_CLIENT_SECRET,
		authUrl: 'https://www.bungie.net/en/OAuth/Authorize',
		tokenUrl: 'https://www.bungie.net/Platform/App/OAuth/Token/',
	};
};
