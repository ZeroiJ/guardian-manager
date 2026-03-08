import React from 'react';
import { Search } from 'lucide-react';
import { BungieImage } from '@/components/ui/BungieImage';
import { ClassIcon, PowerIcon, CLASS_NAMES } from '@/components/ui/DestinyIcons';
import type { VendorGroupModel } from '@/lib/vendors/types';

// ============================================================================
// Character Selector
// ============================================================================

const CharacterCard: React.FC<{
  character: any;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ character, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`relative group w-full h-14 rounded overflow-hidden border transition-all duration-200 text-left ${
      isSelected
        ? 'border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.08)] z-10'
        : 'border-void-border opacity-60 hover:opacity-90 hover:border-white/10'
    }`}
  >
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(https://www.bungie.net${character.emblemBackgroundPath})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
    <div className="relative z-10 h-full flex flex-col justify-center px-3">
      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider leading-none ${isSelected ? 'text-white' : 'text-gray-300'}`}>
        <ClassIcon classType={character.classType} size={12} />
        {CLASS_NAMES[character.classType] || 'Unknown'}
      </span>
      <span className="flex items-center gap-1 text-lg font-light text-amber-200/80 leading-none mt-0.5 font-mono">
        <PowerIcon size={10} className="text-amber-300/60" />
        {character.light}
      </span>
    </div>
    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
);

// ============================================================================
// Filter Toggle
// ============================================================================

const FilterToggle: React.FC<{
  label: string;
  active: boolean;
  onToggle: () => void;
}> = ({ label, active, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors text-left ${
      active
        ? 'bg-white/[0.08] text-white'
        : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
    }`}
  >
    <div
      className={`w-3.5 h-3.5 rounded-sm border transition-colors shrink-0 flex items-center justify-center ${
        active ? 'bg-white/20 border-white/30' : 'border-gray-600'
      }`}
    >
      {active && <div className="w-1.5 h-1.5 rounded-[1px] bg-white" />}
    </div>
    <span className="truncate">{label}</span>
  </button>
);

// ============================================================================
// Vendor Nav Menu
// ============================================================================

const VendorNavMenu: React.FC<{
  vendorGroups: VendorGroupModel[];
}> = ({ vendorGroups }) => {
  const handleClick = (vendorHash: number) => {
    const el = document.getElementById(`vendor-${vendorHash}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-3">
      {vendorGroups.map((group) => (
        <div key={group.vendorGroupHash}>
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 px-3 pb-1 border-b border-gray-800/50 mb-1">
            {group.def?.categoryName || 'Vendors'}
          </div>
          {group.vendors.map((vendor) => {
            const icon =
              vendor.def?.displayProperties?.smallTransparentIcon ||
              vendor.def?.displayProperties?.icon;
            const name = vendor.def?.displayProperties?.name || `Vendor ${vendor.vendorHash}`;
            return (
              <button
                key={vendor.vendorHash}
                type="button"
                onClick={() => handleClick(vendor.vendorHash)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
              >
                {icon && (
                  <BungieImage
                    src={icon}
                    className="w-5 h-5 rounded-full shrink-0 bg-black/30"
                  />
                )}
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Main Sidebar
// ============================================================================

interface VendorSidebarProps {
  characters: Record<string, any>;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  showUnacquiredOnly: boolean;
  onToggleUnacquired: () => void;
  hideSilver: boolean;
  onToggleSilver: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  vendorGroups: VendorGroupModel[];
}

export const VendorSidebar: React.FC<VendorSidebarProps> = ({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  showUnacquiredOnly,
  onToggleUnacquired,
  hideSilver,
  onToggleSilver,
  searchQuery,
  onSearchChange,
  vendorGroups,
}) => {
  const sortedCharacters = Object.values(characters).sort((a: any, b: any) => {
    return new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime();
  });

  return (
    <aside className="w-[230px] shrink-0 bg-void-bg border-r border-void-border flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Character Selector */}
      <div className="p-3 space-y-1.5">
        {sortedCharacters.map((char: any) => (
          <CharacterCard
            key={char.characterId}
            character={char}
            isSelected={char.characterId === selectedCharacterId}
            onSelect={() => onSelectCharacter(char.characterId)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-void-border" />

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vendors..."
            className="w-full rounded border border-void-border bg-white/[0.04] pl-7 pr-3 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Filter Toggles */}
      <div className="px-2 space-y-0.5">
        <FilterToggle
          label="Filter to Unacquired"
          active={showUnacquiredOnly}
          onToggle={onToggleUnacquired}
        />
        <FilterToggle
          label="Hide Silver Items"
          active={hideSilver}
          onToggle={onToggleSilver}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 mt-3 h-px bg-void-border" />

      {/* Vendor Navigation */}
      <div className="flex-1 overflow-y-auto p-2 mt-1">
        <VendorNavMenu vendorGroups={vendorGroups} />
      </div>
    </aside>
  );
};
