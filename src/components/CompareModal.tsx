/**
 * CompareModal — DIM-style compare view with enhancements.
 * Ported from DIM: src/app/compare/Compare.tsx
 *
 * Shows similar items as scrollable columns with stat rows
 * featuring color-coded values (green=best, red=worst) + stat bars.
 */
import React, { useMemo, useState } from 'react';
import { X, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { categorizeSockets } from '../lib/destiny/socket-helper';
import { ItemSocket } from './item/ItemSocket';
import { BungieImage } from './ui/BungieImage';
import { CompareSession, ManifestDefinition } from '../store/useInventoryStore';
import { GuardianItem } from '../services/profile/types';
import { STAT_WHITELIST } from '../utils/manifest-helper';

// ============================================================================
// TYPES
// ============================================================================

interface CompareModalProps {
  /** The active compare session from the store. */
  session: CompareSession;
  /** All items matching the session filter (computed in App.tsx). */
  items: GuardianItem[];
  /** Manifest definitions. */
  definitions: Record<number, ManifestDefinition>;
  /** Close the compare sheet. */
  onClose: () => void;
}

/** Internal stat shape used during calculation. */
interface CompareStat {
  statHash: number;
  label: string;
  value: number;
  order: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Column width for each item — kept narrow like DIM */
const COL_W = 'min-w-[140px] max-w-[160px]';
const LABEL_W = 'w-24 shrink-0';

// ============================================================================
// ENHANCED STAT ROW WITH BARS
// ============================================================================

/**
 * Enhanced StatRow with color coding and optional stat bars.
 * Green = best, Red = worst, Yellow = middle values.
 */
const StatRow: React.FC<{
  label: string;
  values: number[];
  showBars?: boolean;
}> = ({ label, values, showBars = true }) => {
  const nonZero = values.filter(v => v > 0);
  const best = nonZero.length > 0 ? Math.max(...nonZero) : 0;
  const worst = nonZero.length > 0 ? Math.min(...nonZero) : 0;
  const allSame = values.every(v => v === values[0]);
  const hasRange = best > worst;

  // Calculate percentages for bars
  const percentages = hasRange
    ? values.map(v => ((v - worst) / (best - worst)) * 100)
    : values.map(() => 100);

  return (
    <div className="flex items-center">
      {/* Stat label */}
      <div className={`${LABEL_W} text-right pr-3 py-[4px] text-[11px] text-gray-400 font-medium`}>
        {label}
      </div>

      {/* Value cells with bars */}
      {values.map((value, i) => {
        const isBest = !allSame && value === best && value > 0;
        const isWorst = !allSame && value === worst && nonZero.length > 1;

        // Color gradient: Green (best) → Yellow (middle) → Red (worst)
        let colorClass = 'text-white';
        let barColor = 'bg-gray-600';
        let bgClass = '';

        if (hasRange && value > 0) {
          if (isBest) {
            colorClass = 'text-green-400 font-semibold';
            barColor = 'bg-green-500';
            bgClass = 'bg-green-500/5';
          } else if (isWorst) {
            colorClass = 'text-red-400';
            barColor = 'bg-red-500';
            bgClass = 'bg-red-500/5';
          } else {
            colorClass = 'text-yellow-300';
            barColor = 'bg-yellow-500';
          }
        }

        return (
          <div
            key={i}
            className={`${COL_W} px-2 py-[4px] flex flex-col items-center justify-center ${bgClass}`}
          >
            {/* Value */}
            <span className={`text-[13px] font-mono tabular-nums ${colorClass}`}>
              {value || '—'}
            </span>

            {/* Mini stat bar */}
            {showBars && hasRange && value > 0 && (
              <div className="w-full max-w-[50px] h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${barColor} transition-all duration-300`}
                  style={{ width: `${Math.max(percentages[i] || 0, 5)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// POWER LEVEL ROW
// ============================================================================

/**
 * Power level comparison row with highlighting.
 */
const PowerRow: React.FC<{
  items: GuardianItem[];
}> = ({ items }) => {
  const powers = items.map(item => item.instanceData?.primaryStat?.value || 0);
  const best = Math.max(...powers);
  const worst = Math.min(...powers);
  const allSame = powers.every(p => p === powers[0]);

  return (
    <div className="flex items-center border-b border-white/5 bg-white/[0.02]">
      <div className={`${LABEL_W} text-right pr-3 py-[4px] text-[11px] text-amber-400 font-semibold`}>
        Power
      </div>
      {powers.map((power, i) => {
        const isBest = !allSame && power === best;
        const isWorst = !allSame && power === worst && powers.length > 1;

        let colorClass = 'text-white';
        if (isBest) colorClass = 'text-green-400 font-bold';
        else if (isWorst) colorClass = 'text-red-400';

        return (
          <div key={i} className={`${COL_W} px-2 py-[4px] text-center`}>
            <span className={`text-[13px] font-mono tabular-nums ${colorClass}`}>
              {power}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Item column header — icon + name + power + close button.
 * Enhanced with rarity borders and masterwork indicators.
 */
const CompareItemHeader: React.FC<{
  item: GuardianItem;
  def: ManifestDefinition | undefined;
  isInitial: boolean;
  onRemove: () => void;
}> = ({ item, def, isInitial, onRemove }) => {
  const power = item.instanceData?.primaryStat?.value;
  const icon = def?.displayProperties?.icon;
  const name = def?.displayProperties?.name || 'Unknown';
  const tierType = def?.inventory?.tierType || 0;

  // Rarity colors
  const rarityColors: Record<number, string> = {
    6: '#ceae33', // Exotic
    5: '#522f65', // Legendary
    4: '#5076a3', // Rare
    3: '#366f42', // Uncommon
    2: '#c3bcb4', // Common
  };
  const borderColor = rarityColors[tierType] || rarityColors[2];

  // Masterwork detection (state bitmask bit 2)
  const isMasterwork = (item.state & 4) !== 0;
  const effectiveBorderColor = isMasterwork ? '#fbbf24' : borderColor;

  // Lock status
  const isLocked = (item.state & 1) !== 0;

  return (
    <div className={`${COL_W} px-2 py-2 relative group`}>
      {/* Close button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center
                   text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors z-10"
        title="Remove from comparison"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Name with initial highlight */}
      <div className={`text-xs font-semibold truncate pr-5 mb-1.5 ${
        isInitial ? 'text-blue-400' : 'text-[#7da5d6]'
      }`} title={name}>
        {name}
      </div>

      {/* Icon with rarity border */}
      <div className="flex items-center gap-2">
        <div
          className="w-12 h-12 rounded border-2 overflow-hidden bg-[#1a1a2e] shrink-0 relative"
          style={{ borderColor: effectiveBorderColor }}
        >
          {icon && (
            <BungieImage
              src={icon}
              className="w-full h-full object-cover"
            />
          )}

          {/* Masterwork crown */}
          {isMasterwork && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-yellow-400" />
          )}

          {/* Lock indicator */}
          {isLocked && (
            <div className="absolute top-0.5 left-0.5 w-3 h-3 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}

          {/* Power badge */}
          {power && (
            <div className="absolute bottom-0 right-0 text-[9px] font-bold text-yellow-400 bg-black/80 px-1">
              {power}
            </div>
          )}
        </div>
      </div>

      {/* Initial indicator */}
      {isInitial && (
        <div className="mt-1 text-[9px] text-blue-400 uppercase tracking-wider font-medium">
          Initial
        </div>
      )}
    </div>
  );
};

/**
 * Archetype row showing the intrinsic frame icon + name for each item.
 */
const ArchetypeRow: React.FC<{
  itemSockets: ReturnType<typeof categorizeSockets>[];
}> = ({ itemSockets }) => {
  const hasAny = itemSockets.some(s => s.intrinsic !== null);
  if (!hasAny) return null;

  return (
    <div className="flex items-center border-t border-white/10">
      <div className={`${LABEL_W} text-right pr-3 py-2 text-[11px] text-gray-400 font-medium`}>
        Archetype
      </div>
      {itemSockets.map((sockets, i) => {
        const intrinsic = sockets.intrinsic;
        if (!intrinsic?.plugDef) {
          return <div key={i} className={`${COL_W} px-2 py-2`} />;
        }
        const dp = (intrinsic.plugDef as Record<string, any>).displayProperties;
        return (
          <div key={i} className={`${COL_W} px-2 py-2 flex items-center gap-1.5`}>
            {dp?.icon && (
              <div className="w-8 h-8 rounded-sm border border-[#e2bf36] overflow-hidden bg-[#222] shrink-0">
                <BungieImage src={dp.icon} className="w-full h-full" />
              </div>
            )}
            <span className="text-[11px] text-gray-300 leading-tight truncate">
              {dp?.name || ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Perk/Mod row showing socket icons across all item columns.
 */
const PerkRow: React.FC<{
  label: string;
  itemPerks: { plugDef: Record<string, unknown>; categoryHash: number; isEnabled: boolean }[][];
}> = ({ label, itemPerks }) => {
  if (itemPerks.every(p => p.length === 0)) return null;

  return (
    <div className="flex items-start">
      <div className={`${LABEL_W} text-right pr-3 py-2 text-[11px] text-gray-400 font-medium`}>
        {label}
      </div>
      {itemPerks.map((perks, i) => (
        <div
          key={i}
          className={`${COL_W} px-1 py-1.5 flex flex-wrap gap-1`}
        >
          {perks.map((s, j) => (
            <ItemSocket
              key={j}
              plugDef={s.plugDef}
              categoryHash={s.categoryHash}
              isActive={s.isEnabled}
            />
          ))}
          {perks.length === 0 && <div className="w-8 h-8" />}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Enhanced DIM-style compare sheet with:
 * - Framer Motion animations
 * - Stat bars for visual comparison
 * - Power level highlighting
 * - Better rarity/masterwork indicators
 */
export const CompareModal: React.FC<CompareModalProps> = ({
  session,
  items,
  definitions,
  onClose,
}) => {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [showPerks, setShowPerks] = useState(true);
  const [showBars, setShowBars] = useState(true);

  const visibleItems = useMemo(
    () => items.filter(i => i.itemInstanceId && !hiddenIds.has(i.itemInstanceId)),
    [items, hiddenIds],
  );

  // Sort: initial item first, then by power descending
  const sortedItems = useMemo(() => {
    return [...visibleItems].sort((a, b) => {
      if (a.itemInstanceId === session.initialItemId) return -1;
      if (b.itemInstanceId === session.initialItemId) return 1;
      const pA = a.instanceData?.primaryStat?.value || 0;
      const pB = b.instanceData?.primaryStat?.value || 0;
      return pB - pA;
    });
  }, [visibleItems, session.initialItemId]);

  // ── STATS (per-instance live values from Bungie API) ──
  const allItemStats = useMemo(() => {
    return sortedItems.map(item => {
      const def = definitions[item.itemHash];
      if (!def?.stats?.stats) return [] as CompareStat[];

      const liveStats = item?.stats || {};

      return (Object.entries(def.stats.stats) as [string, Record<string, unknown>][])
        .map(([hashStr, defStat]) => {
          const hash = parseInt(hashStr, 10);
          const info = STAT_WHITELIST[hash];
          if (!info) return null;

          const liveEntry = liveStats[hashStr] || liveStats[hash];
          let value = (liveEntry as Record<string, unknown>)?.value as number | undefined;
          if (value === undefined) {
            value = (defStat as Record<string, unknown>).value as number || 0;
          }
          if (typeof value !== 'number') return null;

          return { statHash: hash, label: info.label, value, order: info.order } as CompareStat;
        })
        .filter((s): s is CompareStat => s !== null)
        .sort((a, b) => a.order - b.order);
    });
  }, [sortedItems, definitions]);

  // Unified stat list (union of all stats)
  const statInfo = useMemo(() => {
    const statMap = new Map<number, { label: string; order: number }>();
    for (const itemStats of allItemStats) {
      for (const s of itemStats) {
        if (!statMap.has(s.statHash)) {
          statMap.set(s.statHash, { label: s.label, order: s.order });
        }
      }
    }
    return Array.from(statMap.entries()).sort(([, a], [, b]) => a.order - b.order);
  }, [allItemStats]);

  // Per-item stat arrays aligned to statInfo
  const statValues = useMemo(() => {
    return statInfo.map(([statHash]) => {
      return allItemStats.map(itemStats => {
        const found = itemStats.find(s => s.statHash === statHash);
        return found?.value || 0;
      });
    });
  }, [statInfo, allItemStats]);

  // ── SOCKETS ──
  const allItemSockets = useMemo(() => {
    return sortedItems.map(item => {
      const def = definitions[item.itemHash];
      return categorizeSockets(item, def, definitions);
    });
  }, [sortedItems, definitions]);

  const removeItem = (id: string) => {
    const newHidden = new Set(hiddenIds);
    newHidden.add(id);
    if (newHidden.size >= items.length) {
      onClose();
      return;
    }
    setHiddenIds(newHidden);
  };

  const firstDef = sortedItems[0] ? definitions[sortedItems[0].itemHash] : undefined;
  const typeName = firstDef?.itemTypeDisplayName || firstDef?.displayProperties?.name || 'Items';
  const isArmor = firstDef?.itemType === 2;
  const isWeapon = firstDef?.itemType === 3;

  if (sortedItems.length === 0) {
    onClose();
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 -z-10"
          onClick={onClose}
        />

        {/* Sheet */}
        <div className="bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 rounded-t-xl shadow-2xl max-h-[80vh] flex flex-col">

          {/* ── HEADER BAR ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 rounded-t-xl shrink-0">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-gray-400" />
              <h2 className="text-sm font-bold text-white">
                {typeName}
              </h2>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                {sortedItems.length} items
              </span>
              {isArmor && (
                <span className="text-[10px] text-blue-400 uppercase tracking-wider">
                  Armor
                </span>
              )}
              {isWeapon && (
                <span className="text-[10px] text-amber-400 uppercase tracking-wider">
                  Weapon
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Stat bars toggle */}
              <button
                onClick={() => setShowBars(!showBars)}
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  showBars ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
                title="Toggle stat bars"
              >
                Bars
              </button>

              {/* Perks toggle */}
              <button
                onClick={() => setShowPerks(!showPerks)}
                className={`text-[11px] px-2 py-1 rounded transition-colors ${
                  showPerks ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                Perks
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── SCROLLABLE TABLE ── */}
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="min-w-max p-2">

              {/* ── ITEM HEADERS ── */}
              <div className="flex items-start sticky top-0 bg-[#0f0f0f] z-10 border-b border-white/10">
                <div className={LABEL_W} /> {/* label spacer */}
                {sortedItems.map(item => (
                  <CompareItemHeader
                    key={item.itemInstanceId}
                    item={item}
                    def={definitions[item.itemHash]}
                    isInitial={item.itemInstanceId === session.initialItemId}
                    onRemove={() => removeItem(item.itemInstanceId || '')}
                  />
                ))}
              </div>

              {/* ── POWER LEVEL ROW ── */}
              <PowerRow items={sortedItems} />

              {/* ── STAT ROWS WITH BARS ── */}
              <div className="py-1">
                {statInfo.map(([statHash, info], rowIdx) => (
                  <StatRow
                    key={statHash}
                    label={info.label}
                    values={statValues[rowIdx]}
                    showBars={showBars}
                  />
                ))}
              </div>

              {/* ── ARCHETYPE + PERKS + MODS ── */}
              {showPerks && allItemSockets.length > 0 && (
                <div className="border-t border-white/10 mt-2 pt-2">
                  {/* Archetype (Frame) */}
                  <ArchetypeRow itemSockets={allItemSockets} />

                  {/* Perks */}
                  <PerkRow
                    label="Perks"
                    itemPerks={allItemSockets.map(s => s.perks)}
                  />

                  {/* Mods */}
                  <PerkRow
                    label="Mods"
                    itemPerks={allItemSockets.map(s =>
                      s.weaponMods.length > 0 ? s.weaponMods : s.mods,
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Green = Best · Red = Worst · Yellow = Middle</span>
            <span>Click × to remove items from comparison</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
