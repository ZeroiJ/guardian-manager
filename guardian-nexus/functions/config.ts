export interface Env {
	BUNGIE_API_KEY: string;
	BUNGIE_CLIENT_ID: string;
	BUNGIE_CLIENT_SECRET: string;
    guardian_kv: KVNamespace;
    guardian_db: D1Database;
}

export const getBungieConfig = (env: Env) => {
	const missing = [];
	if (!env.BUNGIE_API_KEY) missing.push('BUNGIE_API_KEY');
	if (!env.BUNGIE_CLIENT_ID) missing.push('BUNGIE_CLIENT_ID');
	if (!env.BUNGIE_CLIENT_SECRET) missing.push('BUNGIE_CLIENT_SECRET');

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	return {
		apiKey: env.BUNGIE_API_KEY,
		clientId: env.BUNGIE_CLIENT_ID,
		clientSecret: env.BUNGIE_CLIENT_SECRET,
		authUrl: 'https://www.bungie.net/en/OAuth/Authorize',
		tokenUrl: 'https://www.bungie.net/Platform/App/OAuth/Token/',
	};
};
