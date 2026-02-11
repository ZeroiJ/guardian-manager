import { APIClient } from '../api/client';

export interface TransferRequest {
    itemInstanceId: string;
    itemHash: number;
    sourceId: string; // characterId or 'vault'
    targetId: string; // characterId or 'vault'
    membershipType: number;
}

export class TransferService {
    private static inProgress = new Set<string>();

    /**
     * Executes a smart transfer between any two locations.
     * Handles the multi-step Bungie API flow (e.g. Char -> Vault -> Char).
     */
    static async moveItem(request: TransferRequest): Promise<void> {
        const { itemInstanceId, itemHash, sourceId, targetId, membershipType } = request;

        if (sourceId === targetId) return;
        if (this.inProgress.has(itemInstanceId)) throw new Error('Transfer already in progress for this item');

        this.inProgress.add(itemInstanceId);

        try {
            console.log(`[TransferService] Moving ${itemInstanceId} from ${sourceId} to ${targetId}`);

            // Validate IDs
            if (sourceId === 'unknown' || targetId === 'unknown') {
                throw new Error('Invalid transfer: Source or Target ID is unknown');
            }

            // Case A: To Vault (Character -> Vault)
            if (targetId === 'vault') {
                if (sourceId === 'vault') return; // No-op
                // characterId must be the CURRENT owner (Source)
                await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true, membershipType);
            }
            // Case B: From Vault (Vault -> Character)
            else if (sourceId === 'vault') {
                // characterId must be the RECEIVING character (Target)
                await APIClient.transferItem(itemHash, itemInstanceId, targetId, false, membershipType);
            }
            // Case C: Character to Character (Char A -> Vault -> Char B)
            else {
                console.log(`[TransferService] Multi-hop: ${sourceId} -> Vault -> ${targetId}`);

                // Step 1: Char A -> Vault
                // transferToVault = true, characterId = sourceId
                await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true, membershipType);

                // Step 2: Vault -> Char B
                // transferToVault = false, characterId = targetId
                await APIClient.transferItem(itemHash, itemInstanceId, targetId, false, membershipType);
            }

            console.log(`[TransferService] Transfer complete: ${itemInstanceId}`);
        } finally {
            this.inProgress.delete(itemInstanceId);
        }
    }
}
