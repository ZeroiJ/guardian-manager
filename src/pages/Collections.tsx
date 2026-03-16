/**
 * Collections Page — Browse Collections, Triumphs, Seals, and Metrics.
 *
 * Architecture:
 * - Uses presentation node tree builder to create browsable trees
 * - Tabs for different root nodes (Collections, Triumphs, Seals, Metrics)
 * - Breadcrumb navigation for drilling into nested nodes
 * - Completion progress bars and counters
 * - Seal cards with title/gilding display
 *
 * Lazy-loaded via React.lazy() in App.tsx.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import {
    buildPresentationNodeTree,
    getRootNodeHashes,
    type PresentationNode,
    type RecordNode,
    type CollectibleNode,
    type MetricNode,
    type TreeBuilderContext,
} from '@/lib/records/presentation-nodes';
import { Loader2, ChevronRight, Trophy, BookOpen, Medal, BarChart3, Check, Lock } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'collections' | 'triumphs' | 'seals' | 'metrics';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
    rootHash: number | null;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Progress bar with label */
const ProgressBar: React.FC<{ acquired: number; visible: number; className?: string }> = ({
    acquired,
    visible,
    className = '',
}) => {
    const pct = visible > 0 ? (acquired / visible) * 100 : 0;
    const isComplete = acquired === visible && visible > 0;

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-400' : 'bg-blue-400/70'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-[10px] font-mono tabular-nums shrink-0 ${isComplete ? 'text-green-400' : 'text-gray-500'}`}>
                {acquired}/{visible}
            </span>
        </div>
    );
};

/** Breadcrumb navigation */
const Breadcrumbs: React.FC<{
    path: Array<{ hash: number; name: string }>;
    onNavigate: (index: number) => void;
}> = ({ path, onNavigate }) => (
    <div className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto pb-1">
        {path.map((crumb, i) => (
            <React.Fragment key={crumb.hash}>
                {i > 0 && <ChevronRight size={10} className="shrink-0" />}
                <button
                    onClick={() => onNavigate(i)}
                    className={`shrink-0 hover:text-white transition-colors truncate max-w-[200px] ${
                        i === path.length - 1 ? 'text-white font-bold' : ''
                    }`}
                >
                    {crumb.name}
                </button>
            </React.Fragment>
        ))}
    </div>
);

/** A presentation node card (folder) */
const NodeCard: React.FC<{
    node: PresentationNode;
    onClick: () => void;
}> = ({ node, onClick }) => {
    const isComplete = node.acquired === node.visible && node.visible > 0;

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 bg-void-surface/40 border border-void-border rounded-sm hover:bg-white/[0.04] transition-colors text-left w-full group"
        >
            {node.icon && (
                <div className="w-10 h-10 rounded overflow-hidden border border-white/10 shrink-0 bg-black/30">
                    <BungieImage src={node.icon} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-bold truncate group-hover:text-blue-300 transition-colors">
                    {node.name || `Node ${node.hash}`}
                </div>
                {node.visible > 0 && (
                    <ProgressBar acquired={node.acquired} visible={node.visible} />
                )}
            </div>
            <ChevronRight size={14} className="text-gray-500 group-hover:text-white transition-colors shrink-0" />
        </button>
    );
};

/** A seal/title card with special styling */
const SealCard: React.FC<{
    node: PresentationNode;
    onClick: () => void;
}> = ({ node, onClick }) => {
    const title = node.titleInfo;
    const isComplete = title?.isCompleted || (node.acquired === node.visible && node.visible > 0);
    const isGilded = title?.isGildedForCurrentSeason;

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center gap-2 p-4 rounded-sm border transition-colors text-center w-full group ${
                isComplete
                    ? isGilded
                        ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                        : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
                    : 'bg-void-surface/40 border-void-border hover:bg-white/[0.04]'
            }`}
        >
            {node.icon && (
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                    isComplete
                        ? isGilded ? 'border-yellow-500' : 'border-purple-400'
                        : 'border-white/10'
                }`}>
                    <BungieImage src={node.icon} className="w-full h-full object-cover" />
                </div>
            )}
            <div>
                <div className={`text-sm font-bold ${
                    isComplete
                        ? isGilded ? 'text-yellow-400' : 'text-purple-300'
                        : 'text-white'
                }`}>
                    {title?.title || node.name}
                </div>
                {title?.gildedNum ? (
                    <div className="text-[10px] text-yellow-500 font-bold">
                        Gilded x{title.gildedNum}
                    </div>
                ) : null}
            </div>
            <ProgressBar acquired={node.acquired} visible={node.visible} className="w-full" />
        </button>
    );
};

/** A single record/triumph row */
const RecordRow: React.FC<{ record: RecordNode }> = ({ record }) => (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-sm ${
        record.isRedeemed ? 'opacity-50' : ''
    }`}>
        {record.icon && (
            <div className={`w-8 h-8 rounded overflow-hidden border shrink-0 ${
                record.isRedeemed ? 'border-green-500/30' : 'border-white/10'
            }`}>
                <BungieImage src={record.icon} className="w-full h-full" />
            </div>
        )}
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${record.isRedeemed ? 'text-green-400' : 'text-white'}`}>
                    {record.name}
                </span>
                {record.isRedeemed && <Check size={10} className="text-green-400" />}
                {record.trackedInGame && (
                    <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded uppercase font-bold">
                        Tracked
                    </span>
                )}
            </div>
            {record.description && (
                <div className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
                    {record.description}
                </div>
            )}
            {/* Objectives */}
            {record.objectives.length > 0 && !record.isRedeemed && (
                <div className="mt-1 space-y-0.5">
                    {record.objectives.map((obj, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${obj.complete ? 'bg-green-400' : 'bg-blue-400/70'}`}
                                    style={{
                                        width: `${obj.completionValue > 0 ? Math.min((obj.progress / obj.completionValue) * 100, 100) : 0}%`,
                                    }}
                                />
                            </div>
                            <span className="text-[9px] font-mono tabular-nums text-gray-500">
                                {obj.progress.toLocaleString()}/{obj.completionValue.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
        {record.score > 0 && (
            <div className="text-[10px] text-yellow-500 font-mono font-bold shrink-0">
                +{record.score}
            </div>
        )}
    </div>
);

/** A single collectible tile */
const CollectibleTile: React.FC<{ collectible: CollectibleNode }> = ({ collectible }) => (
    <div className={`relative group flex flex-col items-center gap-1 w-[72px] ${
        !collectible.isAcquired ? 'opacity-40' : ''
    }`}>
        <div
            className={`relative w-[56px] h-[56px] rounded border overflow-hidden bg-black/30 ${
                collectible.isAcquired ? 'border-white/20' : 'border-white/5'
            }`}
            title={collectible.name}
        >
            {collectible.icon && (
                <BungieImage src={collectible.icon} className="w-full h-full" />
            )}
            {!collectible.isAcquired && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Lock size={14} className="text-gray-500" />
                </div>
            )}
        </div>
        <div className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 w-full">
            {collectible.name}
        </div>
    </div>
);

/** A single metric row */
const MetricRow: React.FC<{ metric: MetricNode }> = ({ metric }) => (
    <div className={`flex items-center gap-3 px-3 py-2 ${metric.isComplete ? 'opacity-50' : ''}`}>
        {metric.icon && (
            <div className="w-8 h-8 rounded overflow-hidden border border-white/10 shrink-0">
                <BungieImage src={metric.icon} className="w-full h-full" />
            </div>
        )}
        <div className="flex-1 min-w-0">
            <div className="text-xs text-white font-bold truncate">
                {metric.name}
            </div>
            {metric.objectiveProgress && (
                <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${metric.isComplete ? 'bg-green-400' : 'bg-blue-400/70'}`}
                            style={{
                                width: `${
                                    metric.objectiveProgress.completionValue > 0
                                        ? Math.min((metric.objectiveProgress.progress / metric.objectiveProgress.completionValue) * 100, 100)
                                        : 0
                                }%`,
                            }}
                        />
                    </div>
                    <span className="text-[9px] font-mono tabular-nums text-gray-500">
                        {metric.objectiveProgress.progress.toLocaleString()}/{metric.objectiveProgress.completionValue.toLocaleString()}
                    </span>
                </div>
            )}
        </div>
        {metric.isComplete && <Check size={12} className="text-green-400 shrink-0" />}
    </div>
);

/** Leaf content renderer — renders records, collectibles, or metrics */
const LeafContent: React.FC<{ node: PresentationNode }> = ({ node }) => {
    if (node.records && node.records.length > 0) {
        return (
            <div className="space-y-0.5">
                {node.records.map(record => (
                    <RecordRow key={record.hash} record={record} />
                ))}
            </div>
        );
    }

    if (node.collectibles && node.collectibles.length > 0) {
        return (
            <div className="flex flex-wrap gap-3 p-2">
                {node.collectibles.map(collectible => (
                    <CollectibleTile key={collectible.hash} collectible={collectible} />
                ))}
            </div>
        );
    }

    if (node.metrics && node.metrics.length > 0) {
        return (
            <div className="space-y-0.5">
                {node.metrics.map(metric => (
                    <MetricRow key={metric.hash} metric={metric} />
                ))}
            </div>
        );
    }

    return (
        <div className="text-xs text-gray-500 py-4 text-center">
            No items in this section.
        </div>
    );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Collections() {
    const profile = useInventoryStore(s => s.profile);
    const [activeTab, setActiveTab] = useState<TabId>('triumphs');
    const [navigationPath, setNavigationPath] = useState<Array<{ hash: number; name: string }>>([]);

    // Get root hashes from profile
    const rootHashes = useMemo(() => {
        if (!profile) return { collectionsRoot: null, triumphsRoot: null, sealsRoot: null, metricsRoot: null };
        return getRootNodeHashes(profile);
    }, [profile]);

    // Build tabs with root hashes
    const tabs: Tab[] = useMemo(() => [
        { id: 'triumphs', label: 'Triumphs', icon: <Trophy size={14} />, rootHash: rootHashes.triumphsRoot },
        { id: 'collections', label: 'Collections', icon: <BookOpen size={14} />, rootHash: rootHashes.collectionsRoot },
        { id: 'seals', label: 'Seals', icon: <Medal size={14} />, rootHash: rootHashes.sealsRoot },
        { id: 'metrics', label: 'Metrics', icon: <BarChart3 size={14} />, rootHash: rootHashes.metricsRoot },
    ], [rootHashes]);

    const currentTab = tabs.find(t => t.id === activeTab);
    const currentRootHash = currentTab?.rootHash;

    // Collect ALL presentation node hashes reachable from roots
    // We'll load the full table since we need many definitions
    const { definitions: presentationNodeDefs, loading: pnLoading } = useDefinitions(
        'DestinyPresentationNodeDefinition',
        [],
    );
    const { definitions: recordDefs, loading: recordLoading } = useDefinitions(
        'DestinyRecordDefinition',
        [],
    );
    const { definitions: collectibleDefs, loading: collectibleLoading } = useDefinitions(
        'DestinyCollectibleDefinition',
        [],
    );
    const { definitions: metricDefs, loading: metricLoading } = useDefinitions(
        'DestinyMetricDefinition',
        [],
    );
    const { definitions: objectiveDefs, loading: objectiveLoading } = useDefinitions(
        'DestinyObjectiveDefinition',
        [],
    );
    const { definitions: itemDefs, loading: itemDefsLoading } = useDefinitions(
        'DestinyInventoryItemDefinition',
        [],
    );

    const defsLoading = pnLoading || recordLoading || collectibleLoading || metricLoading || objectiveLoading || itemDefsLoading;

    // Build tree builder context
    const ctx: TreeBuilderContext | null = useMemo(() => {
        if (defsLoading || !profile) return null;
        return {
            presentationNodeDefs,
            recordDefs,
            collectibleDefs,
            metricDefs,
            objectiveDefs,
            itemDefs,
            profileResponse: profile,
        };
    }, [defsLoading, profile, presentationNodeDefs, recordDefs, collectibleDefs, metricDefs, objectiveDefs, itemDefs]);

    // Build the tree for the current tab
    const rootTree = useMemo(() => {
        if (!ctx || !currentRootHash) return null;
        return buildPresentationNodeTree(currentRootHash, ctx);
    }, [ctx, currentRootHash]);

    // Navigate to the current node based on navigation path
    const currentNode = useMemo(() => {
        if (!rootTree) return null;
        let node: PresentationNode = rootTree;
        for (const crumb of navigationPath) {
            const child = node.childPresentationNodes?.find(c => c.hash === crumb.hash);
            if (!child) break;
            node = child;
        }
        return node;
    }, [rootTree, navigationPath]);

    // Reset navigation when tab changes
    useEffect(() => {
        setNavigationPath([]);
    }, [activeTab]);

    // Navigate into a child node
    const navigateInto = useCallback((node: PresentationNode) => {
        setNavigationPath(prev => [...prev, { hash: node.hash, name: node.name }]);
    }, []);

    // Navigate to a breadcrumb index
    const navigateTo = useCallback((index: number) => {
        setNavigationPath(prev => prev.slice(0, index));
    }, []);

    // Determine if current node is a leaf (has records/collectibles/metrics) or branch
    const isLeaf = currentNode && (
        (currentNode.records && currentNode.records.length > 0) ||
        (currentNode.collectibles && currentNode.collectibles.length > 0) ||
        (currentNode.metrics && currentNode.metrics.length > 0)
    );

    // For seals tab, show all children as seal cards
    const isSealsTab = activeTab === 'seals';

    return (
        <div className="min-h-screen bg-void-bg text-void-text">
            <TopBar />

            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                {/* Header */}
                <div>
                    <h1 className="text-lg font-bold text-white">Collections & Triumphs</h1>
                    <p className="text-xs text-gray-500">
                        Browse your game records, titles, and collectible checklists.
                    </p>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-void-surface/50 border border-void-border rounded-sm p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-white/10 text-white border border-white/10'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* No profile state */}
                {!profile && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-sm text-gray-500">
                            Log in and load your profile first.
                        </span>
                    </div>
                )}

                {/* Loading State */}
                {profile && defsLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={32} className="animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">Loading definitions...</span>
                    </div>
                )}

                {/* No root hash */}
                {profile && !defsLoading && !currentRootHash && (
                    <div className="text-xs text-gray-500 text-center py-10">
                        No data available for this section.
                    </div>
                )}

                {/* Tree Content */}
                {currentNode && (
                    <div className="space-y-3">
                        {/* Breadcrumbs */}
                        {navigationPath.length > 0 && (
                            <Breadcrumbs
                                path={[
                                    { hash: rootTree!.hash, name: currentTab?.label || 'Root' },
                                    ...navigationPath,
                                ]}
                                onNavigate={navigateTo}
                            />
                        )}

                        {/* Current node header */}
                        {navigationPath.length > 0 && (
                            <div className="flex items-center gap-3">
                                {currentNode.icon && (
                                    <div className="w-10 h-10 rounded overflow-hidden border border-white/10 shrink-0">
                                        <BungieImage src={currentNode.icon} className="w-full h-full" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        {currentNode.name}
                                    </h2>
                                    {currentNode.visible > 0 && (
                                        <ProgressBar acquired={currentNode.acquired} visible={currentNode.visible} />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Seals grid (special layout for seals tab at root level) */}
                        {isSealsTab && navigationPath.length === 0 && currentNode.childPresentationNodes && (
                            <div className="grid grid-cols-[repeat(auto-fill,_minmax(160px,_1fr))] gap-3">
                                {currentNode.childPresentationNodes.map(child => (
                                    <SealCard
                                        key={child.hash}
                                        node={child}
                                        onClick={() => navigateInto(child)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Normal branch view (child nodes as cards) */}
                        {!isLeaf && !(isSealsTab && navigationPath.length === 0) && currentNode.childPresentationNodes && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {currentNode.childPresentationNodes.map(child => {
                                    // If child is a leaf, render it inline
                                    const childIsLeaf = (child.records?.length || 0) > 0
                                        || (child.collectibles?.length || 0) > 0
                                        || (child.metrics?.length || 0) > 0;

                                    if (childIsLeaf && !child.childPresentationNodes?.length) {
                                        return (
                                            <div key={child.hash} className="bg-void-surface/40 border border-void-border rounded-sm overflow-hidden md:col-span-2">
                                                <div className="flex items-center gap-2 px-4 py-2 border-b border-void-border">
                                                    {child.icon && (
                                                        <div className="w-6 h-6 rounded overflow-hidden shrink-0">
                                                            <BungieImage src={child.icon} className="w-full h-full" />
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-bold text-white">{child.name}</span>
                                                    <ProgressBar
                                                        acquired={child.acquired}
                                                        visible={child.visible}
                                                        className="flex-1 max-w-[200px]"
                                                    />
                                                </div>
                                                <LeafContent node={child} />
                                            </div>
                                        );
                                    }

                                    return (
                                        <NodeCard
                                            key={child.hash}
                                            node={child}
                                            onClick={() => navigateInto(child)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Leaf view (records/collectibles/metrics) */}
                        {isLeaf && (
                            <div className="bg-void-surface/40 border border-void-border rounded-sm overflow-hidden">
                                <LeafContent node={currentNode} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
