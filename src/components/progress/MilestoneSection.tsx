import React, { useMemo } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { PursuitGrid } from './PursuitGrid';
import { ProgressItem, ProgressObjective } from '@/services/profile/types';

interface MilestoneSectionProps {
    characterId: string;
}

export function MilestoneSection({ characterId }: MilestoneSectionProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    
    // 1. Get Milestones
    const milestones = useMemo(() => {
        if (!rawProfile?.characterProgressions?.data?.[characterId]?.milestones) return [];
        return Object.values(rawProfile.characterProgressions.data[characterId].milestones);
    }, [rawProfile, characterId]);

    // 2. Get Definitions
    const milestoneHashes = useMemo(() => milestones.map((m: any) => m.milestoneHash), [milestones]);
    const { definitions, loading } = useDefinitions('DestinyMilestoneDefinition', milestoneHashes);

    // 3. Process Milestones into ProgressItems
    const items = useMemo(() => {
        if (loading || !definitions) return [];
        const result: ProgressItem[] = [];

        milestones.forEach((m: any) => {
            const def = definitions[m.milestoneHash];
            if (!def) return;

            // Simplified Filtering Logic (similar to DIM)
            const hasQuests = m.availableQuests && m.availableQuests.length > 0;
            const hasActivities = m.activities && m.activities.length > 0;
            const hasRewards = m.rewards && m.rewards.some((r: any) => !r.earned);

            // Filter out completed/empty milestones unless they have rewards waiting
            if (!hasQuests && !hasActivities && !hasRewards) return;

            // Build Objectives
            let objectives: ProgressObjective[] = [];
            let percent = 0;

            if (hasQuests) {
                // Use the first quest's objectives
                const quest = m.availableQuests[0];
                if (quest.status.stepObjectives) {
                    objectives = quest.status.stepObjectives.map((obj: any) => ({
                        objectiveHash: obj.objectiveHash,
                        progress: obj.progress || 0,
                        completionValue: obj.completionValue || 1,
                        complete: obj.complete,
                        description: "Milestone Objective" // Requires Objective Def lookup, skipping for now
                    }));
                }
            } else if (hasActivities) {
                // Use the first activity's challenges
                const activity = m.activities[0];
                if (activity.challenges) {
                    objectives = activity.challenges.map((c: any) => ({
                        objectiveHash: c.objective.objectiveHash,
                        progress: c.objective.progress || 0,
                        completionValue: c.objective.completionValue || 1,
                        complete: c.objective.complete,
                        description: "Challenge"
                    }));
                }
            }

            // Calculate overall percent
            if (objectives.length > 0) {
                const totalProgress = objectives.reduce((acc, obj) => acc + (obj.progress / obj.completionValue), 0);
                percent = (totalProgress / objectives.length) * 100;
            }

            // Determine if complete (has rewards ready)
            const isComplete = hasRewards || (objectives.length > 0 && objectives.every(o => o.complete));

            result.push({
                hash: m.milestoneHash,
                // instanceId: undefined, 
                name: def.displayProperties?.name || "Unknown Milestone",
                icon: def.displayProperties?.icon,
                description: def.displayProperties?.description,
                type: 'Milestone',
                percent: Math.min(100, percent),
                isComplete,
                objectives,
                rewards: [] // Rewards logic is complex (needs reward definitions), skipping for MVP
            });
        });

        return result;
    }, [milestones, definitions, loading]);

    if (items.length === 0) return null;

    return (
        <PursuitGrid 
            title="Milestones" 
            items={items} 
        />
    );
}
