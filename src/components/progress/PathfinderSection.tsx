import React, { useMemo } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { PursuitGrid } from './PursuitGrid';
import { PALE_HEART_PATHFINDER_NODE } from '@/data/constants';
import { ProgressItem, ProgressObjective } from '@/services/profile/types';
import { BungieImage } from '@/components/ui/BungieImage';

interface PathfinderSectionProps {
    characterId: string;
}

export function PathfinderSection({ characterId }: PathfinderSectionProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    const characterRecords = rawProfile?.characterRecords?.data?.[characterId]?.records || {};

    // 1. Fetch Node Definition
    const { definitions: nodeDefs } = useDefinitions('DestinyPresentationNodeDefinition', [PALE_HEART_PATHFINDER_NODE]);
    const nodeDef = nodeDefs?.[PALE_HEART_PATHFINDER_NODE];

    // 2. Extract Record Hashes
    const recordHashes = useMemo(() => {
        if (!nodeDef?.children?.records) return [];
        return nodeDef.children.records.map((r: any) => r.recordHash);
    }, [nodeDef]);

    // 3. Fetch Record Definitions
    const { definitions: recordDefs, loading } = useDefinitions('DestinyRecordDefinition', recordHashes);

    // 4. Build Items
    const items = useMemo(() => {
        if (loading || !recordDefs || recordHashes.length === 0) return [];

        return recordHashes.map((hash: number) => {
            const def = recordDefs[hash];
            const record = characterRecords[hash];
            
            if (!def) return null;

            // Check State
            // State is a bitmask: 0=None, 1=Redeemed, 2=Unavailable, 4=ObjectiveNotCompleted, etc.
            // Simplified: If not 4 (ObjectiveNotCompleted), it's complete?
            // Actually record.state & 4 == 0 means complete.
            // record.state & 1 means redeemed.
            
            const state = record?.state || 0;
            const isObjectiveIncomplete = (state & 4) !== 0;
            const isRedeemed = (state & 1) !== 0;
            const isComplete = !isObjectiveIncomplete;

            // Objectives
            const objectives: ProgressObjective[] = [];
            if (record?.objectives) {
                record.objectives.forEach((obj: any) => {
                    objectives.push({
                        objectiveHash: obj.objectiveHash,
                        progress: obj.progress || 0,
                        completionValue: obj.completionValue || 1,
                        complete: obj.complete,
                        description: "Pathfinder Objective" // Need Obj Def
                    });
                });
            }

            return {
                hash,
                name: def.displayProperties?.name,
                icon: def.displayProperties?.icon,
                description: def.displayProperties?.description,
                type: 'Pathfinder',
                percent: isComplete ? 100 : (objectives.length > 0 ? (objectives[0].progress / objectives[0].completionValue * 100) : 0),
                isComplete,
                objectives,
                rewards: []
            } as ProgressItem;
        }).filter((i): i is ProgressItem => i !== null);

    }, [recordHashes, recordDefs, characterRecords, loading]);

    if (!items || items.length === 0) return null;

    // Layout: Pyramid (6, 5, 4, 3, 2, 1) or similar. 
    // For now, just a grid is fine, but let's try to mimic the grouping if possible.
    // The node definition usually orders them for the tree.
    // DIM splits them into rows.
    
    // Simple Grid for MVP
    return (
        <PursuitGrid 
            title={nodeDef?.displayProperties?.name || "Pathfinder"} 
            items={items} 
        />
    );
}
