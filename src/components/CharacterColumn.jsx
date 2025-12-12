import React from 'react';
import ItemCard from './ItemCard';
import { STAT_HASHES } from '../utils/constants';

export function CharacterColumn({ character, equipment, inventory, definitions }) {
    if (!character) return null;

    const { light, raceType, classType, genderType, emblemBackgroundPath, stats } = character;
    const raceNames = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };

    // Sort Helper
    const sortByKey = (a, b) => (definitions[a.itemHash]?.inventory?.bucketTypeHash || 0) - (definitions[b.itemHash]?.inventory?.bucketTypeHash || 0);

    const STAT_LABELS = {
        [STAT_HASHES.Mobility]: 'Mob',
        [STAT_HASHES.Resilience]: 'Res',
        [STAT_HASHES.Recovery]: 'Rec',
        [STAT_HASHES.Discipline]: 'Dis',
        [STAT_HASHES.Intellect]: 'Int',
        [STAT_HASHES.Strength]: 'Str'
    };

    return (
        <div className="flex-shrink-0 w-[320px] bg-[#141414] border-r border-white/10 flex flex-col h-full overflow-hidden">
            {/* Header / Emblem */}
            <div
                className="relative h-24 bg-cover bg-center flex flex-col justify-end p-4 border-b border-white/10"
                style={{ backgroundImage: `url(https://www.bungie.net${emblemBackgroundPath})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-white shadow-sm leading-none">{classNames[classType]}</h2>
                        <span className="text-sm text-gray-300 font-medium">{raceNames[raceType]}</span>
                    </div>
                    <div className="text-3xl font-bold text-[#e1c564] drop-shadow-md">
                        {light}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-6 gap-1 px-2 py-2 bg-[#0a0a0a] border-b border-white/5">
                {Object.entries(STAT_HASHES).map(([name, hash]) => (
                    <div key={name} className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{name.substring(0, 3)}</span>
                        <span className="text-sm font-bold text-white">{stats[hash] || 0}</span>
                    </div>
                ))}
            </div>

            {/* Inventory Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                {/* Weapons Section */}
                <div className="mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-2 pl-1 sticky top-0 bg-[#141414] z-10 py-1">Weapons</div>
                    <div className="grid grid-cols-5 gap-1">
                        {/* We need to properly group these by slot, but for now just dumping to test layout */}
                        {equipment.filter(i => definitions[i.itemHash]?.itemType === 3).map((item) => (
                            <ItemCard key={item.itemInstanceId} item={item} definition={definitions[item.itemHash]} compact={true} />
                        ))}
                        {inventory.filter(i => definitions[i.itemHash]?.itemType === 3).map((item) => (
                            <ItemCard key={item.itemInstanceId} item={item} definition={definitions[item.itemHash]} compact={true} />
                        ))}
                    </div>
                </div>

                {/* Armor Section */}
                <div className="mb-4">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-2 pl-1 sticky top-0 bg-[#141414] z-10 py-1">Armor</div>
                    <div className="grid grid-cols-5 gap-1">
                        {equipment.filter(i => definitions[i.itemHash]?.itemType === 2).map((item) => (
                            <ItemCard key={item.itemInstanceId} item={item} definition={definitions[item.itemHash]} compact={true} />
                        ))}
                        {inventory.filter(i => definitions[i.itemHash]?.itemType === 2).map((item) => (
                            <ItemCard key={item.itemInstanceId} item={item} definition={definitions[item.itemHash]} compact={true} />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
