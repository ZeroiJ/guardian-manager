import re

with open("src/lib/bungie/equipManager.ts", "r") as f:
    content = f.read()

new_api_call = """
interface EquipLoadoutBody {
    loadoutIndex: number;
    characterId: string;
    membershipType: number;
}

/**
 * Calls the `/api/actions/equipLoadout` Cloudflare Worker proxy.
 */
export async function callEquipLoadoutEndpoint(
    body: EquipLoadoutBody
): Promise<any> {
    const response = await fetch('/api/actions/equipLoadout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`EquipLoadout API Error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.ErrorCode && data.ErrorCode !== 1) {
        throw new Error(
            `Bungie API Error ${data.ErrorCode} (${data.ErrorStatus}): ${data.Message}`
        );
    }

    return data?.Response;
}

/**
 * Applies an in-game loadout directly via Bungie's EquipLoadout endpoint.
 */
export async function applyInGameLoadout(
    characterId: string,
    loadoutIndex: number
): Promise<{ success: boolean; error?: string }> {
    const membershipType = getMembershipType();
    
    console.log(`[EquipManager] Applying in-game loadout index ${loadoutIndex} on character ${characterId}`);
    
    try {
        await callEquipLoadoutEndpoint({
            loadoutIndex,
            characterId,
            membershipType
        });
        return { success: true };
    } catch (err: any) {
        console.error(`[EquipManager] Failed to apply in-game loadout:`, err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}
"""

# Insert before "export async function applyLoadout"
content = content.replace("export async function applyLoadout(", new_api_call + "\nexport async function applyLoadout(")

with open("src/lib/bungie/equipManager.ts", "w") as f:
    f.write(content)
