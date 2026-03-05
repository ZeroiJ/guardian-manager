/**
 * Presentation Node Tree Builder — Collections, Triumphs, Seals, Metrics.
 *
 * Recursively builds a browsable tree from Bungie's DestinyPresentationNodeDefinition
 * hierarchy. Ported from DIM: src/app/records/presentation-nodes.ts
 *
 * Architecture:
 * - Root nodes come from profileResponse (collectionCategoriesRootNodeHash, etc.)
 * - Each node can be a branch (children: presentationNodes) or leaf (records/collectibles/metrics)
 * - Completion tracking: visible/acquired counts bubble up from leaves
 * - Seals identified by completionRecordHash on the presentation node definition
 */

// ============================================================================
// TYPES
// ============================================================================

/** A node in the presentation tree (branch or leaf) */
export interface PresentationNode {
    /** Presentation node definition hash */
    hash: number;
    /** Display name */
    name: string;
    /** Icon path */
    icon: string;
    /** Total visible items (non-invisible, non-fake) */
    visible: number;
    /** Total acquired/completed items */
    acquired: number;
    /** Child presentation nodes (branch nodes) */
    childPresentationNodes?: PresentationNode[];
    /** Leaf records (triumphs) */
    records?: RecordNode[];
    /** Leaf collectibles */
    collectibles?: CollectibleNode[];
    /** Leaf metrics */
    metrics?: MetricNode[];
    /** Seal/title info (only if this node is a seal) */
    titleInfo?: TitleInfo;
    /** Raw node definition for additional data access */
    nodeDef?: any;
}

/** A single record/triumph */
export interface RecordNode {
    /** Record definition hash */
    hash: number;
    /** Display name */
    name: string;
    /** Description */
    description: string;
    /** Icon path */
    icon: string;
    /** Whether redeemed (completed) */
    isRedeemed: boolean;
    /** Whether the objective is incomplete */
    isObjectiveIncomplete: boolean;
    /** Triumph score */
    score: number;
    /** Whether tracked in game */
    trackedInGame: boolean;
    /** Objective progress (array of objectives) */
    objectives: ObjectiveProgress[];
    /** Raw record component from profile */
    recordComponent: any;
}

/** A single collectible */
export interface CollectibleNode {
    /** Collectible definition hash */
    hash: number;
    /** Item definition hash (the item this collectible represents) */
    itemHash: number;
    /** Display name */
    name: string;
    /** Icon path */
    icon: string;
    /** Whether acquired */
    isAcquired: boolean;
    /** Raw state bitmask */
    state: number;
}

/** A single metric */
export interface MetricNode {
    /** Metric definition hash */
    hash: number;
    /** Display name */
    name: string;
    /** Icon path */
    icon: string;
    /** Whether the objective is complete */
    isComplete: boolean;
    /** Current objective progress */
    objectiveProgress: ObjectiveProgress | null;
}

/** Objective progress for records/metrics */
export interface ObjectiveProgress {
    /** Objective definition hash */
    objectiveHash: number;
    /** Current progress value */
    progress: number;
    /** Completion value (target) */
    completionValue: number;
    /** Whether complete */
    complete: boolean;
    /** Display name (from objective definition) */
    description?: string;
}

/** Title/seal info */
export interface TitleInfo {
    /** Title text */
    title: string;
    /** Whether the seal is completed */
    isCompleted: boolean;
    /** Number of times gilded */
    gildedNum: number;
    /** Whether gilded for current season */
    isGildedForCurrentSeason: boolean;
}

/** Context object passed to the tree builder */
export interface TreeBuilderContext {
    /** Manifest definitions (keyed by hash) */
    presentationNodeDefs: Record<string, any>;
    recordDefs: Record<string, any>;
    collectibleDefs: Record<string, any>;
    metricDefs: Record<string, any>;
    objectiveDefs: Record<string, any>;
    itemDefs: Record<string, any>;
    /** Raw profile response */
    profileResponse: any;
}

// ============================================================================
// STATE BIT FLAGS (from Bungie API enums)
// ============================================================================

/** DestinyPresentationNodeState */
const PresentationNodeState = {
    Invisible: 1,
};

/** DestinyRecordState */
const RecordState = {
    RecordRedeemed: 1,
    ObjectiveNotCompleted: 4,
    Obscured: 8,
    Invisible: 16,
};

/** DestinyCollectibleState */
const CollectibleState = {
    NotAcquired: 1,
    Obscured: 2,
    Invisible: 4,
    CannotAffordMaterialRequirements: 8,
};

// ============================================================================
// ROOT NODE HASH EXTRACTION
// ============================================================================

/**
 * Extract root presentation node hashes from the profile response.
 */
export function getRootNodeHashes(profileResponse: any): {
    collectionsRoot: number | null;
    triumphsRoot: number | null;
    sealsRoot: number | null;
    metricsRoot: number | null;
} {
    const collectibles = profileResponse?.profileCollectibles?.data;
    const records = profileResponse?.profileRecords?.data;
    const metrics = profileResponse?.metrics?.data;

    return {
        collectionsRoot: collectibles?.collectionCategoriesRootNodeHash ?? null,
        triumphsRoot: records?.recordCategoriesRootNodeHash ?? null,
        sealsRoot: records?.recordSealsRootNodeHash ?? null,
        metricsRoot: metrics?.metricsRootNodeHash ?? null,
    };
}

// ============================================================================
// SCOPE RESOLUTION
// ============================================================================

/**
 * Get record component from profile, handling scope (profile vs character).
 * For character-scoped records, takes the first character.
 */
function getRecordComponent(
    recordHash: number,
    recordDef: any,
    profileResponse: any,
): any | undefined {
    const scope = recordDef?.scope;
    if (scope === 1) { // DestinyScope.Character
        const charRecords = profileResponse?.characterRecords?.data;
        if (!charRecords) return undefined;
        const firstCharId = Object.keys(charRecords)[0];
        return charRecords[firstCharId]?.records?.[recordHash];
    }
    return profileResponse?.profileRecords?.data?.records?.[recordHash];
}

/**
 * Get collectible state from profile, handling scope.
 * For character-scoped collectibles, takes the best (most-unlocked) across all characters.
 */
function getCollectibleState(
    collectibleHash: number,
    collectibleDef: any,
    profileResponse: any,
): number {
    const scope = collectibleDef?.scope;
    if (scope === 1) { // DestinyScope.Character
        const charCollectibles = profileResponse?.characterCollectibles?.data;
        if (!charCollectibles) return CollectibleState.NotAcquired;
        let bestState = Number.MAX_SAFE_INTEGER;
        for (const charData of Object.values(charCollectibles)) {
            const state = (charData as any)?.collectibles?.[collectibleHash]?.state;
            if (state !== undefined && state < bestState) {
                bestState = state;
            }
        }
        return bestState === Number.MAX_SAFE_INTEGER ? CollectibleState.NotAcquired : bestState;
    }
    return profileResponse?.profileCollectibles?.data?.collectibles?.[collectibleHash]?.state ?? CollectibleState.NotAcquired;
}

// ============================================================================
// TITLE / SEAL RESOLUTION
// ============================================================================

/**
 * Resolve title info for a seal node.
 * Uses completionRecordHash from the presentation node definition.
 */
function getTitleInfo(
    completionRecordHash: number,
    recordDefs: Record<string, any>,
    profileRecords: any,
): TitleInfo | undefined {
    const recordDef = recordDefs[completionRecordHash];
    if (!recordDef?.titleInfo) return undefined;

    const titlesByGender = recordDef.titleInfo.titlesByGenderHash;
    // Use male (2204441813) or first available
    const title = titlesByGender?.[2204441813]
        || titlesByGender?.[3111576190]
        || Object.values(titlesByGender || {})[0];

    if (!title) return undefined;

    const recordComponent = profileRecords?.records?.[completionRecordHash];
    const isCompleted = Boolean((recordComponent?.state ?? 0) & RecordState.RecordRedeemed);

    let gildedNum = 0;
    let isGildedForCurrentSeason = false;

    const gildingHash = recordDef.titleInfo.gildingTrackingRecordHash;
    if (gildingHash) {
        const gildedRecord = profileRecords?.records?.[gildingHash];
        if (gildedRecord?.completedCount) {
            gildedNum = gildedRecord.completedCount;
        }
        isGildedForCurrentSeason = Boolean(
            gildedRecord && !(gildedRecord.state & RecordState.ObjectiveNotCompleted),
        );
    }

    return { title: title as string, isCompleted, gildedNum, isGildedForCurrentSeason };
}

// ============================================================================
// LEAF BUILDERS
// ============================================================================

function buildRecords(
    recordHashes: Array<{ recordHash: number }>,
    ctx: TreeBuilderContext,
): { records: RecordNode[]; visible: number; acquired: number } {
    const records: RecordNode[] = [];
    let visible = 0;
    let acquired = 0;

    const trackedHash = ctx.profileResponse?.profileRecords?.data?.trackedRecordHash;

    for (const entry of recordHashes) {
        const hash = entry.recordHash;
        const def = ctx.recordDefs[hash];
        if (!def) continue;

        // Skip redacted/invisible
        const component = getRecordComponent(hash, def, ctx.profileResponse);
        const state = component?.state ?? 0;
        if (state & RecordState.Invisible) continue;
        if (def.redacted) continue;

        const isRedeemed = Boolean(state & RecordState.RecordRedeemed);
        const isObjectiveIncomplete = Boolean(state & RecordState.ObjectiveNotCompleted);

        // Build objectives
        const objectives: ObjectiveProgress[] = [];
        const objEntries = component?.objectives || def.objectiveHashes?.map((h: number) => ({ objectiveHash: h, progress: 0, completionValue: 0, complete: false })) || [];
        for (const obj of objEntries) {
            const objDef = ctx.objectiveDefs[obj.objectiveHash];
            objectives.push({
                objectiveHash: obj.objectiveHash,
                progress: obj.progress ?? 0,
                completionValue: obj.completionValue ?? objDef?.completionValue ?? 0,
                complete: obj.complete ?? false,
                description: objDef?.progressDescription || objDef?.displayProperties?.description,
            });
        }

        records.push({
            hash,
            name: def.displayProperties?.name || '',
            description: def.displayProperties?.description || '',
            icon: def.displayProperties?.icon || '',
            isRedeemed,
            isObjectiveIncomplete,
            score: def.completionInfo?.ScoreValue || 0,
            trackedInGame: trackedHash === hash,
            objectives,
            recordComponent: component,
        });

        visible++;
        if (isRedeemed) acquired++;
    }

    return { records, visible, acquired };
}

function buildCollectibles(
    collectibleEntries: Array<{ collectibleHash: number }>,
    ctx: TreeBuilderContext,
): { collectibles: CollectibleNode[]; visible: number; acquired: number } {
    const collectibles: CollectibleNode[] = [];
    let visible = 0;
    let acquired = 0;

    for (const entry of collectibleEntries) {
        const hash = entry.collectibleHash;
        const def = ctx.collectibleDefs[hash];
        if (!def) continue;
        if (def.redacted) continue;

        const state = getCollectibleState(hash, def, ctx.profileResponse);

        // Skip invisible
        if (state & CollectibleState.Invisible) continue;

        const isAcquired = !(state & CollectibleState.NotAcquired);
        const itemHash = def.itemHash;
        const itemDef = itemHash ? ctx.itemDefs[itemHash] : null;

        collectibles.push({
            hash,
            itemHash: itemHash || 0,
            name: itemDef?.displayProperties?.name || def.displayProperties?.name || '',
            icon: itemDef?.displayProperties?.icon || def.displayProperties?.icon || '',
            isAcquired,
            state,
        });

        visible++;
        if (isAcquired) acquired++;
    }

    return { collectibles, visible, acquired };
}

function buildMetrics(
    metricEntries: Array<{ metricHash: number }>,
    ctx: TreeBuilderContext,
): { metrics: MetricNode[]; visible: number; acquired: number } {
    const metrics: MetricNode[] = [];
    let visible = 0;
    let acquired = 0;

    for (const entry of metricEntries) {
        const hash = entry.metricHash;
        const def = ctx.metricDefs[hash];
        if (!def) continue;
        if (def.redacted) continue;

        const component = ctx.profileResponse?.metrics?.data?.metrics?.[hash];
        if (!component) continue;

        const objProgress = component.objectiveProgress;
        const isComplete = objProgress?.complete ?? false;

        metrics.push({
            hash,
            name: def.displayProperties?.name || '',
            icon: def.displayProperties?.icon || '',
            isComplete,
            objectiveProgress: objProgress ? {
                objectiveHash: objProgress.objectiveHash ?? 0,
                progress: objProgress.progress ?? 0,
                completionValue: objProgress.completionValue ?? 0,
                complete: isComplete,
            } : null,
        });

        visible++;
        if (isComplete) acquired++;
    }

    return { metrics, visible, acquired };
}

// ============================================================================
// MAIN TREE BUILDER
// ============================================================================

/**
 * Build a presentation node tree from a root node hash.
 *
 * This is the core algorithm: it recursively traverses Bungie's presentation node
 * hierarchy, building a UI-ready tree structure with completion counts.
 *
 * @param nodeHash - The root presentation node hash to start from
 * @param ctx - Context with all required definitions and profile data
 * @param depth - Current recursion depth (safety limit)
 * @returns A PresentationNode tree, or null if the node is invalid/invisible
 */
export function buildPresentationNodeTree(
    nodeHash: number,
    ctx: TreeBuilderContext,
    depth: number = 0,
): PresentationNode | null {
    if (depth > 20) return null; // Safety limit

    const nodeDef = ctx.presentationNodeDefs[nodeHash];
    if (!nodeDef) return null;
    if (nodeDef.redacted) return null;

    // Check visibility from profile component
    const nodeComponent =
        ctx.profileResponse?.profilePresentationNodes?.data?.nodes?.[nodeHash];
    if ((nodeComponent?.state ?? 0) & PresentationNodeState.Invisible) return null;

    const name = nodeDef.displayProperties?.name || '';
    const icon = nodeDef.displayProperties?.icon || '';
    const children = nodeDef.children || {};

    // Resolve title info for seals
    let titleInfo: TitleInfo | undefined;
    if (nodeDef.completionRecordHash) {
        titleInfo = getTitleInfo(
            nodeDef.completionRecordHash,
            ctx.recordDefs,
            ctx.profileResponse?.profileRecords?.data,
        );
    }

    // LEAF: Collectibles
    if (children.collectibles?.length > 0) {
        const result = buildCollectibles(children.collectibles, ctx);
        return {
            hash: nodeHash,
            name,
            icon,
            visible: result.visible,
            acquired: result.acquired,
            collectibles: result.collectibles,
            titleInfo,
            nodeDef,
        };
    }

    // LEAF: Records
    if (children.records?.length > 0) {
        const result = buildRecords(children.records, ctx);
        return {
            hash: nodeHash,
            name,
            icon,
            visible: result.visible,
            acquired: result.acquired,
            records: result.records,
            titleInfo,
            nodeDef,
        };
    }

    // LEAF: Metrics
    if (children.metrics?.length > 0) {
        const result = buildMetrics(children.metrics, ctx);
        return {
            hash: nodeHash,
            name,
            icon,
            visible: result.visible,
            acquired: result.acquired,
            metrics: result.metrics,
            titleInfo,
            nodeDef,
        };
    }

    // BRANCH: Recurse into child presentation nodes
    const childNodes: PresentationNode[] = [];
    let totalVisible = 0;
    let totalAcquired = 0;

    if (children.presentationNodes?.length > 0) {
        for (const childEntry of children.presentationNodes) {
            const childHash = childEntry.presentationNodeHash;
            const child = buildPresentationNodeTree(childHash, ctx, depth + 1);
            if (child) {
                totalVisible += child.visible;
                totalAcquired += child.acquired;
                childNodes.push(child);
            }
        }
    }

    // If no children produced, still return the node (it may be a valid empty category)
    return {
        hash: nodeHash,
        name,
        icon,
        visible: totalVisible,
        acquired: totalAcquired,
        childPresentationNodes: childNodes.length > 0 ? childNodes : undefined,
        titleInfo,
        nodeDef,
    };
}
