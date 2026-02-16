import React, { useMemo } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { PursuitGrid } from './PursuitGrid';
import { RAID_ACTIVITY_TYPE, RAID_MILESTONE_HASHES } from '@/data/constants';
import { ProgressItem, ProgressObjective } from '@/services/profile/types';
import { BungieImage } from '@/components/ui/BungieImage';

interface RaidSectionProps {
    characterId: string;
}

export function RaidSection({ characterId }: RaidSectionProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    const milestones = rawProfile?.characterProgressions?.data?.[characterId]?.milestones || {};

    // 1. Get All Milestone Hashes
    const allMilestoneHashes = useMemo(() => Object.keys(milestones).map(Number), [milestones]);
    
    // 2. Fetch Milestone Definitions
    const { definitions: milestoneDefs, loading: msLoading } = useDefinitions('DestinyMilestoneDefinition', allMilestoneHashes);

    // 3. Identify Raid Milestones
    const raidMilestoneHashes = useMemo(() => {
        if (msLoading || !milestoneDefs) return [];
        return allMilestoneHashes.filter(hash => {
            const def = milestoneDefs[hash];
            if (!def) return false;
            
            // Check known hash list
            if (RAID_MILESTONE_HASHES.includes(hash)) return true;

            // Check if activity type is RAID
            // Note: We need Activity Definitions to check activityTypeHash. 
            // This is a limitation without pre-fetching ActivityDefs.
            // For MVP, we might miss some raids if not in known list or simple check.
            
            // Heuristic: Check "Raid" in name?
            // Or rely on `RAID_MILESTONE_HASHES` being complete?
            // Let's rely on name for now as fallback.
            return def.displayProperties?.name?.toLowerCase().includes('raid') || 
                   def.displayProperties?.description?.toLowerCase().includes('raid');
        });
    }, [milestoneDefs, msLoading, allMilestoneHashes]);

    // 4. Build Items
    const items = useMemo(() => {
        if (raidMilestoneHashes.length === 0) return [];
        
        return raidMilestoneHashes.map(hash => {
            const m = milestones[hash];
            const def = milestoneDefs[hash];
            if (!def) return null;

            // Determine if "Featured" (has rewards)
            const hasRewards = m.rewards && m.rewards.some((r: any) => !r.earned);
            
            // Objectives (Challenges)
            let objectives: ProgressObjective[] = [];
            if (m.activities) {
                 m.activities.forEach((act: any) => {
                     if (act.challenges) {
                         act.challenges.forEach((c: any) => {
                             objectives.push({
                                 objectiveHash: c.objective.objectiveHash,
                                 progress: c.objective.progress || 0,
                                 completionValue: c.objective.completionValue || 1,
                                 complete: c.objective.complete,
                                 description: "Encounter Challenge"
                             });
                         });
                     }
                 });
            }

            return {
                hash,
                name: def.displayProperties?.name,
                icon: def.displayProperties?.icon,
                description: def.displayProperties?.description,
                type: 'Raid',
                percent: hasRewards ? 0 : 100, // Show empty if rewards available? Or 100 if done?
                isComplete: !hasRewards,
                objectives,
                rewards: []
            } as ProgressItem;

        }).filter((i): i is ProgressItem => i !== null);

    }, [raidMilestoneHashes, milestones, milestoneDefs]);

    if (!items || items.length === 0) return null;

    return (
        <PursuitGrid 
            title="Raids" 
            items={items} 
        />
    );
}
