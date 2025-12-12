import { getDefinitions } from '../../services/manifestService';

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { hashes, tableName } = await request.json();
        const table = tableName || 'DestinyInventoryItemDefinition';

        const definitions = await getDefinitions(table, hashes, env);

        return new Response(JSON.stringify(definitions), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch definitions' }), { status: 500 });
    }
}
