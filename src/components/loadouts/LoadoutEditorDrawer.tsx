/**
 * LoadoutEditorDrawer — Phase 6b
 *
 * A side-sheet component to edit loadouts in place.
 * Allows renaming and removing items.
 */
import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { ILoadout, ILoadoutItem, useLoadoutStore } from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { createPortal } from 'react-dom';

interface LoadoutEditorDrawerProps {
    loadout: ILoadout | null;
    onClose: () => void;
}

export function LoadoutEditorDrawer({ loadout, onClose }: LoadoutEditorDrawerProps) {
    const { renameLoadout, updateItems } = useLoadoutStore();
    const manifest = useInventoryStore((s) => s.manifest);

    const [name, setName] = useState('');
    const [items, setItems] = useState<ILoadoutItem[]>([]);

    useEffect(() => {
        if (loadout) {
            setName(loadout.name);
            setItems(loadout.items);
        }
    }, [loadout]);

    if (!loadout) return null;

    const handleSave = () => {
        renameLoadout(loadout.id, name);
        updateItems(loadout.id, items);
        onClose();
    };

    const handleRemoveItem = (itemInstanceId: string) => {
        setItems((prev) => prev.filter((i) => i.itemInstanceId !== itemInstanceId));
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="w-[400px] h-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase">Edit Loadout</h2>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Name Edit */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                            Loadout Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-void-surface border border-white/15 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-rajdhani tracking-wide"
                        />
                    </div>

                    {/* Items List */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest flex justify-between">
                            <span>Items ({items.length})</span>
                            <span className="text-[10px] lowercase tracking-normal font-mono text-gray-600">Click &times; to remove</span>
                        </label>
                        <div className="space-y-2">
                            {items.map((item) => {
                                const def = manifest[item.itemHash];
                                const icon = def?.displayProperties?.icon;
                                const itemName = def?.displayProperties?.name || item.label || 'Unknown';

                                return (
                                    <div key={item.itemInstanceId} className="flex items-center justify-between p-2 rounded-sm border border-white/5 bg-white/[0.02] group hover:bg-white/[0.05] transition-colors">
                                        <div className="flex items-center gap-3">
                                            {icon ? (
                                                <img src={`https://www.bungie.net${icon}`} alt="" className="w-8 h-8 rounded-sm object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-sm bg-white/10" />
                                            )}
                                            <span className="text-sm font-bold font-rajdhani truncate max-w-[200px]">{itemName}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.itemInstanceId)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remove from loadout"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                            {items.length === 0 && (
                                <p className="text-xs text-gray-500 font-mono text-center py-4">No items left. This loadout won't equip any gear.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black flex justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-rajdhani flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-gray-200 font-rajdhani flex-1 flex items-center justify-center gap-2"
                    >
                        <Save size={14} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
