import React from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';

export function EventCard() {
    const rawProfile = useInventoryStore(state => state.profile);
    const activeEventCardHash = rawProfile?.profile?.data?.activeEventCardHash;

    const { definitions, loading } = useDefinitions('DestinyEventCardDefinition', activeEventCardHash ? [activeEventCardHash] : []);

    if (!activeEventCardHash) return null;
    if (loading || !definitions) return null;

    const eventCard = definitions[activeEventCardHash];
    if (!eventCard) return null;

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <h2 className="text-xl font-bold text-gray-200 border-b border-gray-800 pb-2 mb-4">
                Active Event
            </h2>

            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6 relative overflow-hidden min-h-[160px] flex items-center">
                {/* Background Image */}
                {eventCard.backgroundImagePath && (
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none mix-blend-screen"
                        style={{ backgroundImage: `url(https://www.bungie.net${eventCard.backgroundImagePath})` }}
                    />
                )}

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 w-full">
                    <div className="w-20 h-20 shrink-0 drop-shadow-lg">
                        <BungieImage src={eventCard.displayProperties?.icon} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-3xl font-rajdhani font-bold text-white mb-2 drop-shadow-md">{eventCard.displayProperties?.name}</h3>
                        <p className="text-gray-300 max-w-2xl">{eventCard.displayProperties?.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
