import { APIClient } from '../api/client';

export interface TransferRequest {
    itemInstanceId: string;
    itemHash: number;
    sourceId: string; // characterId or 'vault'
    targetId: string; // characterId or 'vault'
    membershipType: number;
    /** If true, item is in the postmaster — use PullFromPostmaster instead of TransferItem */
    isPostmaster?: boolean;
}

export class TransferService {
    private static inProgress = new Set<string>();

    /**
     * Executes a smart transfer between any two locations.
     * Handles the multi-step Bungie API flow (e.g. Char -> Vault -> Char).
     * Also handles postmaster items via PullFromPostmaster.
     */
    static async moveItem(request: TransferRequest): Promise<void> {
        const { itemInstanceId, itemHash, sourceId, targetId, membershipType, isPostmaster } = request;

        if (sourceId === targetId && !isPostmaster) return;
        if (this.inProgress.has(itemInstanceId)) throw new Error('Transfer already in progress for this item');

        this.inProgress.add(itemInstanceId);

        try {
            console.log(`[TransferService] Moving ${itemInstanceId} from ${sourceId} to ${targetId}${isPostmaster ? ' (postmaster)' : ''}`);

            // Validate IDs
            if (sourceId === 'unknown' || targetId === 'unknown') {
                throw new Error('Invalid transfer: Source or Target ID is unknown');
            }

            // Postmaster: must use PullFromPostmaster API
            if (isPostmaster) {
                // Pull to the owning character first
                await APIClient.pullFromPostmaster(itemHash, itemInstanceId, sourceId, membershipType);
                // If target is vault or a different character, do a follow-up transfer
                if (targetId === 'vault') {
                    await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true, membershipType);
                } else if (targetId !== sourceId) {
                    await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true, membershipType);
                    await APIClient.transferItem(itemHash, itemInstanceId, targetId, false, membershipType);
                }
                return;
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
                await APIClient.transferItem(itemHash, itemInstanceId, sourceId, true, membershipType);

                // Step 2: Vault -> Char B
                await APIClient.transferItem(itemHash, itemInstanceId, targetId, false, membershipType);
            }

            console.log(`[TransferService] Transfer complete: ${itemInstanceId}`);
        } finally {
            this.inProgress.delete(itemInstanceId);
        }
    }
}
