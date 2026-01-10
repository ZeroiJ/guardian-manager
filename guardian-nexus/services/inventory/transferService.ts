import { APIClient } from '../api/client';

export interface TransferRequest {
    itemInstanceId: string;
    itemHash: number;
    sourceId: string; // characterId or 'vault'
    targetId: string; // characterId or 'vault'
}

export class TransferService {
    private static inProgress = new Set<string>();

    /**
     * Executes a smart transfer between any two locations.
     * Handles the multi-step Bungie API flow (e.g. Char -> Vault -> Char).
     */
    static async moveItem(request: TransferRequest): Promise<void> {
        const { itemInstanceId, itemHash, sourceId, targetId } = request;

        if (sourceId === targetId) return;
        if (this.inProgress.has(itemInstanceId)) throw new Error('Transfer already in progress for this item');

        this.inProgress.add(itemInstanceId);

        try {
            console.log(`[TransferService] Moving ${itemInstanceId} from ${sourceId} to ${targetId}`);

            // Case 1: Source is Vault -> Move to Char
            if (sourceId === 'vault') {
                await APIClient.transferItem(itemHash, itemInstanceId, targetId, false);
            }
            // Case 2: Target is Vault -> Move from Char
            else if (targetId === 'vault') {
                await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true);
            }
            // Case 3: Char to Char -> Multi-hop
            else {
                console.log(`[TransferService] Multi-hop: ${sourceId} -> Vault -> ${targetId}`);
                
                // Step 1: Source Char -> Vault
                await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true);
                
                // Step 2: Vault -> Target Char
                await APIClient.transferItem(itemHash, itemInstanceId, targetId, false);
            }

            console.log(`[TransferService] Transfer complete: ${itemInstanceId}`);
        } finally {
            this.inProgress.delete(itemInstanceId);
        }
    }
}
